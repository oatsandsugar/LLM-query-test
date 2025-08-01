import { ClickHouseDatabase } from './database/clickhouse';
import { PostgreSQLDatabase } from './database/postgresql';
import { DataGenerator, AircraftTrackingRecord } from './data-generator';
import { TestQueries, QueryResult } from './queries';
import { config as appConfig, config } from './index';
import { CheckpointManager, TestCheckpoint } from './checkpoint-manager';

export interface TestConfiguration {
  rowCount: number;
  withIndex: boolean;
  database: 'clickhouse' | 'postgresql';
}

export interface TestResults {
  configuration: TestConfiguration;
  setupTime: number;
  queryResults: QueryResult[];
  totalQueryTime: number;
  totalTime: number;
  iterations?: number;
  timedOut?: boolean;
  completedIterations?: number;
  queryStats?: {
    mean: number[];
    median: number[];
    min: number[];
    max: number[];
    stdDev: number[];
  };
}

export class PerformanceTester {
  private clickhouse: ClickHouseDatabase;
  private postgresql: PostgreSQLDatabase;
  private postgresqlIndexed: PostgreSQLDatabase;
  private dataGenerator: DataGenerator;

  constructor() {
    this.clickhouse = new ClickHouseDatabase();
    this.postgresql = new PostgreSQLDatabase();
    this.postgresqlIndexed = new PostgreSQLDatabase(config.postgresIndexed);
    this.dataGenerator = new DataGenerator();
  }

  async initialize(): Promise<void> {
    console.log('Initializing database connections...');
    
    // Ensure databases exist before connecting
    await this.clickhouse.ensureDatabaseExists();
    await this.postgresql.ensureDatabaseExists();
    await this.postgresqlIndexed.ensureDatabaseExists();
    
    await this.clickhouse.connect();
    await this.postgresql.connect();
    await this.postgresqlIndexed.connect();
    console.log('Database connections established');
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up database connections...');
    await this.clickhouse.disconnect();
    await this.postgresql.disconnect();
    await this.postgresqlIndexed.disconnect();
    console.log('Database connections closed');
  }

  async runTest(config: TestConfiguration): Promise<TestResults> {
    console.log(`\n=== Running test: ${config.database.toUpperCase()} ${config.rowCount.toLocaleString()} rows ${config.withIndex ? '(with index)' : '(no index)'} ===`);
    
    const startTime = process.hrtime.bigint();
    
    // Setup phase
    const setupStartTime = process.hrtime.bigint();
    await this.setupTest(config);
    const setupEndTime = process.hrtime.bigint();
    const setupTime = Number(setupEndTime - setupStartTime) / 1_000_000;

    // Query execution phase
    const queryResults = await this.executeQueries(config);
    const totalQueryTime = queryResults.reduce((sum, result) => sum + result.duration, 0);

    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1_000_000;

    return {
      configuration: config,
      setupTime,
      queryResults,
      totalQueryTime,
      totalTime
    };
  }

  private async setupTest(config: TestConfiguration): Promise<void> {
    const database = config.database === 'clickhouse' ? this.clickhouse : 
                    (config.withIndex ? this.postgresqlIndexed : this.postgresql);
    
    console.log('Dropping existing table...');
    await database.dropTable();
    
    console.log('Creating table...');
    if (config.withIndex) {
      await database.createTableWithIndex();
    } else {
      await database.createTable();
    }
    
    console.log('Generating and inserting test data...');
    
    if (appConfig.test.parallelInsert) {
      await this.dataGenerator.generateAndInsertInBatchesParallel(
        database, 
        config.rowCount, 
        config.database, 
        appConfig.test.batchSize,
        appConfig.test.parallelWorkers
      );
    } else {
      await this.dataGenerator.generateAndInsertInBatches(
        database, 
        config.rowCount, 
        config.database, 
        appConfig.test.batchSize
      );
    }
    
    console.log('Test setup complete');
  }

