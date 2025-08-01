import dotenv from 'dotenv';
import { PerformanceTester } from './performance-tester';
import { ResultsReporter } from './reporter';
import { ConfigValidator } from './config-validator';

dotenv.config();

// Validate and configure environment variables
const validator = new ConfigValidator();

// Configuration with validation
export const config = {
  clickhouse: {
    host: validator.validateString('CLICKHOUSE_HOST', 'localhost'),
    port: validator.validatePort('CLICKHOUSE_PORT', 8123),
    database: validator.validateString('CLICKHOUSE_DATABASE', 'performance_test'),
    username: validator.validateString('CLICKHOUSE_USERNAME', 'default'),
    password: validator.validateString('CLICKHOUSE_PASSWORD', ''),
    memory: validator.validateMemory('CLICKHOUSE_MEMORY', '4g'),
    cpus: validator.validateCpus('CLICKHOUSE_CPUS', '2'),
  },
  postgres: {
    host: validator.validateString('POSTGRES_HOST', 'localhost'),
    port: validator.validatePort('POSTGRES_PORT', 5432),
    database: validator.validateString('POSTGRES_DATABASE', 'performance_test'),
    username: validator.validateString('POSTGRES_USERNAME', 'postgres'),
    password: validator.validateString('POSTGRES_PASSWORD', 'postgres'),
    memory: validator.validateMemory('POSTGRES_MEMORY', '4g'),
    cpus: validator.validateCpus('POSTGRES_CPUS', '2'),
  },
  postgresIndexed: {
    host: validator.validateString('POSTGRES_INDEXED_HOST', 'localhost'),
    port: validator.validatePort('POSTGRES_INDEXED_PORT', 5433),
    database: validator.validateString('POSTGRES_INDEXED_DATABASE', 'performance_test'),
    username: validator.validateString('POSTGRES_INDEXED_USERNAME', 'postgres'),
    password: validator.validateString('POSTGRES_INDEXED_PASSWORD', 'postgres'),
    memory: validator.validateMemory('POSTGRES_INDEXED_MEMORY', '4g'),
    cpus: validator.validateCpus('POSTGRES_INDEXED_CPUS', '2'),
  },
  test: {
    datasetSize: validator.validateInteger('DATASET_SIZE', 10000000, 1000, 100000000, 'Dataset size (1000-100M records)'),
    batchSize: validator.validateInteger('BATCH_SIZE', 50000, 1000, 1000000, 'Batch size (1K-1M records)'),
    parallelInsert: validator.validateString('PARALLEL_INSERT', 'false', ['true', 'false']) === 'true',
    parallelWorkers: validator.validateInteger('PARALLEL_WORKERS', 4, 1, 16, 'Worker threads (1-16)'),
  },
};

// Validate port conflicts
validator.validatePortConflicts({
  'CLICKHOUSE_PORT': config.clickhouse.port,
  'POSTGRES_PORT': config.postgres.port,
  'POSTGRES_INDEXED_PORT': config.postgresIndexed.port,
});

// Throw error if validation failed
validator.throwIfInvalid();

// Help command (merged from help.ts)
function showHelp(): void {
  console.log('📋 Available Commands:');
  console.log();
  console.log('npm start                    Run full performance test with data generation');
  console.log('npm run query-test           Run 100-iteration statistical test (--iterations=N --time-limit=N)');
  console.log('npm run bulk-test            Run comprehensive bulk testing across multiple dataset sizes');
  console.log('npm run graphs               Generate ASCII performance graphs from results (--update-readme)');
  console.log('npm run latency-sim          Interactive latency simulator using pre-recorded test data');
  console.log('npm run start-dbs            Start all database containers (ClickHouse + 2x PostgreSQL)');
  console.log('npm run clean                Clear databases and result files');
  console.log('npm run clean:db             Clear database tables only');
  console.log('npm run clean:output         Clear result files only');
  console.log('npm run kill-dbs             Remove all database containers');
  console.log('npm run help                 Show this help');
  console.log();
  console.log('Database Setup:');
  console.log('  • ClickHouse on port 8123');
  console.log('  • PostgreSQL (no indexes) on port 5432');
  console.log('  • PostgreSQL (with indexes) on port 5433');
  console.log();
  console.log('Workflow: npm run clean → npm start → npm run query-test → npm run graphs');
  console.log();
  console.log('🔄 Tests auto-resume from checkpoints if interrupted (Ctrl+C safe)');
}

interface CommandLineArgs {
  queryOnly: boolean;
  iterations: number;
  timeLimitMinutes: number;
}

function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  
  // Handle help flags
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const queryOnly = args.includes('--query-only');
  const iterationsArg = args.find(arg => arg.startsWith('--iterations='));
  const timeLimitArg = args.find(arg => arg.startsWith('--time-limit='));
  
  const iterations = iterationsArg ? parseInt(iterationsArg.split('=')[1]) : (queryOnly ? 100 : 1);
  const timeLimitMinutes = timeLimitArg ? parseInt(timeLimitArg.split('=')[1]) : 60;
  
  return { queryOnly, iterations, timeLimitMinutes };
}

async function main() {
  const tester = new PerformanceTester();
  const { queryOnly, iterations, timeLimitMinutes } = parseArgs();
  
  try {
    console.log('Starting Database Performance Testing Application');
    console.log('===============================================');
    
    if (queryOnly) {
      console.log(`Running query-only tests with ${iterations} iterations per configuration (${timeLimitMinutes}min time limit)`);
    }
    
    await tester.initialize();
    
    const results = queryOnly 
      ? await tester.runQueryOnlyTests(iterations, timeLimitMinutes)
      : await tester.runAllTests();
    
    ResultsReporter.printResults(results);
    
    // Save with timestamped filenames (will auto-generate if not specified)
    ResultsReporter.saveToFile(results);
    ResultsReporter.saveCSV(results);
    
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}