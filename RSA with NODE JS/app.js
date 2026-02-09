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
// In app.js - Ensure this route exists and works
app.get('/staff/showroom/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /mobile|android|ios/i.test(userAgent);
        
        console.log(`Universal link accessed for showroom ${id}, Mobile: ${isMobile}`);
        
        if (isMobile) {
            // Redirect to Flutter app with all parameters
            // First, fetch showroom data to include in redirect
            const Showroom = require('./Model/showroom');
            const showroom = await Showroom.findById(id);
            
            if (showroom) {
                const mobileParams = new URLSearchParams({
                    showroomId: showroom._id.toString(),
                    name: showroom.name || '',
                    location: showroom.location || '',
                    image: showroom.image || '',
                    helpline: showroom.helpline || '',
                    phone: showroom.phone || '',
                    state: showroom.state || '',
                    district: showroom.district || '',
                }).toString();
                
                res.redirect(`rsastaff://signIn?${mobileParams}`);
            } else {
                res.redirect(`rsastaff://signIn?showroomId=${id}`);
            }
        } else {
            // Redirect to web dashboard
            const webUrl = `https://showroomstaff.rsakerala.com/auth/cover-register?showroomId=${id}`;
            res.redirect(webUrl);
        }
    } catch (error) {
        console.error('Universal link error:', error);
        res.status(404).send('Showroom not found');
    }
});
// Add this to app.js for testing
app.get('/test-deeplink/:id', async (req, res) => {
    const { id } = req.params;
    
    const testData = {
        directFlutterLink: `rsastaff://signIn?showroomId=${id}&name=Test%20Showroom&location=Test%20Location`,
        universalLink: `${req.protocol}://${req.get('host')}/staff/showroom/${id}`,
        webLink: `https://showroomstaff.rsakerala.com/auth/cover-register?showroomId=${id}`
    };
    
    res.json(testData);
});
// Add this route to handle download flow
app.get('/app/download-flow/:showroomId', async (req, res) => {
    try {
        const { showroomId } = req.params;
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /mobile|android|ios/i.test(userAgent);
        
        // Fetch showroom details
        const Showroom = require('./Model/showroom');
        const showroom = await Showroom.findById(showroomId);
        
        if (!showroom) {
            return res.status(404).send('Showroom not found');
        }
        
        // HTML page with download notification and redirect
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Download RSA Staff App</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                body {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                
                .container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    max-width: 500px;
                    width: 100%;
                    animation: slideIn 0.5s ease-out;
                }
                
                @keyframes slideIn {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .header {
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                
                .header h1 {
                    font-size: 28px;
                    margin-bottom: 10px;
                    font-weight: 700;
                }
                
                .header p {
                    opacity: 0.9;
                    font-size: 16px;
                }
                
                .content {
                    padding: 40px 30px;
                }
                
                .showroom-info {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                    border-left: 4px solid #4f46e5;
                }
                
                .showroom-info h3 {
                    color: #1e293b;
                    margin-bottom: 10px;
                    font-size: 18px;
                }
                
                .info-item {
                    display: flex;
                    margin-bottom: 8px;
                    color: #64748b;
                }
                
                .info-item strong {
                    min-width: 100px;
                    color: #475569;
                }
                
                .download-section {
                    text-align: center;
                }
                
                .download-btn {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 18px 40px;
                    font-size: 18px;
                    font-weight: 600;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 20px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }
                
                .download-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
                }
                
                .download-btn:active {
                    transform: translateY(0);
                }
                
                .skip-btn {
                    color: #64748b;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    text-decoration: underline;
                    padding: 10px;
                }
                
                .skip-btn:hover {
                    color: #4f46e5;
                }
                
                .app-icon {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 20px;
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 28px;
                    font-weight: bold;
                }
                
                .platform-buttons {
                    display: flex;
                    gap: 15px;
                    margin-top: 20px;
                }
                
                .platform-btn {
                    flex: 1;
                    padding: 15px;
                    border-radius: 10px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    color: #475569;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                
                .platform-btn:hover {
                    border-color: #4f46e5;
                    color: #4f46e5;
                    transform: translateY(-2px);
                }
                
                .android-btn:hover {
                    border-color: #10b981;
                    color: #10b981;
                }
                
                .ios-btn:hover {
                    border-color: #3b82f6;
                    color: #3b82f6;
                }
                
                .footer {
                    text-align: center;
                    padding: 20px;
                    color: #64748b;
                    font-size: 14px;
                    border-top: 1px solid #e2e8f0;
                }
                
                @media (max-width: 480px) {
                    .container {
                        border-radius: 15px;
                    }
                    
                    .header {
                        padding: 25px 20px;
                    }
                    
                    .content {
                        padding: 30px 20px;
                    }
                    
                    .download-btn {
                        padding: 16px 30px;
                        font-size: 16px;
                    }
                    
                    .platform-buttons {
                        flex-direction: column;
                    }
                }
            </style>
            <script>
                function downloadApp(platform) {
                    const downloadLinks = {
                        android: 'https://play.google.com/store/apps/details?id=com.yourcompany.rsastaff',
                        ios: 'https://apps.apple.com/app/idYOUR_APP_ID',
                        apk: 'https://your-server.com/apps/rsa-staff-app.apk'
                    };
                    
                    let url;
                    switch(platform) {
                        case 'android':
                            url = downloadLinks.android;
                            break;
                        case 'ios':
                            url = downloadLinks.ios;
                            break;
                        case 'apk':
                            url = downloadLinks.apk;
                            break;
                    }
                    
                    // Try to open the app first
                    window.location.href = 'rsastaff://showroom/${showroomId}';
                    
                    // If app is not installed, redirect to store after a delay
                    setTimeout(() => {
                        window.location.href = url;
                    }, 1500);
                }
                
                function skipToWeb() {
                    // Redirect to web version
                    window.location.href = '${showroom.showroomLink}';
                }
                
                // Auto-detect platform and suggest appropriate download
                function detectPlatform() {
                    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
                    
                    if (/android/i.test(userAgent)) {
                        document.getElementById('platform-suggestion').textContent = 'Get it on Google Play';
                        document.getElementById('main-download-btn').onclick = () => downloadApp('android');
                    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
                        document.getElementById('platform-suggestion').textContent = 'Download on the App Store';
                        document.getElementById('main-download-btn').onclick = () => downloadApp('ios');
                    } else {
                        document.getElementById('platform-suggestion').textContent = 'Download App';
                        document.getElementById('main-download-btn').onclick = () => downloadApp('apk');
                    }
                }
                
                document.addEventListener('DOMContentLoaded', detectPlatform);
            </script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="app-icon">RSA</div>
                    <h1>RSA Staff App</h1>
                    <p>Manage showroom operations on the go</p>
                </div>
                
                <div class="content">
                    <div class="showroom-info">
                        <h3>Showroom Details</h3>
                        <div class="info-item">
                            <strong>Name:</strong> ${showroom.name}
                        </div>
                        <div class="info-item">
                            <strong>Location:</strong> ${showroom.location}
                        </div>
                        <div class="info-item">
                            <strong>Contact:</strong> ${showroom.phone || showroom.helpline}
                        </div>
                        <div class="info-item">
                            <strong>ID:</strong> ${showroom.showroomId}
                        </div>
                    </div>
                    
                    <div class="download-section">
                        <button id="main-download-btn" class="download-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span id="platform-suggestion">Download App</span>
                        </button>
                        
                        <div class="platform-buttons">
                            <button onclick="downloadApp('android')" class="platform-btn android-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8523 7.8508 12 7.8508s-3.5902.3931-5.1352 1.0588L4.8425 5.4067a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.8345 11.5847 1 14.7069 1 18.088v.392h22v-.392c0-3.3811-1.8345-6.5033-4.1185-8.7666"/>
                                </svg>
                                Android
                            </button>
                            <button onclick="downloadApp('ios')" class="platform-btn ios-btn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.31-2.33 1.05-3.11z"/>
                                </svg>
                                iOS
                            </button>
                        </div>
                        
                        <button onclick="skipToWeb()" class="skip-btn">
                            Continue to web version instead
                        </button>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Scan QR code with phone camera to download the app</p>
                    <p style="font-size: 12px; margin-top: 5px;">Showroom ID: ${showroom.showroomId}</p>
                </div>
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
        
    } catch (error) {
        console.error('Download flow error:', error);
        res.status(500).send('Error loading download page');
    }
});
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