/**
 * Strips keys starting with "$" or containing "." from request input to
 * prevent MongoDB operator injection (e.g. { email: { $ne: null } }).
 * Written in-house instead of express-mongo-sanitize to avoid that
 * package's incompatibility with Express 4's read-only req.query getter.
 */
function stripBadKeys(value) {
  if (Array.isArray(value)) {
    return value.map(stripBadKeys);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = stripBadKeys(val);
    }
    return clean;
  }
  return value;
}

module.exports = function sanitize(req, res, next) {
  if (req.body) req.body = stripBadKeys(req.body);
  if (req.params) req.params = stripBadKeys(req.params);
  if (req.query) {
    const cleaned = stripBadKeys(req.query);
    Object.keys(req.query).forEach((k) => delete req.query[k]);
    Object.assign(req.query, cleaned);
  }
  next();
};
