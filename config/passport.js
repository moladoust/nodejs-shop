const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/user');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(
  'local.signup',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (user) {
          return done(null, false, { message: 'This email exists in db.' });
        }
        if (password != req.body.repassword) {
          return done(null, false, { message: 'pass should be the same.' });
        }
        const newUser = await new User();
        newUser.username = req.body.name;
        newUser.email = email;
        newUser.password = newUser.encryptPassword(password);
        await newUser.save();
        return done(null, newUser);
      } catch (e) {
        console.log(e);
        return done(e);
      }
    }
  )
);

passport.use(
  'local.signin',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: false,
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: 'There is no such email' });
        }
        if (!user.validPassword(password)) {
          return done(null, false, {
            message: 'This pass is not match the correct one.',
          });
        }
        return done(null, user);
      } catch (e) {
        console.log(e);
        return done(e);
      }
    }
  )
);
