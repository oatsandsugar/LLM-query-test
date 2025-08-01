export interface ValidationError {
  variable: string;
  value: string | undefined;
  message: string;
}

export class ConfigValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate and parse integer with bounds checking
   */
  validateInteger(
    envVar: string,
    defaultValue: number,
    min?: number,
    max?: number,
    description?: string
  ): number {
    const envValue = process.env[envVar];
    const value = parseInt(envValue || defaultValue.toString());

    if (envValue && isNaN(value)) {
      this.errors.push({
        variable: envVar,
        value: envValue,
        message: `Invalid integer value. ${description ? `Expected: ${description}` : ''}`
      });
      return defaultValue;
    }

    if (min !== undefined && value < min) {
      this.errors.push({
        variable: envVar,
        value: envValue || defaultValue.toString(),
        message: `Value ${value} is below minimum ${min}. ${description ? `Expected: ${description}` : ''}`
      });
      return defaultValue;
    }

    if (max !== undefined && value > max) {
      this.errors.push({
        variable: envVar,
        value: envValue || defaultValue.toString(),
        message: `Value ${value} is above maximum ${max}. ${description ? `Expected: ${description}` : ''}`
      });
      return defaultValue;
    }

    return value;
  }

  /**
   * Validate port number (1-65535)
   */
  validatePort(envVar: string, defaultValue: number): number {
    return this.validateInteger(
      envVar,
      defaultValue,
      1,
      65535,
      'Valid port number (1-65535)'
    );
  }

  /**
   * Validate Docker memory format (e.g., "4g", "512m", "1024")
   */
  validateMemory(envVar: string, defaultValue: string): string {
    const envValue = process.env[envVar] || defaultValue;
    const memoryRegex = /^(\d+)([gmk]?)$/i;

    if (!memoryRegex.test(envValue)) {
      this.errors.push({
        variable: envVar,
        value: envValue,
        message: 'Invalid memory format. Expected: number followed by optional g/m/k (e.g., "4g", "512m", "1024")'
      });
      return defaultValue;
    }

    return envValue;
  }

  /**
   * Validate CPU count (positive number, reasonable bounds)
   */
  validateCpus(envVar: string, defaultValue: string): string {
    const envValue = process.env[envVar] || defaultValue;
    const cpuValue = parseFloat(envValue);

    if (isNaN(cpuValue) || cpuValue <= 0) {
      this.errors.push({
        variable: envVar,
        value: envValue,
        message: 'Invalid CPU count. Expected: positive number (e.g., "2", "1.5", "0.5")'
      });
      return defaultValue;
    }

    if (cpuValue > 32) {
      this.errors.push({
        variable: envVar,
        value: envValue,
        message: 'CPU count seems unreasonably high. Expected: reasonable number (0.1-32)'
      });
      return defaultValue;
    }

    return envValue;
  }

  /**
   * Validate string with allowed values
   */
  validateString(
    envVar: string,
    defaultValue: string,
    allowedValues?: string[],
    required: boolean = false
  ): string {
    const envValue = process.env[envVar];

    if (required && !envValue) {
      this.errors.push({
        variable: envVar,
        value: envValue,
        message: 'Required environment variable is not set'
      });
      return defaultValue;
    }

    const value = envValue || defaultValue;

    if (allowedValues && !allowedValues.includes(value)) {
      this.errors.push({
        variable: envVar,
        value: value,
        message: `Invalid value. Allowed values: ${allowedValues.join(', ')}`
      });
      return defaultValue;
    }

    return value;
  }

  /**
   * Check for port conflicts across all database configurations
   */
  validatePortConflicts(ports: { [key: string]: number }): void {
    const portValues = Object.values(ports);
    const portEntries = Object.entries(ports);
    
    for (let i = 0; i < portEntries.length; i++) {
      for (let j = i + 1; j < portEntries.length; j++) {
        if (portEntries[i][1] === portEntries[j][1]) {
          this.errors.push({
            variable: `${portEntries[i][0]} & ${portEntries[j][0]}`,
            value: portEntries[i][1].toString(),
            message: `Port conflict detected. Both databases cannot use the same port ${portEntries[i][1]}`
          });
        }
      }
    }
  }

  /**
   * Get all validation errors
   */
  getErrors(): ValidationError[] {
    return this.errors;
  }

  /**
   * Check if validation passed (no errors)
   */
  isValid(): boolean {
    return this.errors.length === 0;
  }

  /**
   * Format errors for display
   */
  formatErrors(): string {
    if (this.errors.length === 0) return '';

    const errorLines = this.errors.map((error, index) => {
      return `${index + 1}. ${error.variable}="${error.value || '<not set>'}" - ${error.message}`;
    });

    return `❌ Environment Variable Validation Errors:\n\n${errorLines.join('\n')}\n\n` +
           `💡 Fix these issues and try again. See README for valid environment variable formats.`;
  }

  /**
   * Throw error if validation failed
   */
  throwIfInvalid(): void {
    if (!this.isValid()) {
      throw new Error(this.formatErrors());
    }
  }
}