  // New method for parallel database setup
  private async setupTestParallel(configs: TestConfiguration[]): Promise<void> {
    console.log(`Setting up ${configs.length} database configurations in parallel...`);
    
    // Group configs by rowCount to share data generation
    const configsByRowCount = new Map<number, TestConfiguration[]>();
    for (const config of configs) {
      if (!configsByRowCount.has(config.rowCount)) {
        configsByRowCount.set(config.rowCount, []);
      }
      configsByRowCount.get(config.rowCount)!.push(config);
    }
    
    // Process each row count group
    for (const [rowCount, rowConfigs] of configsByRowCount) {
      console.log(`\n=== Parallel setup for ${rowCount.toLocaleString()} records across ${rowConfigs.length} configurations ===`);
      
      // Only run parallel setup for configurations that can coexist
      // ClickHouse and PostgreSQL can run in parallel, but different PostgreSQL index configurations cannot
      
      // Find ClickHouse and PostgreSQL configs that can run in parallel
      const clickhouseConfigs = rowConfigs.filter(c => c.database === 'clickhouse');
      const postgresConfigs = rowConfigs.filter(c => c.database === 'postgresql');
      
      // We can run sequential multi-database setup when we have at least ClickHouse and PostgreSQL
      if (clickhouseConfigs.length > 0 && postgresConfigs.length > 0) {
        console.log('Running sequential multi-database setup and insertion...');
        
        // Prepare all database configurations for sequential insertion
        const sequentialDatabases: { database: any; databaseType: 'clickhouse' | 'postgresql'; withIndex?: boolean }[] = [];
        
        // Always add ClickHouse first if present
        if (clickhouseConfigs.length > 0) {
          console.log(`Setting up ClickHouse table...`);
          await this.clickhouse.dropTable();
          await this.clickhouse.createTable();
          sequentialDatabases.push({ database: this.clickhouse, databaseType: 'clickhouse' });
        }
        
        // Add PostgreSQL configurations in order: no index first, then with index
        const pgNoIndex = postgresConfigs.find(c => !c.withIndex);
        const pgWithIndex = postgresConfigs.find(c => c.withIndex);
        
        if (pgNoIndex) {
          console.log(`Setting up PostgreSQL table (no index)...`);
          await this.postgresql.dropTable();
          await this.postgresql.createTable();
          sequentialDatabases.push({ database: this.postgresql, databaseType: 'postgresql', withIndex: false });
        }
        
        if (pgWithIndex) {
          console.log(`Setting up PostgreSQL table (with index)...`);
          await this.postgresqlIndexed.dropTable();
          await this.postgresqlIndexed.createTableWithIndex();
          sequentialDatabases.push({ database: this.postgresqlIndexed, databaseType: 'postgresql', withIndex: true });
        }
        
        // Run sequential insertion with comparative progress bars
        if (sequentialDatabases.length > 1) {
          console.log('Multi-database sequential insertion with comparative progress bars...');
          await this.dataGenerator.generateAndInsertInBatchesSequentialMultiDB(
            sequentialDatabases,
            rowCount,
            appConfig.test.batchSize,
            appConfig.test.parallelWorkers
          );
        }
        
      } else {
        // Fall back to sequential setup for simple scenarios
        console.log('Using sequential setup...');
        for (const config of rowConfigs) {
          await this.setupTest(config);
        }
        return; // Skip the parallel data insertion since we already did full setup
      }
    }
  }

  // Run only the query phase (assumes data is already loaded)
  private async runTestQueriesOnly(config: TestConfiguration): Promise<TestResults> {
    console.log(`Running queries for ${config.database.toUpperCase()} ${config.rowCount.toLocaleString()} rows ${config.withIndex ? '(with index)' : '(no index)'}`);
    
    const startTime = process.hrtime.bigint();
    
    // Query execution phase (no setup time since setup was done in parallel)
    const queryResults = await this.executeQueries(config);
    const totalQueryTime = queryResults.reduce((sum, result) => sum + result.duration, 0);

    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1_000_000;

    return {
      configuration: config,
      setupTime: 0, // Setup was done in parallel phase
      queryResults,
      totalQueryTime,
      totalTime
    };
  }

  private async executeQueries(config: TestConfiguration): Promise<QueryResult[]> {
    const database = config.database === 'clickhouse' ? this.clickhouse : 
                    (config.withIndex ? this.postgresqlIndexed : this.postgresql);
    const queries = TestQueries.getQueries();
    const results: QueryResult[] = [];

    for (const [key, queryDef] of Object.entries(queries)) {
      const query = config.database === 'clickhouse' ? queryDef.clickhouse : queryDef.postgresql;
      const result = await TestQueries.executeQuery(database, query, queryDef.name);
      results.push(result);
    }

    return results;
  }

  async runAllTests(): Promise<TestResults[]> {
    const configurations: TestConfiguration[] = [
      { rowCount: appConfig.test.datasetSize, withIndex: false, database: 'clickhouse' },
      { rowCount: appConfig.test.datasetSize, withIndex: true, database: 'postgresql' },
      { rowCount: appConfig.test.datasetSize, withIndex: false, database: 'postgresql' },
    ];

    return this.runTestsWithCheckpoints(configurations, 'load');
  }

  async runQueryOnlyTests(iterations: number = 100, timeLimitMinutes: number = 60): Promise<TestResults[]> {
    const configurations: TestConfiguration[] = [
      { rowCount: appConfig.test.datasetSize, withIndex: false, database: 'clickhouse' },
      { rowCount: appConfig.test.datasetSize, withIndex: true, database: 'postgresql' },
      { rowCount: appConfig.test.datasetSize, withIndex: false, database: 'postgresql' },
    ];

    return this.runTestsWithCheckpoints(configurations, 'query-only', { iterations, timeLimitMinutes });
  }

