
import chalk from 'chalk';

// Advanced logging system
export class Logger {
  constructor(name) {
    this.name = name;
    this.level = process.env.LOG_LEVEL || 'info';
  }
  
  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[${this.name}] DEBUG: ${message}`), ...args);
    }
  }
  
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[${this.name}] INFO: ${message}`), ...args);
    }
  }
  
  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow(`[${this.name}] WARN: ${message}`), ...args);
    }
  }
  
  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`[${this.name}] ERROR: ${message}`), ...args);
    }
  }
  
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}
