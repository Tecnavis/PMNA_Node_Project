const path = require('path');
require('dotenv').config();

const defaultConfig = {
    development: {
        transport: {
            targets: [{
                target: 'pino-pretty',
                level: 'debug',
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                }
            }]
        },
        level: 'debug'
    },
    production: {
        transport: {
            targets: [{
                target: 'pino/file',
                level: 'info',
                options: {
                    destination: path.join(__dirname, '../../logs/app.log'),
                    mkdir: true,
                    sync: false
                }
            }]
        },
        level: 'info',
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        // Removed the formatters since they're not compatible with transport targets
        messageKey: 'message',
        base: {
            env: process.env.NODE_ENV,
            version: process.env.npm_package_version
        }
    }
};

module.exports = defaultConfig;