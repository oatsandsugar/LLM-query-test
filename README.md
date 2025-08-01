# LLM Query Performance Testing

Tests LLM-style query patterns against transactional (PostgreSQL) and OLAP (ClickHouse) databases with equivalent setups to compare performance characteristics.

## Benchmark Results

### Test Environment
- **Machine**: Apple M3 Pro, 18GB RAM
- **Docker Containers**: 
  - ClickHouse server (port 8123)
  - PostgreSQL 15 without indexes (port 5432)
  - PostgreSQL 15 with indexes (port 5433)
- **Resource Allocation**: Each container limited to 4GB RAM and 2 CPUs for fair comparison
- **Dataset**: 10M aircraft tracking records (46 columns each)

### Results

*Last updated: 8/1/2025, 12:12:55 PM*

#### Available Results

- ✅ **Load Test**: Initial performance comparison with data generation
- ✅ **Query Test**: Statistical analysis with multiple iterations

#### Load Test Results

*Source: test-results_2025-08-01_05-58-55.json*

**10K Dataset:**

- **Fastest Overall**: PostgreSQL (no-idx) (9.3ms total)
- **ClickHouse (no-idx)**: 20.2ms queries + 0.0s setup
- **PostgreSQL (idx)**: 9.4ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 9.3ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_05-58-58.json*

**10K Dataset** (100 iterations each):

- **Fastest (median)**: PostgreSQL (idx) (5.5ms total)
- **ClickHouse (no-idx)**: 9.3ms ±0.6ms
- **PostgreSQL (idx)**: 5.5ms ±0.2ms
- **PostgreSQL (no-idx)**: 7.1ms ±1.0ms


#### Load Test Results

*Source: test-results_2025-08-01_05-59-21.json*

**50K Dataset:**

- **Fastest Overall**: ClickHouse (no-idx) (17.8ms total)
- **ClickHouse (no-idx)**: 17.8ms queries + 0.0s setup
- **PostgreSQL (idx)**: 28.3ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 32.1ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_05-59-28.json*

**50K Dataset** (100 iterations each):

- **Fastest (median)**: ClickHouse (no-idx) (9.8ms total)
- **ClickHouse (no-idx)**: 9.8ms ±0.8ms
- **PostgreSQL (idx)**: 20.9ms ±0.8ms
- **PostgreSQL (no-idx)**: 29.4ms ±0.9ms


#### Load Test Results

*Source: test-results_2025-08-01_05-59-51.json*

**100K Dataset:**

- **Fastest Overall**: ClickHouse (no-idx) (21.9ms total)
- **ClickHouse (no-idx)**: 21.9ms queries + 0.0s setup
- **PostgreSQL (idx)**: 55.4ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 68.4ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_06-00-04.json*

**100K Dataset** (100 iterations each):

- **Fastest (median)**: ClickHouse (no-idx) (13.1ms total)
- **ClickHouse (no-idx)**: 13.1ms ±0.6ms
- **PostgreSQL (idx)**: 43.8ms ±0.8ms
- **PostgreSQL (no-idx)**: 57.0ms ±0.9ms


#### Load Test Results

*Source: test-results_2025-08-01_06-00-44.json*

**500K Dataset:**

- **Fastest Overall**: ClickHouse (no-idx) (49.4ms total)
- **ClickHouse (no-idx)**: 49.4ms queries + 0.0s setup
- **PostgreSQL (idx)**: 269.8ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 238.6ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_06-01-16.json*

**500K Dataset** (100 iterations each):

- **Fastest (median)**: ClickHouse (no-idx) (15.9ms total)
- **ClickHouse (no-idx)**: 15.9ms ±0.5ms
- **PostgreSQL (idx)**: 116.1ms ±6.9ms
- **PostgreSQL (no-idx)**: 178.3ms ±1.4ms


#### Load Test Results

*Source: test-results_2025-08-01_06-02-21.json*

**1M Dataset:**

- **Fastest Overall**: ClickHouse (no-idx) (44.8ms total)
- **ClickHouse (no-idx)**: 44.8ms queries + 0.0s setup
- **PostgreSQL (idx)**: 763.6ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 415.5ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_06-03-47.json*

**1M Dataset** (100 iterations each):

- **Fastest (median)**: ClickHouse (no-idx) (20.7ms total)
- **ClickHouse (no-idx)**: 20.7ms ±1.6ms
- **PostgreSQL (idx)**: 452.3ms ±23.3ms
- **PostgreSQL (no-idx)**: 346.2ms ±20.9ms


#### Load Test Results

*Source: test-results_2025-08-01_06-08-50.json*

**5M Dataset:**

- **Fastest Overall**: ClickHouse (no-idx) (62.0ms total)
- **ClickHouse (no-idx)**: 62.0ms queries + 0.0s setup
- **PostgreSQL (idx)**: 1594.7ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 3647.6ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_06-13-52.json*

