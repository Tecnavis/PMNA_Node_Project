const pino = require('pino');
const config = require('./config');
const { ENVIRONMENTS } = require('./constants');

class LoggerFactory {
    static #instance = null;
    #logger = null;

    constructor() {
        if (LoggerFactory.#instance) {
            return LoggerFactory.#instance;
        }
        LoggerFactory.#instance = this;
    }

    initialize(options = {}) {
        const env = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
        const baseConfig = config[env];

        try {
            this.#logger = pino({
                ...baseConfig,
                ...options
            });

            // Log initialization success
            this.#logger.info({
                env,
                nodeVersion: process.version,
                pid: process.pid
            }, 'Logger initialized successfully');

        } catch (error) {
            // Fallback to basic configuration if there's an error
            console.error('Error initializing logger:', error);
            this.#logger = pino({
                level: 'info',
                timestamp: true
            });
        }

        return this.#logger;
    }

    getLogger() {
        if (!this.#logger) {
            this.initialize();
        }
        return this.#logger;
    }

    createChildLogger(bindings) {
        const logger = this.getLogger();
        return logger.child(bindings);
    }
}

module.exports = new LoggerFactory();