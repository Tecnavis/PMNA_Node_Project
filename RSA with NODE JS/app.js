var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
const rateLimit = require('express-rate-limit');
const StatusCodes = require('http-status-codes');

var setupAgendaJobs = require('./config/Agenda.config.js')
const { app, server } = require('./config/socket.js');
const { errorHandler } = require('./Middileware/errorHandler.js');
const LoggerFactory = require('./utils/logger/LoggerFactory');

var connectDB = require('./config/db')
var initAgenda = require('./config/Agenda.config.js')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var baseLocationRouter = require('./routes/baseLocation');
var serviceTypeRouter = require('./routes/serviceType');
var roleRouter = require('./routes/role');
var staffRouter = require('./routes/staff');
var providerRouter = require('./routes/provider');
var driverRouter = require('./routes/driver');
var companyRouter = require('./routes/company');
var showroomRouter = require('./routes/showroom');
var settlementTransactionRouter = require('./routes/settlementTransaction');
const archiveRouter = require('./routes/archive');

var rewardRouter = require('./routes/reward');
var bookingRouter = require('./routes/booking');
var feedbackRouter = require('./routes/feedback')
var vehicleRouter = require('./routes/vehicle')
var pointRouter = require('./routes/point')
var VehicleRouter = require('./routes/vehicle');
var leavesRouter = require('./routes/leaves');
var bookingNotesRouter = require('./routes/bookingNotes');
var advanceRouter = require('./routes/advance')
var cashReceivedDetails = require('./routes/cashReceivedDetails')
var cashReceivedDetailsStaff = require('./routes/cashReceivedDetailsStaff')

var cashCollectionDetails = require('./routes/cashCollectionDetails.js')

var attendanceRouter = require('./routes/attendance')
var pmnrRouter = require('./routes/pmnrReport')
var expenseRouter = require('./routes/expense')
var dieselExpensesRouter = require('./routes/dieselExpense')
var executivesRouter = require('./routes/executive')
var transactionsRouter = require('./routes/transaction.js')
var showroomPaymentRoutes = require('./routes/showroomPaymentRoutes.js');
const companyExpenseRoutes = require('./routes/companyExpenses.js');
const petrolPumpRoutes = require('./routes/petrol.js');
const workRoutes = require('./routes/workRoutes.js');

const { createProxyMiddleware } = require('http-proxy-middleware');
const { default: axios } = require('axios');

// Connect to database
connectDB()

setupAgendaJobs().then(() => {
  console.log("Job Scheduler connected.");
}).catch(console.error);

const logger1 = LoggerFactory.initialize({});

// ============ MEMORY PROTECTION MIDDLEWARE ============
const memoryProtectionMiddleware = (req, res, next) => {
  // Prevent excessive limit queries that cause memory issues
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    if (limit > 1000) {
      console.warn(`Memory protection: Limiting query from ${limit} to 1000 records`);
      req.query.limit = '1000';
    }
  }
  
  // Prevent showAll with large datasets
  if (req.query.showAll === 'true' && !req.query.limit) {
    console.warn('Memory protection: showAll=true limited to 1000 records');
    req.query.limit = '1000';
  }
  
  // Add request size limits for JSON data
  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > 10 * 1024 * 1024) { // 10MB max
      return res.status(413).json({ 
        error: 'Request too large', 
        message: 'Request body exceeds 10MB limit' 
      });
    }
  }
  
  next();
};

// ============ ENHANCED RATE LIMITING ============
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Fixes the X-Forwarded-For warning
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Stricter rate limiting for booking endpoints (where memory issues occurred)
const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // More strict limit for booking endpoints
  message: {
    error: 'Too many booking requests',
    message: 'Please slow down your requests to booking endpoints.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

// ============ APPLICATION MIDDLEWARE SETUP ============

// Trust proxy for rate limiting (important for Render.com)
app.set('trust proxy', 1);

// Apply memory protection to all routes
app.use(memoryProtectionMiddleware);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// FIXED PROXY HANDLER
app.use('/olamaps-proxy', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    const response = await axios({
      method: req.method,
      url: `https://api.olamaps.io/routing/v1/directions`,
      params: req.query,
      data: req.body,
      timeout: 30000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Proxy failed' };
    res.status(status).json(data);
  }
});

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));

// Enhanced health check with memory monitoring
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };
  
  res.status(200).json({ 
    status: 'healthy', 
    memory: memoryMB,
    uptime: process.uptime(),
    connections: server.engine?.clientsCount || 0,
    timestamp: new Date().toISOString()
  });
});

app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb to prevent memory issues
app.use(express.urlencoded({ extended: false, limit: '10mb' })); // Reduced from 50mb
app.use(cookieParser());

// Serve static files FIRST
app.use(express.static(path.join(__dirname, 'public')));

// ============ API ROUTES WITH SPECIFIC RATE LIMITING ============

// Apply stricter rate limiting to booking routes
app.use('/booking', bookingLimiter, bookingRouter);
app.use('/bookingnote', bookingLimiter, bookingNotesRouter);

// Other routes with general rate limiting
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);
app.use('/baselocation', baseLocationRouter);
app.use('/servicetype', serviceTypeRouter);
app.use('/role', roleRouter);
app.use('/staff', staffRouter);
app.use('/provider', providerRouter);
app.use('/driver', driverRouter);
app.use('/company', companyRouter);
app.use('/showroom', showroomRouter);
app.use('/settlementTransaction', settlementTransactionRouter);
app.use('/archive', archiveRouter);

app.use('/reward', rewardRouter);
app.use('/leaves', leavesRouter);
app.use('/feedback', feedbackRouter);
app.use('/vehicle', vehicleRouter);
app.use('/point', pointRouter);
app.use('/advance-payment', advanceRouter);
app.use('/cash-received-details', cashReceivedDetails);
app.use('/cash-received-details-staff', cashReceivedDetailsStaff);
app.use('/showroom-payments', showroomPaymentRoutes);
app.use('/cash-collection-details', cashCollectionDetails);
app.use('/attendance', attendanceRouter);
app.use('/pmnr', pmnrRouter);
app.use('/expense', expenseRouter);
app.use('/diesel-expenses', dieselExpensesRouter);
app.use('/marketing-executives', executivesRouter);
app.use('/transactions', transactionsRouter);
app.use('/company-expenses', companyExpenseRoutes);
app.use('/petrol-pumps', petrolPumpRoutes);
app.use('/work', workRoutes);

// ============ MEMORY MONITORING MIDDLEWARE ============
app.use((req, res, next) => {
  // Log memory usage for large responses
  const originalSend = res.send;
  res.send = function(data) {
    if (typeof data === 'string' && data.length > 500000) { // ~500KB
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      console.warn(`Large response detected: ${Math.round(data.length / 1024)}KB, Heap: ${heapUsedMB}MB, Path: ${req.path}`);
    }
    originalSend.apply(this, arguments);
  };
  next();
});

// CATCH-ALL ROUTE - MUST COME AFTER ALL API ROUTES BUT BEFORE ERROR HANDLERS
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ERROR HANDLERS - MUST COME AFTER ALL ROUTES
app.use(errorHandler);

// Final error handler with memory protection
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle memory-related errors specifically
  if (err.message && err.message.includes('heap out of memory')) {
    console.error('MEMORY CRITICAL: Heap out of memory detected');
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  
  res.status(500).json({ 
    success: false, 
    errorCode: 'SERVER_ERROR',
    message: 'Internal server error' 
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;