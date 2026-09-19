const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { uploadRegistrationImages } = require('../middleware/upload');
const { loginRateLimitMax, loginRateLimitWindowMs } = require('../config/env');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: loginRateLimitWindowMs,
  max: loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts from this network. Please try again later.' },
});

const MOBILE_REGEX = /^\+?[0-9]{7,15}$/;

const registerValidators = [
  body('role').isIn(['candidate', 'recruiter']).withMessage('role must be candidate or recruiter'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 120 }),

  // Candidate-only fields
  body('mobile')
    .if(body('role').equals('candidate'))
    .matches(MOBILE_REGEX)
    .withMessage('A valid mobile number is required'),
  body('location').if(body('role').equals('candidate')).trim().notEmpty().withMessage('Location is required'),
  body('yearsOfExperience').if(body('role').equals('candidate')).optional().isFloat({ min: 0, max: 60 }),

  // Recruiter-only fields
  body('phone').if(body('role').equals('recruiter')).matches(MOBILE_REGEX).withMessage('A valid phone number is required'),
  body('companyName').if(body('role').equals('recruiter')).trim().notEmpty().withMessage('Company name is required'),
  body('companyType')
    .if(body('role').equals('recruiter'))
    .isIn(['MNC', 'Startup', 'Product Company', 'Service Company', 'Other'])
    .withMessage('Invalid company type'),
];

const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').notEmpty().withMessage('New password is required'),
];

router.post('/register', uploadRegistrationImages, validate(registerValidators), authController.register);
router.post('/login', loginLimiter, validate(loginValidators), authController.login);
router.post('/change-password', requireAuth, validate(changePasswordValidators), authController.changePassword);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

router.post(
  '/forgot-password',
  loginLimiter,
  validate([body('email').isEmail().withMessage('A valid email is required').normalizeEmail()]),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  loginLimiter,
  validate([
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('token').trim().notEmpty().withMessage('Reset token is required'),
    body('newPassword').notEmpty().withMessage('New password is required'),
  ]),
  authController.resetPassword
);

module.exports = router;
