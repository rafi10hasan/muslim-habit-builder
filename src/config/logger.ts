import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from './index';

// Define log format
const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const logFormat = winston.format.combine(
  enumerateErrorFormat(),
  winston.format.timestamp(),
  winston.format.json()
);

const transports: winston.transport[] = [];

// This check is needed to avoid file writes on serverless platforms like Vercel
const isVercel = process.env.VERCEL === '1';

if (config.node_env === 'production' && !isVercel) {
  // File logging stays enabled on a VPS or self-hosted server where file writes are allowed
  // Log rotation for error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );

  // Log rotation for combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );
} else {
  // In local development or read-only serverless platforms like Vercel, logs go to the console only
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Logger instance
const logger = winston.createLogger({
  level: config.node_env === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports,
});

export default logger;