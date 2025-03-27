var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var connectDB = require('./config/db')
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

const cors = require('cors')
var app = express();

connectDB()

app.use(cors({
  origin:'*'
}))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
