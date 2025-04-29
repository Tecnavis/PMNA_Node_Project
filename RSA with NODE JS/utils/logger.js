// // utils/logger.js
// const winston = require('winston');
// const fs = require('fs');
// const path = require('path');
// const CloudWatchTransport = require('winston-cloudwatch');
// const { combine, timestamp, printf, json, prettyPrint } = winston.format;

// // Ensure logs directory exists
// const logsDirectory = path.join(__dirname, '..', 'logs');
// if (!fs.existsSync(logsDirectory)) {
//   fs.mkdirSync(logsDirectory, { recursive: true });
// }

// const environment = process.env.NODE_ENV || 'development';

// // Custom formats
// const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
//   let msg = `${timestamp} [${level}]: ${message}`;
//   if (Object.keys(metadata).length > 0) {
//     msg += ` ${JSON.stringify(metadata, null, 2)}`;
//   }
//   return msg;
// });

// const fileFormat = combine(
//   timestamp(),
//   json(),
//   prettyPrint()
// );

// // Create logger instance
// const logger = winston.createLogger({
//   level: 'silly', // Log everything in development, adjust as needed
//   format: fileFormat,
//   transports: [
//     // Always write to files (all environments)
//     new winston.transports.File({
//       filename: path.join(logsDirectory, 'error.log'),
//       level: 'error',
//       maxsize: 1024 * 1024 * 5, // 5MB
//       maxFiles: 10
//     }),
//     new winston.transports.File({
//       filename: path.join(logsDirectory, 'combined.log'),
//       maxsize: 1024 * 1024 * 10, // 10MB
//       maxFiles: 10
//     })
//   ],
//   exceptionHandlers: [
//     new winston.transports.File({
//       filename: path.join(logsDirectory, 'exceptions.log')
//     })
//   ],
//   rejectionHandlers: [
//     new winston.transports.File({
//       filename: path.join(logsDirectory, 'rejections.log')
//     })
//   ]
// });

// // Add console transport in development
// if (environment === 'development') {
//   logger.add(new winston.transports.Console({
//     format: combine(
//       timestamp(),
//       winston.format.colorize(),
//       consoleFormat
//     ),
//     level: 'debug'
//   }));
// }

// // Add CloudWatch in production
// if (environment === 'production') {
//   logger.add(new CloudWatchTransport({
//     logGroupName: process.env.CLOUDWATCH_GROUP || 'my-app-log-group',
//     logStreamName: process.env.CLOUDWATCH_STREAM || 'my-log-stream',
//     awsRegion: process.env.AWS_REGION || 'us-east-1',
//     jsonMessage: true
//   }));
// }

// // Helper function for logging objects with full depth
// logger.fullLog = (level, message, data) => {
//   if (typeof data === 'object') {
//     logger[level](message, JSON.parse(JSON.stringify(data, null, 2)));
//   } else {
//     logger[level](`${message} ${data}`);
//   }
// };

// module.exports = logger;