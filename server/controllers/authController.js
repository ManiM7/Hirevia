const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateTemporaryPassword } = require('../utils/generatePassword');
const { isStrongPassword, PASSWORD_RULES_MESSAGE } = require('../utils/passwordPolicy');
const crypto = require('crypto');
const { clientUrl } = require('../config/env');
const {
  sendTemporaryPasswordEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} = require('../services/emailService');
const { signToken, setAuthCookie, clearAuthCookie } = require('../services/tokenService');
const { logActivity } = require('../services/activityService');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    temporaryPassword: user.temporaryPassword,
    lastLogin: user.lastLogin,
  };
}

const register = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (role === 'candidate') {
    return registerCandidate(req, res);
  }
  if (role === 'recruiter') {
    return registerRecruiter(req, res);
  }
  throw new ApiError(400, 'role must be "candidate" or "recruiter"');
});

async function registerCandidate(req, res) {
  const {
    fullName,
    email,
    mobile,
    location,
    dateOfBirth,
    highestEducation,
    experienceLevel,
    currentRole,
    preferredRole,
    preferredLocation,
    yearsOfExperience,
  } = req.body;

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role: 'candidate',
    temporaryPassword: true,
  });

  const photoFile = req.files?.profilePhoto?.[0];

  let profile;
  try {
    profile = await CandidateProfile.create({
      user: user._id,
      fullName,
      mobile,
      location,
      dateOfBirth: dateOfBirth || null,
      profilePhoto: photoFile ? photoFile.filename : null,
      highestEducation: highestEducation || '',
      experienceLevel: experienceLevel || 'Fresher',
      currentRole: currentRole || '',
      preferredRole: preferredRole || '',
      preferredLocation: preferredLocation || '',
      yearsOfExperience: yearsOfExperience || 0,
    });
    profile.recalculateCompleteness();
    await profile.save();
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  try {
    await sendTemporaryPasswordEmail({ to: normalizedEmail, fullName, temporaryPassword });
  } catch (err) {
    await CandidateProfile.deleteOne({ _id: profile._id });
    await User.deleteOne({ _id: user._id });
    console.error('[register] failed to send temporary password email:', err.message);
    throw new ApiError(502, 'Failed to send your temporary password by email. Please try registering again in a moment.');
  }

  await logActivity(user._id, 'REGISTERED', { role: 'candidate' });

  res.status(201).json({
    success: true,
    message: 'Account created. Check your email for your temporary password.',
    data: { email: normalizedEmail },
  });
}

async function registerRecruiter(req, res) {
  const { fullName, email, phone, companyName, companyWebsite, companyType, companyLocation, companyDescription } =
    req.body;

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role: 'recruiter',
    temporaryPassword: true,
  });

  const logoFile = req.files?.companyLogo?.[0];

  let company;
  let profile;
  try {
    company = await Company.create({
      name: companyName,
      website: companyWebsite || '',
      type: companyType,
      location: companyLocation || '',
      description: companyDescription || '',
      logo: logoFile ? logoFile.filename : null,
      createdBy: user._id,
    });

    profile = await RecruiterProfile.create({
      user: user._id,
      fullName,
      phone,
      company: company._id,
    });
  } catch (err) {
    if (company) await Company.deleteOne({ _id: company._id });
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  try {
    await sendTemporaryPasswordEmail({ to: normalizedEmail, fullName, temporaryPassword });
  } catch (err) {
    await RecruiterProfile.deleteOne({ _id: profile._id });
    await Company.deleteOne({ _id: company._id });
    await User.deleteOne({ _id: user._id });
    console.error('[register] failed to send temporary password email:', err.message);
    throw new ApiError(502, 'Failed to send your temporary password by email. Please try registering again in a moment.');
  }

  await logActivity(user._id, 'REGISTERED', { role: 'recruiter' });

  res.status(201).json({
    success: true,
    message: 'Account created. Check your email for your temporary password.',
    data: { email: normalizedEmail },
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordHash +tokenVersion +failedLoginAttempts +lockUntil'
  );

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isDisabled) {
    throw new ApiError(403, 'This account has been disabled. Contact support.');
  }

  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(429, `Too many failed login attempts. Try again in ${minutesLeft} minute(s).`);
  }

  // Trim incidental leading/trailing whitespace from copy-pasted passwords
  // (e.g. from the temporary-password email) — system-generated passwords
  // never legitimately contain spaces, so this only removes accidental
  // whitespace, never weakens a real password.
  const valid = await user.comparePassword(String(password ?? '').trim());
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    await logActivity(user._id, 'LOGIN_FAILED', {});
    throw new ApiError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  if (user.role === 'candidate') {
    await CandidateProfile.updateOne({ user: user._id }, { $set: { lastActive: new Date() } });
  } else if (user.role === 'recruiter') {
    await RecruiterProfile.updateOne({ user: user._id }, { $set: { lastActive: new Date() } });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  await logActivity(user._id, 'LOGIN', {});

  res.json({
    success: true,
    data: { user: publicUser(user), token },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new ApiError(401, 'Current password is incorrect');

  if (!isStrongPassword(newPassword)) throw new ApiError(422, PASSWORD_RULES_MESSAGE);

  const samePassword = await user.comparePassword(newPassword);
  if (samePassword) throw new ApiError(422, 'New password must be different from your current password');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.temporaryPassword = false;
  user.tokenVersion += 1; // invalidates every previously-issued token, including the temp-password one
  await user.save();

  clearAuthCookie(res);
  await logActivity(user._id, 'PASSWORD_CHANGED', {});

  try {
    await sendPasswordChangedEmail({ to: user.email, fullName: user.email });
  } catch (err) {
    console.error('[change-password] confirmation email failed:', err.message);
  }

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again with your new password.',
  });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  await logActivity(req.user._id, 'LOGOUT', {});
  res.json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const user = req.user;
  let profile = null;
  if (user.role === 'candidate') {
    profile = await CandidateProfile.findOne({ user: user._id });
  } else if (user.role === 'recruiter') {
    profile = await RecruiterProfile.findOne({ user: user._id }).populate('company');
  }
  res.json({ success: true, data: { user: publicUser(user), profile } });
});

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const GENERIC_RESET_MESSAGE = 'If an account with that email exists, a password reset link has been sent.';

const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (user && !user.isDisabled) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    try {
      await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });
    } catch (err) {
      console.error('[forgot-password] failed to send reset email:', err.message);
    }
  }

  // Always return the same generic response so this endpoint can't be used
  // to enumerate which emails have an account.
  res.json({ success: true, message: GENERIC_RESET_MESSAGE });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const normalizedEmail = String(req.body.email).toLowerCase().trim();

  if (!isStrongPassword(newPassword)) throw new ApiError(422, PASSWORD_RULES_MESSAGE);

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetTokenHash +passwordResetExpires +tokenVersion'
  );

  const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const valid =
    user &&
    user.passwordResetTokenHash &&
    user.passwordResetExpires &&
    user.passwordResetExpires > new Date() &&
    crypto.timingSafeEqual(Buffer.from(user.passwordResetTokenHash), Buffer.from(tokenHash));

  if (!valid) throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.temporaryPassword = false;
  user.tokenVersion += 1;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  await logActivity(user._id, 'PASSWORD_CHANGED', { via: 'reset' });
  try {
    await sendPasswordChangedEmail({ to: user.email, fullName: user.email });
  } catch (err) {
    console.error('[reset-password] confirmation email failed:', err.message);
  }

  res.json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
});

module.exports = { register, login, changePassword, logout, me, forgotPassword, resetPassword };
