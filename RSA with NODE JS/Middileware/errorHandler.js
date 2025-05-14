const { StatusCodes } = require('http-status-codes');

class CustomAPIError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    }
}

class NotFoundError extends CustomAPIError {
    constructor(message) {
        super(message);
        this.statusCode = StatusCodes.NOT_FOUND;
    }
}

class UnauthorizedError extends CustomAPIError {
    constructor(message) {
        super(message);
        this.statusCode = StatusCodes.UNAUTHORIZED;
    }
}

class BadRequestError extends CustomAPIError {
    constructor(message, errors = []) {
        super(message);
        this.statusCode = StatusCodes.BAD_REQUEST;
        this.errors = errors.length ? errors : [{ message }];
    }
}

class ValidationError extends BadRequestError {
    constructor(errors) {
        super('Validation failed', errors);
        this.name = 'ValidationError';
    }
}

class RateLimitError extends CustomAPIError {
    constructor(message) {
        super(message);
        this.statusCode = StatusCodes.TOO_MANY_REQUESTS;
    }
}

class DatabaseError extends CustomAPIError {
    constructor(message) {
        super(message);
        this.statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    }
}

const errorHandler = (error, req, res, next) => {
    console.error({
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error.errors && { errors: error.errors })
        },
        request: {
            method: req.method,
            path: req.path,
            ip: req.ip,
            timestamp: new Date().toISOString()
        }
    });

    // Default error response
    let statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    let errorCode = 'SERVER_ERROR';
    let errors = [{ message: error.message || 'Something went wrong' }];

    // Handle specific error types
    if (error instanceof CustomAPIError) {
        statusCode = error.statusCode;
        errorCode = error.name.toUpperCase();

        if (error.errors) {
            errors = error.errors;
        }
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = StatusCodes.UNAUTHORIZED;
        errorCode = 'INVALID_TOKEN';
        errors = [{ message: 'Invalid authentication token' }];
    } else if (error.name === 'TokenExpiredError') {
        statusCode = StatusCodes.UNAUTHORIZED;
        errorCode = 'TOKEN_EXPIRED';
        errors = [{ message: 'Authentication token expired' }];
    } else if (error.name === 'MongoError' && error.code === 11000) {
        statusCode = StatusCodes.CONFLICT;
        errorCode = 'DUPLICATE_KEY';
        const field = Object.keys(error.keyPattern)[0];
        errors = [{
            field,
            message: `${field} already exists`
        }];
    } else if (error.name === 'ValidationError') {
        statusCode = StatusCodes.BAD_REQUEST;
        errorCode = 'VALIDATION_ERROR';
        errors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
        }));
    }

    const response = {
        success: false,
        errorCode,
        errors,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    res.status(statusCode).json(response);
};

module.exports = {
    errorHandler,
    CustomAPIError,
    NotFoundError,
    UnauthorizedError,
    BadRequestError,
    ValidationError,
    RateLimitError,
    DatabaseError
};