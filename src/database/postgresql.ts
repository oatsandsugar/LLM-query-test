import { Pool, Client } from 'pg';
import { config } from '../index';

export class PostgreSQLDatabase {
  private pool: Pool;
  private dbConfig: any;

  constructor(configOverride?: any) {
    this.dbConfig = configOverride || config.postgres;
    this.pool = new Pool({
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      database: this.dbConfig.database,
      user: this.dbConfig.username,
      password: this.dbConfig.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect(): Promise<void> {
    // Simple connection test
    const client = await this.pool.connect();
    await client.query('SELECT NOW()');
    client.release();
  }

  async ensureDatabaseExists(): Promise<void> {
    const defaultClient = new Client({
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      database: 'postgres',
      user: this.dbConfig.username,
      password: this.dbConfig.password,
    });

    try {
      await defaultClient.connect();
      
      // Check if database exists
      const result = await defaultClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.dbConfig.database]
      );
      
      if (result.rows.length === 0) {
        // Database doesn't exist, create it
        await defaultClient.query(`CREATE DATABASE ${this.dbConfig.database}`);
        console.log(`Created PostgreSQL database: ${this.dbConfig.database}`);
      }
    } catch (error) {
      console.log(`PostgreSQL database creation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await defaultClient.end();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async query(sql: string): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createTable(): Promise<void> {
    await this.query(`
      CREATE TABLE IF NOT EXISTS performance_test (
        zordercoordinate BIGINT,
        approach BOOLEAN,
        autopilot BOOLEAN,
        althold BOOLEAN,
        lnav BOOLEAN,
        tcas BOOLEAN,
        hex CHAR(6),
        transponder_type VARCHAR(50),
        flight VARCHAR(50),
        r VARCHAR(10),
        aircraft_type VARCHAR(50) DEFAULT '',
        dbflags INTEGER,
        lat DOUBLE PRECISION,
        lon DOUBLE PRECISION,
        alt_baro INTEGER,
        alt_baro_is_ground BOOLEAN,
        alt_geom INTEGER,
        gs DOUBLE PRECISION,
        track DOUBLE PRECISION,
        baro_rate INTEGER,
        geom_rate INTEGER,
        squawk CHAR(4),
        emergency VARCHAR(50),
        category VARCHAR(10),
        nav_qnh DOUBLE PRECISION,
        nav_altitude_mcp INTEGER,
        nav_heading DOUBLE PRECISION,
        nav_modes TEXT[],
        nic INTEGER,
        rc INTEGER,
        seen_pos DOUBLE PRECISION,
        version INTEGER,
        nic_baro INTEGER,
        nac_p INTEGER,
        nac_v INTEGER,
        sil INTEGER,
        sil_type VARCHAR(50),
        gva INTEGER,
        sda INTEGER,
        mlat TEXT[],
        tisb TEXT[],
        messages INTEGER,
        seen DOUBLE PRECISION,
        alert INTEGER,
        spi INTEGER,
        rssi DOUBLE PRECISION,
        timestamp TIMESTAMP
      )
    `);
  }

  async createTableWithIndex(): Promise<void> {
    await this.createTable();
    
    // Add performance indexes optimized for the analytical queries
    try {
      // Primary analytical query index (timestamp + boolean filter)
      await this.query('CREATE INDEX IF NOT EXISTS idx_performance_test_timestamp_ground ON performance_test(timestamp, alt_baro_is_ground)');
      // Alternative index order for different query patterns
      await this.query('CREATE INDEX IF NOT EXISTS idx_performance_test_ground_timestamp ON performance_test(alt_baro_is_ground, timestamp)');
      // Index for hex-based queries (DISTINCT hex)
      await this.query('CREATE INDEX IF NOT EXISTS idx_performance_test_hex ON performance_test(hex)');
      // Composite index for hex + timestamp (for DISTINCT hex in time ranges)
      await this.query('CREATE INDEX IF NOT EXISTS idx_performance_test_hex_timestamp ON performance_test(hex, timestamp)');
      // Basic timestamp index as fallback
      await this.query('CREATE INDEX IF NOT EXISTS idx_performance_test_timestamp ON performance_test(timestamp)');
    } catch (error) {
      console.log(`Index creation warning: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async dropTable(): Promise<void> {
    await this.query('DROP TABLE IF EXISTS performance_test');
  }

  private mapFieldNamesToPostgreSQL(fieldName: string): string {
    // Map camelCase field names to PostgreSQL lowercase conventions
    const fieldMapping: { [key: string]: string } = {
      'zorderCoordinate': 'zordercoordinate',
      'dbFlags': 'dbflags'
    };
    return fieldMapping[fieldName] || fieldName;
  }

  async insertBatch(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const client = await this.pool.connect();
    try {
      const originalColumns = Object.keys(records[0]);
      const mappedColumns = originalColumns.map(col => this.mapFieldNamesToPostgreSQL(col));
      const maxParamsPerQuery = 60000; // PostgreSQL limit is ~65,535
      const maxRecordsPerQuery = Math.floor(maxParamsPerQuery / originalColumns.length);
      
      // Split large batches to avoid PostgreSQL parameter limit
      for (let i = 0; i < records.length; i += maxRecordsPerQuery) {
        const chunk = records.slice(i, i + maxRecordsPerQuery);
        
        const placeholders = chunk.map((_, recordIndex) => 
          `(${mappedColumns.map((_, colIndex) => `$${recordIndex * mappedColumns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');
        
        const values = chunk.flatMap(record => originalColumns.map(col => record[col]));
        
        const query = `INSERT INTO performance_test (${mappedColumns.join(', ')}) VALUES ${placeholders}`;
        await client.query(query, values);
      }
    } finally {
      client.release();
    }
  }
}