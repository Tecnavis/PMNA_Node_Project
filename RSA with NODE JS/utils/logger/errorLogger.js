const LoggerFactory = require('./LoggerFactory');

class ErrorLogger {
    static logError(error, context = {}) {
        const logger = LoggerFactory.getLogger();

        const errorLog = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            ...context,
        };

        if (error.response) {
            errorLog.response = {
                status: error.response.status,
                data: error.response.data,
            };
        }

        logger.error(errorLog, 'Application error occurred');
    }

    static logWarning(warning, context = {}) {
        const logger = LoggerFactory.getLogger();

        logger.warn({
            warning,
            ...context,
        }, 'Application warning occurred');
    }
}

module.exports = ErrorLogger;