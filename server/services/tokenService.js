const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn, cookieName, nodeEnv } = require('../config/env');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

function cookieMaxAgeMs() {
  // jwtExpiresIn like "7d" — approximate to ms for the cookie; the JWT's
  // own exp claim is the real authority.
  const match = /^(\d+)([smhd])$/.exec(jwtExpiresIn);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
}

function setAuthCookie(res, token) {
  const isProd = nodeEnv === 'production';
  res.cookie(cookieName, token, {
    httpOnly: true,
    // In production the frontend and backend are typically on different
    // domains (e.g. Vercel + Railway) — a genuinely cross-site setup.
    // Browsers never send a SameSite=Lax cookie on cross-site fetch/XHR
    // (only on top-level navigations), so with Lax the login response
    // would set the cookie but it would silently never be sent back on
    // any subsequent request, making the user look logged-out right
    // after logging in. SameSite=None fixes that, and requires Secure —
    // already true in production. Locally the app is same-origin (via
    // the Vite dev proxy), where Lax is the safer, correct default.
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: cookieMaxAgeMs(),
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(cookieName, { path: '/' });
}

module.exports = { signToken, setAuthCookie, clearAuthCookie };
