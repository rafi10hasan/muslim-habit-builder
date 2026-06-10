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

// Vercel-এর মতো সার্ভারলেস প্ল্যাটফর্মে ফাইল রাইটিং এড়ানোর জন্য এই চেকটি দরকার
const isVercel = process.env.VERCEL === '1';

if (config.node_env === 'production' && !isVercel) {
  // VPS বা নিজস্ব সার্ভারে (যেখানে ফাইল রাইট করা যায়) থাকলে ফাইল লগ চালু থাকবে
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
  // লোকাল ডেভেলপমেন্টে অথবা Vercel-এর মতো রিড-অনলি সার্ভারলেস প্ল্যাটফর্মে শুধু কনসোলে লগ হবে
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