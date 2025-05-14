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
var attendanceRouter = require('./routes/attendance')
var pmnrRouter = require('./routes/pmnrReport')
var expenseRouter = require('./routes/expense')
var dieselExpensesRouter = require('./routes/dieselExpense')
var executivesRouter = require('./routes/executive')


// Connect to database
connectDB()

setupAgendaJobs().then(() => {
  console.log("Job Scheduler connected.");
}).catch(console.error);

const logger1 = LoggerFactory.initialize({});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}))

app.set('views', path.join(__dirname, 'views'));

const limiter = rateLimit({
  windowMs: 10 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res, next) => {
    const err = new Error('Too many requests. Please try again later.');
    err.status = StatusCodes.TOO_MANY_REQUESTS;
    next(err);
  },
});

app.use(limiter);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/reward', rewardRouter);
app.use('/booking', bookingRouter);
app.use('/leaves', leavesRouter);
app.use('/feedback', feedbackRouter);
app.use('/vehicle', vehicleRouter);
app.use('/point', pointRouter);
app.use('/bookingnote', bookingNotesRouter);
app.use('/advance-payment', advanceRouter);
app.use('/cash-received-details', cashReceivedDetails);
app.use('/attendance', attendanceRouter);
app.use('/pmnr', pmnrRouter);
app.use('/expense', expenseRouter);
app.use('/diesel-expenses', dieselExpensesRouter);
app.use('/marketing-executives', executivesRouter);

app.use(errorHandler);
module.exports = app;
