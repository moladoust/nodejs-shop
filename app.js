require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const Category = require('./models/category');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const logger = require('morgan');

const connectDB = require('./config/db');

const app = express();
require('./config/passport');

connectDB();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const adminRouter = require('./routes/admin');
app.use('/admin', adminRouter);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
    cookie: { maxAge: 86400 },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(async (req, res, next) => {
  try {
    res.locals.login = req.isAuthenticated();
    res.locals.currentUser = req.user;
    res.locals.session = req.session;
    const categories = await Category.find({}).sort({ title: 1 });
    res.locals.categories = categories;
    next();
  } catch (e) {
    console.log(e);
    res.redirect('/');
  }
});

getBreadcrumbs = function (url) {
  var rtn = [{ name: 'Home', url: '/' }],
    acc = '', // accumulative url
    arr = url.substring(1).split('/');

  for (i = 0; i < arr.length; i++) {
    acc = i != arr.length - 1 ? acc + '/' + arr[i] : null;
    rtn[i + 1] = {
      name: arr[i].charAt(0).toUpperCase() + arr[i].slice(1),
      url: acc,
    };
  }
  return rtn;
};
app.use(function (req, res, next) {
  req.breadcrumbs = getBreadcrumbs(req.originalUrl);
  next();
});

const indexRouter = require('./routes/index');
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/user');
const pagesRouter = require('./routes/pages');
app.use('/products', productsRouter);
app.use('/user', usersRouter);
app.use('/pages', pagesRouter);
app.use('/', indexRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

var port = process.env.PORT || 3000;
app.set('port', port);
app.listen(port, () => {
  console.log('Server is running at port: ' + port);
});

module.exports = app;