**5M Dataset** (100 iterations each):

- **Fastest (median)**: ClickHouse (no-idx) (31.1ms total)
- **ClickHouse (no-idx)**: 31.1ms ±1.2ms
- **PostgreSQL (idx)**: 1081.8ms ±52.9ms
- **PostgreSQL (no-idx)**: 1763.7ms ±36.5ms


#### Load Test Results

*Source: test-results_2025-08-01_06-25-43.json*

**10M Dataset:**

- **Fastest Overall**: ClickHouse (no-idx) (192.6ms total)
- **ClickHouse (no-idx)**: 192.6ms queries + 0.0s setup
- **PostgreSQL (idx)**: 6431.7ms queries + 0.0s setup
- **PostgreSQL (no-idx)**: 6422.6ms queries + 0.0s setup


#### Query Test Results (Statistical)

*Source: test-results_2025-08-01_06-36-06.json*

**10M Dataset** (100 iterations each):

- **Fastest (median)**: ClickHouse (no-idx) (41.4ms total)
- **ClickHouse (no-idx)**: 41.4ms ±1.9ms
- **PostgreSQL (idx)**: 2183.2ms ±130.8ms
- **PostgreSQL (no-idx)**: 3518.1ms ±144.1ms


#### View Detailed Results

```bash
npm run graphs  # Interactive terminal graphs
```

**Result Files**: Check `output/` directory for detailed JSON and CSV results.


## Setup

### Prerequisites (Database setup)

**Quick Start - Docker Containers**
```bash
# Start all databases with configurable resource allocation
npm run start-dbs

# This creates (using .env configuration):
# - ClickHouse on port 8123 (configurable memory/CPU)
# - PostgreSQL (no indexes) on port 5432 (configurable memory/CPU)  
# - PostgreSQL (with indexes) on port 5433 (configurable memory/CPU)
```

**Manual Setup**

*ClickHouse Server*
```bash
# Docker (adjust memory/CPU as needed)
docker run -d --name clickhouse-server --memory=4g --cpus=2 --ulimit nofile=262144:262144 -p 8123:8123 -p 9000:9000 -e CLICKHOUSE_PASSWORD=password clickhouse/clickhouse-server

# Or install locally
curl https://clickhouse.com/ | sh
./clickhouse server
```

*PostgreSQL Servers (Two Instances)*
```bash
# PostgreSQL without indexes (port 5432)
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 --memory=4g --cpus=2 postgres:15

# PostgreSQL with indexes (port 5433)  
docker run -d --name postgres-indexed -e POSTGRES_PASSWORD=postgres -p 5433:5432 --memory=4g --cpus=2 postgres:15

# Or install locally and run two instances
brew install postgresql && brew services start postgresql
# Configure second instance on port 5433
```

### Installation

```bash
npm install
cp .env.example .env  # Edit database connections
npm run build
```

## Usage

```bash
npm start                                          # Run full test (with data generation)
npm run dev                                        # Development mode
npm run query-test                                 # Query-only test (100 iterations, 1hr time limit)
npm run query-test -- --time-limit=120             # Query-only test (2hr time limit)
npm run query-test -- --iterations=50              # Query-only test (50 iterations)
npm run query-test -- --iterations=200 --time-limit=30  # 200 iterations with 30min time limit
npm run bulk-test                                  # Run comprehensive bulk testing across multiple dataset sizes
npm run graphs                                     # Generate ASCII performance graphs from output files
npm run graphs -- --update-readme                  # Generate graphs AND update README results section
npm run latency-sim                                # Interactive latency simulator using pre-recorded test data
npm run clean                                      # Clear databases and result files (fresh start)
npm run clean:db                                   # Clear database tables only
npm run clean:output                               # Clear result files only
npm run start-dbs                                  # Start all database containers with resource limits
npm run kill-dbs                                   # Remove all database containers
npm run help                                       # Show detailed command reference
```

**Help Options:**
```bash
npm start --help                    # Show help for main test command
npm run query-test -- --help        # Show help for query-only tests
```

## Configuration

Edit `.env` file to configure:

