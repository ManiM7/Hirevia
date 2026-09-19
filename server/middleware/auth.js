const jwt = require('jsonwebtoken');
const { jwtSecret, cookieName } = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  if (req.cookies && req.cookies[cookieName]) return req.cookies[cookieName];
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Requires a valid, non-expired JWT whose tokenVersion matches the user's
 * current tokenVersion. tokenVersion is bumped on password change/logout-all
 * so that old tokens (including ones issued for a temporary password) stop
 * working immediately.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired session. Please log in again.');
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user) throw new ApiError(401, 'Account no longer exists');
  if (user.isDisabled) throw new ApiError(403, 'This account has been disabled');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, 'Your temporary password is no longer valid. Please use your new password.');
  }

  req.user = user;
  req.authTokenPayload = payload;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

/**
 * Blocks access to the main app until the forced temporary-password change
 * has happened, as required by the first-login flow.
 */
function requirePasswordChanged(req, res, next) {
  if (req.user.temporaryPassword) {
    return next(new ApiError(403, 'You must change your temporary password before continuing'));
  }
  next();
}

module.exports = { requireAuth, requireRole, requirePasswordChanged, extractToken };
