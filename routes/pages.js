const express = require('express');
const nodemailer = require('nodemailer');
const csrf = require('csurf');

const router = express.Router();

const { contactUsRules, contactusValidation } = require('../config/validator');
const csrfProtection = csrf();
router.use(csrfProtection);

router.get('/about-us', (req, res) => {
  res.render('pages/about-us', {
    pageName: 'About Us',
  });
});

router.get('/shipping-policy', (req, res) => {
  res.render('pages/shipping-policy', {
    pageName: 'Shipping Policy',
  });
});

router.get('/careers', (req, res) => {
  res.render('pages/careers', {
    pageName: 'Careers',
  });
});

router.get('/contact-us', (req, res) => {
  const successMsg = req.flash('success')[0];
  const errorMsg = req.flash('error');
  res.render('pages/contact-us', {
    pageName: 'Contact Us',
    csrfToken: req.csrfToken(),
    successMsg,
    errorMsg,
  });
});

router.post(
  '/contact-us',
  [contactUsRules(), contactusValidation],
  (req, res) => {
    const smtpTrans = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOpts = {
      from: req.body.email,
      to: process.env.GMAIL_EMAIL,
      subject: `Sent from ${req.body.name}`,
      html: `
      <div>
      <h2 style="color: black; text-align:center;">Client's name: ${req.body.name}</h2>
      <h3 style="color: black;">Client's email: (${req.body.email})<h3>
      </div>
      <h3 style="color: black;">Client's message: </h3>
      <div style="font-size: 28;">
      ${req.body.message}
      </div>
      `,
    };

    smtpTrans.sendMail(mailOpts, (err, response) => {
      if (err) {
        req.flash(
          'error',
          'An error occured... Try again later.'
        );
        return res.redirect('/pages/contact-us');
      } else {
        req.flash(
          'success',
          'Your message sent successfully.'
        );
        return res.redirect('/pages/contact-us');
      }
    });
  }
);

module.exports = router;
