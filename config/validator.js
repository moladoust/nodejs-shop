const { check, validationResult } = require('express-validator');

const signUpRules = () => {
  return [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Email is not valid.').not().isEmpty().isEmail(),
    check('password', 'Password must be more than 8 chars.')
      .not()
      .isEmpty()
      .isLength({ min: 6 }),
  ];
};

const signinRules = () => {
  return [
    check('email', 'Email is not valid.').not().isEmpty().isEmail(),
    check('password', 'Password is wrong.')
      .not()
      .isEmpty()
  ];
};

const contactUsRules = () => {
  return [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Email is required').not().isEmpty().isEmail(),
    check('message', 'Message is requierd.')
      .not()
      .isEmpty()
      .isLength({ min: 3 }),
  ];
};

const signupValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    var messages = [];
    errors.array().forEach((err) => {
      messages.push(err.msg);
    });
    req.flash('error', messages);
    return res.redirect('/user/signup');
  }
  next();
};

const signinValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    var messages = [];
    errors.array().forEach((err) => {
      messages.push(err.msg);
    });
    req.flash('error', messages);
    return res.redirect('/user/signin');
  }
  next();
};

const contactusValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    var messages = [];
    errors.array().forEach((err) => {
      messages.push(err.msg);
    });
    console.log(messages);
    req.flash('error', messages);
    return res.redirect('/pages/contact-us');
  }
  next();
};

module.exports = {
  signUpRules,
  signinRules,
  contactUsRules,
  signupValidation,
  signinValidation,
  contactusValidation,
};