### Database Connections
- **ClickHouse**: `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_PASSWORD`
- **PostgreSQL (no index)**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_PASSWORD`
- **PostgreSQL (with index)**: `POSTGRES_INDEXED_HOST`, `POSTGRES_INDEXED_PORT`, `POSTGRES_INDEXED_PASSWORD`

### Container Resources
Control Docker container resource allocation for fair testing:
- **Memory limits**: `CLICKHOUSE_MEMORY=4g`, `POSTGRES_MEMORY=4g`, `POSTGRES_INDEXED_MEMORY=4g`
- **CPU limits**: `CLICKHOUSE_CPUS=2`, `POSTGRES_CPUS=2`, `POSTGRES_INDEXED_CPUS=2`
- **Examples**: Use `1g` for lightweight testing, `8g` for high-performance scenarios

### Performance Testing
- **Dataset size**: `DATASET_SIZE=10000000` (default 10M rows)
- **Batch size**: `BATCH_SIZE=50000` for data insertion
- **Parallel insertion**: `PARALLEL_INSERT=true` for 2-4x faster data loading
- **Worker count**: `PARALLEL_WORKERS=4` (adjust based on CPU cores)
- **Bulk testing**: `BULK_TEST_SIZES=10K,50K,100K,500K,1M,5M,10M,25M`

### Advanced Features

**⏱️ Time Limits**: Query-only tests include automatic timeout protection:
- Default: 60 minutes per test configuration
- Each database/index combination gets its own time limit
- Partial results are saved if tests timeout
- Use `--time-limit=X` to customize (X = minutes)

**🔄 Auto-Resume**: Tests automatically resume from checkpoints if interrupted:
- Safe to use Ctrl+C to interrupt long-running tests
- Progress is saved after each configuration completes
- Automatically resumes from last checkpoint on restart
- Use `npm run clean:output` to clear checkpoints and start fresh

**💾 Memory Monitoring**: Built-in memory usage protection:
- Pre-test memory checks before large operations
- Real-time monitoring during data generation
- Automatic warnings at 85% memory usage
- Critical alerts at 95% memory usage with suggestions

**🎯 Latency Simulator**: Interactive demonstration of real-world performance impact:
- **⚠️ Uses pre-recorded data**: No live queries - all delays based on statistical analysis from bulk tests (where 100 sets of these queries were run)
- Choose dataset size and database configuration from actual test results  
- Experience realistic chat conversation delays with natural variance
- Individual query timing (Q1-Q4) with proper standard deviations from real measurements

## Output

Results in console, `output/test-results.json`, and `output/test-results.csv`.

### ASCII Performance Graphs

Generate visual performance comparisons from saved results:

```bash
npm run graphs                    # Terminal display only
npm run graphs -- --update-readme # Update README + terminal display
```

**Prerequisites**: Run tests first to generate result files:
```bash
npm start          # Generate load test results
npm run query-test # Generate query-only test results
npm run graphs     # Then visualize both test results
```

### Cleanup Commands

Reset your testing environment:

```bash
npm run clean        # Complete cleanup (databases + result files)
npm run clean:db     # Clear database tables only (keep results)
npm run clean:output # Clear result files only (keep data)
```

## Test Data & Queries

**Data**: 46-column ADS-B aircraft tracking records with realistic telemetry (altitude, speed, position, transponder codes, etc.)

**Query Pattern**: Simulates LLM answering "How many aircraft are in the air on average every minute for the past hour?"
1. `SHOW TABLES` - Discovery
2. `SELECT * LIMIT 10` - Schema exploration  
3. Hourly aircraft counts with time bucketing
4. CTE-based average calculation

## Database Design Differences

### NULL Handling Strategy

The benchmark intentionally preserves realistic database design differences between ClickHouse and PostgreSQL:

**ClickHouse (OLAP Best Practice):**
```sql
aircraft_type LowCardinality(String) DEFAULT '',
geom_rate Int16 DEFAULT 0,
nav_qnh UInt16 DEFAULT 0,
nav_altitude_mcp UInt16 DEFAULT 0,
nav_heading UInt16 DEFAULT 0
```

**PostgreSQL (OLTP Flexibility):**
```sql
aircraft_type VARCHAR(50) DEFAULT '',
geom_rate INTEGER,           -- Allows NULL
nav_qnh DOUBLE PRECISION,    -- Allows NULL  
nav_altitude_mcp INTEGER,    -- Allows NULL
nav_heading DOUBLE PRECISION -- Allows NULL
```

**Impact on Data:**
- **ClickHouse**: NULL values from data generator are converted to defaults (e.g., 0, '') 
- **PostgreSQL**: NULL values are preserved as actual NULLs
- **Result**: ~20% of records have NULLs in PostgreSQL vs 0% in ClickHouse for nullable fields

**Why This Is Intentional:**
- ClickHouse's DEFAULT strategy is optimal for analytical queries (avoids NULL handling overhead)
- PostgreSQL's NULL preservation is standard for transactional systems (data integrity)
- Represents real-world database design patterns, not a benchmarking flaw
- Performance comparisons remain valid as both databases handle their respective data optimally

## Troubleshooting

1. **Database connection issues** - Check that both ClickHouse and PostgreSQL are running and accessible
2. **ClickHouse authentication** - Ensure CLICKHOUSE_PASSWORD is set correctly
3. **Data type errors** - ClickHouse requires exact data types (use provided schema)
4. **Memory issues** - Streaming generation handles large datasets, but ensure 4GB+ RAM
5. **Long insertion times** - Large datasets take significant time, monitor progress with ETA
6. **Permission errors** - Ensure database users have CREATE/DROP/INSERT permissions

