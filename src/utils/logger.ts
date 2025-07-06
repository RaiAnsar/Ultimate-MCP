import winston from "winston";
import chalk from "chalk";

const customFormat = winston.format.printf(({ level, message, timestamp, context, ...metadata }) => {
  let msg = `${timestamp} `;
  
  // Color-coded level
  switch (level) {
    case 'error':
      msg += chalk.red(`[${level.toUpperCase()}]`);
      break;
    case 'warn':
      msg += chalk.yellow(`[${level.toUpperCase()}]`);
      break;
    case 'info':
      msg += chalk.blue(`[${level.toUpperCase()}]`);
      break;
    case 'debug':
      msg += chalk.gray(`[${level.toUpperCase()}]`);
      break;
    default:
      msg += `[${level.toUpperCase()}]`;
  }
  
  // Add context if present
  if (context) {
    msg += chalk.cyan(` [${context}]`);
  }
  
  msg += ` ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${chalk.gray(JSON.stringify(metadata))}`;
  }
  
  return msg;
});

export class Logger {
  private logger: winston.Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        customFormat
      ),
      transports: [
        new winston.transports.Console({
          stderrLevels: ['error', 'warn', 'info', 'debug'],
        }),
      ],
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        })
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
        })
      );
    }
  }

  private formatMessage(message: string, metadata?: any): any {
    return {
      message,
      context: this.context,
      ...metadata,
    };
  }

  error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.logger.error(this.formatMessage(message, { error: error.message, stack: error.stack }));
    } else {
      this.logger.error(this.formatMessage(message, error));
    }
  }

  warn(message: string, metadata?: any): void {
    this.logger.warn(this.formatMessage(message, metadata));
  }

  info(message: string, metadata?: any): void {
    this.logger.info(this.formatMessage(message, metadata));
  }

  debug(message: string, metadata?: any): void {
    this.logger.debug(this.formatMessage(message, metadata));
  }

  log(level: string, message: string, metadata?: any): void {
    this.logger.log(level, this.formatMessage(message, metadata));
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}