  private async runTestsWithCheckpoints(
    configurations: TestConfiguration[], 
    testType: 'load' | 'query-only', 
    queryOnlySettings?: { iterations: number; timeLimitMinutes: number }
  ): Promise<TestResults[]> {
    // Check for existing checkpoint
    let checkpoint = CheckpointManager.loadCheckpoint();
    
    if (checkpoint && (checkpoint.testType !== testType || 
        (testType === 'query-only' && 
         (checkpoint.queryOnlySettings?.iterations !== queryOnlySettings?.iterations ||
          checkpoint.queryOnlySettings?.timeLimitMinutes !== queryOnlySettings?.timeLimitMinutes)))) {
      console.log('⚠️  Found checkpoint for different test type/settings, ignoring...');
      CheckpointManager.clearCheckpoint();
      checkpoint = null;
    }

    if (!checkpoint) {
      // Create new checkpoint
      checkpoint = CheckpointManager.createInitialCheckpoint(configurations, testType, queryOnlySettings);
      await CheckpointManager.saveCheckpoint(checkpoint);
    } else {
      // Ask user if they want to resume
      const shouldResume = await CheckpointManager.promptUserForResume(checkpoint);
      if (!shouldResume) {
        checkpoint = CheckpointManager.createInitialCheckpoint(configurations, testType, queryOnlySettings);
        await CheckpointManager.saveCheckpoint(checkpoint);
      }
    }

    // Setup graceful shutdown handler
    const shutdownHandler = async () => {
      await CheckpointManager.handleGracefulShutdown(checkpoint!);
    };
    
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    try {
      if (testType === 'load') {
        // Load tests: Group configurations by rowCount for parallel setup
        const configsByRowCount = new Map<number, TestConfiguration[]>();
        for (const config of checkpoint.pendingConfigurations) {
          if (!configsByRowCount.has(config.rowCount)) {
            configsByRowCount.set(config.rowCount, []);
          }
          configsByRowCount.get(config.rowCount)!.push(config);
        }

        // Process each row count group with parallel setup
        for (const [rowCount, rowConfigs] of configsByRowCount) {
          console.log(`\n=== PARALLEL SETUP: ${rowCount.toLocaleString()} records for ${rowConfigs.length} database configurations ===`);
          
          // Setup all databases for this row count in parallel
          await this.setupTestParallel(rowConfigs);
          
          // Now run individual query tests for each configuration
          for (const config of rowConfigs) {
            console.log(`\n=== Running query phase: ${config.database.toUpperCase()} ${config.rowCount.toLocaleString()} rows ${config.withIndex ? '(with index)' : '(no index)'} ===`);
            
            // Skip setup phase since we already did parallel setup
            const result = await this.runTestQueriesOnly(config);
            
            // Update checkpoint
            checkpoint = CheckpointManager.updateCheckpoint(checkpoint, config, result);
            await CheckpointManager.saveCheckpoint(checkpoint);
            
            // Configuration completed silently
          }
        }
      } else {
        // Query-only tests: Sequential approach with progress bars
        console.log(`\n🔍 Running query-only tests: ${queryOnlySettings!.iterations} iterations per database`);
        console.log(`   Queries: Q1 (metadata), Q2 (sample), Q3 (analytical), Q4 (analytical)`);
        console.log(`   Time limit: ${queryOnlySettings!.timeLimitMinutes} minutes per database\n`);
        
        for (const config of checkpoint.pendingConfigurations) {
          const result = await this.runQueryOnlyTest(config, queryOnlySettings!.iterations, queryOnlySettings!.timeLimitMinutes);
          
          // Update checkpoint
          checkpoint = CheckpointManager.updateCheckpoint(checkpoint, config, result);
          await CheckpointManager.saveCheckpoint(checkpoint);
          
          console.log(); // Add spacing between databases
        }
      }

      // All tests completed successfully
      CheckpointManager.clearCheckpoint();
      console.log('🎉 All tests completed successfully!');
      
      return checkpoint.partialResults;
      
    } catch (error) {
      console.error('Test execution failed:', error);
      await CheckpointManager.saveCheckpoint(checkpoint);
      throw error;
    } finally {
      process.removeListener('SIGINT', shutdownHandler);
      process.removeListener('SIGTERM', shutdownHandler);
    }
  }

