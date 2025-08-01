#!/usr/bin/env node
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { ConfigValidator } from './config-validator';

dotenv.config();

// Validate environment variables early
const validator = new ConfigValidator();

// Validate Docker resource formats
const clickhouseMemory = validator.validateMemory('CLICKHOUSE_MEMORY', '4g');
const clickhouseCpus = validator.validateCpus('CLICKHOUSE_CPUS', '2');
const postgresMemory = validator.validateMemory('POSTGRES_MEMORY', '4g');
const postgresCpus = validator.validateCpus('POSTGRES_CPUS', '2');
const postgresIndexedMemory = validator.validateMemory('POSTGRES_INDEXED_MEMORY', '4g');
const postgresIndexedCpus = validator.validateCpus('POSTGRES_INDEXED_CPUS', '2');

// Validate ports
const postgresPort = validator.validatePort('POSTGRES_PORT', 5432);
const postgresIndexedPort = validator.validatePort('POSTGRES_INDEXED_PORT', 5433);

// Check for port conflicts
validator.validatePortConflicts({
  'POSTGRES_PORT': postgresPort,
  'POSTGRES_INDEXED_PORT': postgresIndexedPort,
});

// Throw error if validation failed
validator.throwIfInvalid();

interface ContainerConfig {
  name: string;
  image: string;
  ports: string[];
  environment: string[];
  additionalFlags: string[];
}

class DatabaseStarter {
  private getContainerConfigs(): ContainerConfig[] {
    return [
      {
        name: 'clickhouse-server',
        image: 'clickhouse/clickhouse-server',
        ports: ['8123:8123', '9000:9000'],
        environment: [
          `CLICKHOUSE_PASSWORD=${process.env.CLICKHOUSE_PASSWORD || 'password'}`
        ],
        additionalFlags: [
          '--ulimit', 'nofile=262144:262144',
          '--memory', clickhouseMemory,
          '--cpus', clickhouseCpus
        ]
      },
      {
        name: 'postgres',
        image: 'postgres:15',
        ports: [`${postgresPort}:5432`],
        environment: [
          `POSTGRES_PASSWORD=${process.env.POSTGRES_PASSWORD || 'postgres'}`
        ],
        additionalFlags: [
          '--memory', postgresMemory,
          '--cpus', postgresCpus
        ]
      },
      {
        name: 'postgres-indexed',
        image: 'postgres:15',
        ports: [`${postgresIndexedPort}:5432`],
        environment: [
          `POSTGRES_PASSWORD=${process.env.POSTGRES_INDEXED_PASSWORD || 'postgres'}`
        ],
        additionalFlags: [
          '--memory', postgresIndexedMemory,
          '--cpus', postgresIndexedCpus
        ]
      }
    ];
  }

  private buildDockerCommand(config: ContainerConfig): string {
    const parts = [
      'docker run -d',
      `--name ${config.name}`,
      ...config.additionalFlags
    ];

    // Add port mappings
    config.ports.forEach(port => {
      parts.push(`-p ${port}`);
    });

    // Add environment variables
    config.environment.forEach(env => {
      parts.push(`-e ${env}`);
    });

    // Add image
    parts.push(config.image);

    return parts.join(' ');
  }

  private async executeCommand(command: string, description: string): Promise<void> {
    try {
      console.log(`🔧 ${description}...`);
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ ${description} completed`);
    } catch (error) {
      console.error(`❌ ${description} failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Database Containers');
    console.log('================================\n');

    // Show resource configuration
    console.log('📊 Resource Configuration:');
    console.log(`   ClickHouse: ${clickhouseMemory} RAM, ${clickhouseCpus} CPUs`);
    console.log(`   PostgreSQL: ${postgresMemory} RAM, ${postgresCpus} CPUs`);
    console.log(`   PostgreSQL (indexed): ${postgresIndexedMemory} RAM, ${postgresIndexedCpus} CPUs\n`);

    const configs = this.getContainerConfigs();

    try {
      // Stop and remove existing containers
      await this.executeCommand(
        'docker rm -f clickhouse-server postgres postgres-indexed 2>/dev/null || true',
        'Cleaning up existing containers'
      );

      // Start each container
      for (const config of configs) {
        const command = this.buildDockerCommand(config);
        console.log(`\n🐳 Starting ${config.name}:`);
        console.log(`   Command: ${command}`);
        
        await this.executeCommand(command, `Starting ${config.name}`);
      }

      console.log('\n🎉 All database containers started successfully!');
      console.log('\n📋 Container Status:');
      console.log('   • ClickHouse: http://localhost:8123');
      console.log(`   • PostgreSQL (no index): localhost:${postgresPort}`);
      console.log(`   • PostgreSQL (with index): localhost:${postgresIndexedPort}`);
      
      console.log('\n⏳ Waiting 10 seconds for containers to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('✅ Ready to run tests!');

    } catch (error) {
      console.error('\n💥 Failed to start database containers');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const starter = new DatabaseStarter();
  await starter.start();
}

if (require.main === module) {
  main().catch(console.error);
}