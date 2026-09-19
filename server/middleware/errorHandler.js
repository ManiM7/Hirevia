const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already in use`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired session. Please log in again.';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
