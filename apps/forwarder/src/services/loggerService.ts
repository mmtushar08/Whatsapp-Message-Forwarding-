import path from 'path';
import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/** Custom log format */
const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack ?? message}`;
});

/** Winston logger instance used throughout the application */
const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat,
      ),
    }),
    // File transport — writes structured JSON logs
    new winston.transports.File({
      filename: path.resolve(process.cwd(), 'logs/app.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],
});

export default logger;
