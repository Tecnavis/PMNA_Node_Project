var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
const rateLimit = require('express-rate-limit');

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
var setupAgendaJobs = require('./config/Agenda.config.js')

const { app, server } = require('./config/socket.js');

// Connect to database
connectDB()

setupAgendaJobs().then(() => {
  console.log("Job Scheduler connected.");
}).catch(console.error);

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
  message: 'Too many requests, please wait 10 seconds before retrying.',
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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err)
  return res.status(err.status || 500).json({
    message: err.message
  })
});

module.exports = app;
