const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs an array of express-validator chains, then rejects with 422 if
 * any failed. Usage: router.post('/x', validate([body('email').isEmail()]), handler)
 */
function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
    next(new ApiError(422, 'Validation failed', details));
  };
}

module.exports = validate;