  private async runQueryOnlyTest(config: TestConfiguration, iterations: number, timeLimitMinutes: number): Promise<TestResults> {
    const cliProgress = await import('cli-progress');
    
    // Helper function to format time in mm:ss
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${Math.round(seconds)}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Display name for the database
    const displayName = config.database === 'clickhouse' ? 'ClickHouse' : 
                       config.withIndex ? 'PG (w/ Index)' : 'PostgreSQL';
    
    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: `${displayName.padEnd(15)}: [{bar}] {percentage}% | {value}/{total} | {rate} iter/sec | {duration_formatted} | ETA: {eta_formatted}`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: false,
      barsize: 30
    }, cliProgress.Presets.shades_classic);

    progressBar.start(iterations, 0, {
      rate: '0.0',
      duration_formatted: '0:00',
      eta_formatted: 'N/A'
    });
    
    const database = config.database === 'clickhouse' ? this.clickhouse : 
                    (config.withIndex ? this.postgresqlIndexed : this.postgresql);
    const queries = TestQueries.getQueries();
    
    // Store all iteration results for statistical analysis
    const allIterationResults: QueryResult[][] = [];
    const startTime = Date.now();
    const timeLimit = timeLimitMinutes * 60 * 1000;
    let timedOut = false;
    let completedIterations = 0;
    
    for (let iteration = 1; iteration <= iterations; iteration++) {
      if (Date.now() - startTime > timeLimit) {
        timedOut = true;
        break;
      }
      
      const iterationResults: QueryResult[] = [];
      
      for (const [key, queryDef] of Object.entries(queries)) {
        const query = config.database === 'clickhouse' ? queryDef.clickhouse : queryDef.postgresql;
        const result = await TestQueries.executeQuery(database, query, queryDef.name, true);
        iterationResults.push(result);
      }
      
      allIterationResults.push(iterationResults);
      completedIterations = iteration;
      
      // Update progress bar
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = iteration / elapsed;
      const remaining = (iterations - iteration) / rate;
      
      progressBar.update(iteration, {
        rate: rate.toFixed(1),
        duration_formatted: formatTime(elapsed),
        eta_formatted: isFinite(remaining) ? formatTime(remaining) : 'N/A'
      });
    }

    // Final update and stop
    const totalElapsed = (Date.now() - startTime) / 1000;
    const finalRate = completedIterations / totalElapsed;
    
    progressBar.update(completedIterations, {
      rate: finalRate.toFixed(1),
      duration_formatted: formatTime(totalElapsed),
      eta_formatted: timedOut ? 'TIMEOUT' : '0:00'
    });
    
    progressBar.stop();

    if (timedOut) {
      console.log(`⚠️  ${displayName} timed out after ${completedIterations}/${iterations} iterations`);
    } else {
      console.log(`✅ ${displayName} completed all ${iterations} iterations in ${formatTime(totalElapsed)}`);
    }

    const queryStats = this.calculateQueryStatistics(allIterationResults);
    
    const representativeResults: QueryResult[] = Object.values(queries).map((queryDef, index) => ({
      name: queryDef.name,
      duration: queryStats.median[index],
      rows: allIterationResults[0][index].rows,
      data: undefined
    }));
    
    return {
      configuration: config,
      setupTime: 0,
      queryResults: representativeResults,
      totalQueryTime: queryStats.median.reduce((sum, duration) => sum + duration, 0),
      totalTime: queryStats.median.reduce((sum, duration) => sum + duration, 0),
      iterations,
      timedOut,
      completedIterations,
      queryStats
    };
  }

  private calculateQueryStatistics(allIterationResults: QueryResult[][]): {
    mean: number[];
    median: number[];
    min: number[];
    max: number[];
    stdDev: number[];
  } {
    const numQueries = allIterationResults[0].length;
    const stats = {
      mean: new Array(numQueries).fill(0),
      median: new Array(numQueries).fill(0),
      min: new Array(numQueries).fill(Infinity),
      max: new Array(numQueries).fill(0),
      stdDev: new Array(numQueries).fill(0)
    };

    // Collect all durations for each query
    const queryDurations: number[][] = Array(numQueries).fill(null).map(() => []);
    
    for (const iterationResults of allIterationResults) {
      for (let queryIndex = 0; queryIndex < numQueries; queryIndex++) {
        const duration = iterationResults[queryIndex].duration;
        queryDurations[queryIndex].push(duration);
        
        stats.min[queryIndex] = Math.min(stats.min[queryIndex], duration);
        stats.max[queryIndex] = Math.max(stats.max[queryIndex], duration);
      }
    }

    // Calculate mean, median, and standard deviation for each query
    for (let queryIndex = 0; queryIndex < numQueries; queryIndex++) {
      const durations = queryDurations[queryIndex];
      
      // Mean
      stats.mean[queryIndex] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      // Median
      const sorted = [...durations].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.median[queryIndex] = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
      
      // Standard deviation
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - stats.mean[queryIndex], 2), 0) / durations.length;
      stats.stdDev[queryIndex] = Math.sqrt(variance);
    }

    return stats;
  }

  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }
}