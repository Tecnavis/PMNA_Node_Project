// src/utils/networkUtils.js

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Network error classifier with enhanced detection
exports.isNetworkError = (error) => {
  const networkErrorPatterns = [
    'network',
    'ECONN',
    'timeout',
    'socket hang up',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'MongoNetworkError',
    'MongooseServerSelectionError'
  ];
  
  return networkErrorPatterns.some(pattern => 
    error.message?.includes(pattern) || 
    error.name?.includes(pattern)
  );
};

// Transaction wrapper with retry logic
exports.withRetryableTransaction = async (fn, options = {}) => {
    
  const { maxRetries = 3, baseDelay = 1000 } = options;
  let attempt = 0;
  let lastError;
  
  while (attempt < maxRetries) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      
      if (!this.isNetworkError(error)) {
        throw error; // Non-network errors bubble up immediately
      }
      
      lastError = error;
      attempt++;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } finally {
      session.endSession();
    }
  }
  
  throw lastError;
};

// Generate standardized network error response
exports.networkErrorResponse = (error, context = {}) => {
  const errorId = uuidv4();
  
  console.error('Network Error:', {
    errorId,
    message: error.message,
    stack: error.stack,
    ...context
  });
  
  return {
    code: 'NETWORK_FAILURE',
    message: 'Service temporarily unavailable',
    errorId,
    retryable: true,
    timestamp: new Date().toISOString()
  };
};

// Connection health check
exports.checkDbConnection = async () => {
  try {
    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
    }
    return true;
  } catch (error) {
    return false;
  }
};