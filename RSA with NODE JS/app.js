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
// ============ ADD APK FILES SERVING HERE ============
// ============ ADD APK FILES SERVING HERE - CORRECTED ============
// Serve APK files from /downloads directory as per image instruction
app.use("/downloads", express.static(path.join(__dirname, "public/downloads")));

// Create directory for APK files if it doesn't exist
const fs = require('fs');
const downloadsDir = path.join(__dirname, 'public/downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
    console.log('Created downloads directory for APK files');
}
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
// Updated download flow route with auto-open script
app.get('/app/download-flow/:showroomId', async (req, res) => {
    try {
        const { showroomId } = req.params;
        
        // Fetch showroom details
        const Showroom = require('./Model/showroom');
        const showroom = await Showroom.findById(showroomId);
        
        if (!showroom) {
            return res.status(404).send('Showroom not found');
        }
        
        // Your backend URL
        const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        
        // FIXED: Direct APK download link - use /downloads/ NOT /apps/
        const apkDownloadUrl = `${backendUrl}/downloads/rsa-staff.apk`;
        
       
        
        // Simple, clean HTML for app download
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>RSA Staff App</title>
            
            <!-- ===== ADD THIS AUTO-OPEN SCRIPT HERE ===== -->
            <script>
                // Auto-try to open the app when page loads
                window.onload = function() {
                    // Small delay to ensure page is loaded
                    setTimeout(function() {
                        window.location.href = 'rsastaff://signIn?showroomId=${showroomId}';
                    }, 500);
                };
            </script>
            <!-- ===== END OF AUTO-OPEN SCRIPT ===== -->
            
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                }
                
                .app-icon {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                    border-radius: 20px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    font-weight: bold;
                    color: white;
                }
                
                h1 {
                    color: #1e293b;
                    margin-bottom: 10px;
                    font-size: 28px;
                }
                
                p {
                    color: #64748b;
                    margin-bottom: 30px;
                    line-height: 1.6;
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
                    text-decoration: none;
                }
                
                .download-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
                }
                
                .open-app-btn {
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                }
                
                .showroom-info {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 30px 0;
                    text-align: left;
                }
                
                .showroom-info h3 {
                    color: #1e293b;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                
                .info-item {
                    margin-bottom: 8px;
                    color: #475569;
                }
                
                .info-item strong {
                    color: #1e293b;
                }
                
                .instructions {
                    background: #fef3c7;
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 30px;
                    text-align: left;
                }
                
                .instructions h3 {
                    color: #92400e;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .instructions ul {
                    padding-left: 20px;
                    color: #92400e;
                }
                
                .instructions li {
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                
                .security-notice {
                    background: #dcfce7;
                    border-radius: 12px;
                    padding: 15px;
                    margin-top: 20px;
                    font-size: 14px;
                    color: #166534;
                }
                
                @media (max-width: 480px) {
                    .container {
                        padding: 30px 20px;
                        border-radius: 15px;
                    }
                    
                    .download-btn {
                        padding: 16px 30px;
                        font-size: 16px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="app-icon">RSA</div>
                <h1>RSA Staff App</h1>
                <p>Manage showroom operations directly from your mobile device</p>
                
                <div class="showroom-info">
                    <h3>Showroom Details</h3>
                    <div class="info-item">
                        <strong>Name:</strong> ${showroom.name}
                    </div>
                    <div class="info-item">
                        <strong>Location:</strong> ${showroom.location}
                    </div>
                    <div class="info-item">
                        <strong>ID:</strong> ${showroom.showroomId}
                    </div>
                    <div class="info-item">
                        <strong>Contact:</strong> ${showroom.phone || showroom.helpline || 'N/A'}
                    </div>
                </div>
                
                <button class="download-btn" onclick="downloadApp()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download App (APK)
                </button>
                
                <button class="download-btn open-app-btn" onclick="openApp()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    Open Installed App
                </button>
                
                <div class="instructions">
                    <h3>Installation Instructions (Android):</h3>
                    <ul>
                        <li>Tap "Download App" button above</li>
                        <li>When download completes, open the APK file</li>
                        <li>If prompted, allow installation from unknown sources</li>
                        <li>Follow the installation prompts</li>
                        <li>After installation, open the app</li>
                    </ul>
                </div>
                
                <div class="security-notice">
                    🔒 This app is safe to install. You may need to enable "Install from unknown sources" in your Android settings.
                </div>
            </div>
            
            <script>
                function downloadApp() {
                    // Direct APK download
                    window.location.href = '${apkDownloadUrl}';
                }
                
                function openApp() {
                    // Try to open the app if installed
                    const deepLink = 'rsastaff://signIn?showroomId=${showroomId}';
                    
                    // Try to open the app
                    window.location.href = deepLink;
                    
                    // If app is not installed, redirect to download after a delay
                    setTimeout(() => {
                        if (confirm('App not installed. Would you like to download it?')) {
                            downloadApp();
                        }
                    }, 1000);
                }
                
                // Auto-detect if on iOS (show different message)
                function detectPlatform() {
                    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
                    
                    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
                        // iOS device
                        document.querySelector('.instructions').innerHTML = 
                            '<h3>For iOS Devices:</h3>' +
                            '<p>Please contact your administrator for iOS installation instructions. ' +
                            'You can also use the web version below.</p>';
                        
                        document.querySelector('.security-notice').innerHTML = 
                            '📱 iOS installation requires different setup. Please contact support.';
                    }
                }
                
                document.addEventListener('DOMContentLoaded', detectPlatform);
            </script>
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