const crypto = require('crypto');

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(charset) {
  const idx = crypto.randomInt(0, charset.length);
  return charset[idx];
}

/**
 * Generates a random password guaranteed to satisfy the platform's
 * complexity rules (upper, lower, digit, symbol, min length).
 */
function generateTemporaryPassword(length = 12) {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));
  const chars = [...required, ...rest];

  // Fisher-Yates shuffle using crypto-safe randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { generateTemporaryPassword };
