// // utils/logger.js

// const winston = require('winston');
// const fs = require('fs');
// const path = require('path');
// const CloudWatchTransport = require('winston-cloudwatch');

// // Check if logs directory exists, if not, create it
// const logsDirectory = path.join(__dirname, 'logs');
// if (!fs.existsSync(logsDirectory)) {
//   fs.mkdirSync(logsDirectory);
// }

// const environment = process.env.NODE_ENV || 'development'; // Default to development if not specified

// // Custom log format
// const logFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
//     let log = `${timestamp} [${level}]: ${message}`;
//     if (Object.keys(metadata).length) {
//         log += ` ${JSON.stringify(metadata)}`;
//     }
//     return log;
// });

// // Create the winston logger
// const logger = winston.createLogger({
//     level: environment === 'production' ? 'info' : 'debug', // In production, log only 'info' or higher
//     format: winston.format.combine(
//         winston.format.timestamp(),
//         logFormat
//     ),
//     transports: []
// });

// // Log to console in development
// if (environment === 'development') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.simple(),
//     }));
// }

// // In production, log to CloudWatch or other centralized systems
// if (environment === 'production') {
//     logger.add(new CloudWatchTransport({
//         logGroupName: 'my-app-log-group',
//         logStreamName: 'my-log-stream',
//         awsRegion: 'us-east-1',
//     }));

//     // Log to a file for local production logs, ensure log directory exists
//     logger.add(new winston.transports.File({
//         filename: path.join(logsDirectory, 'combined.log'),
//         maxsize: 5242880, // 5MB file size limit
//         maxFiles: 5, // Keep only 5 log files
//         tailable: true, // Keeps logs in a rolling file
//     }));
// }

// module.exports = logger;
