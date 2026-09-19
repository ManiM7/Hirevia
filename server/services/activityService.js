const ActivityLog = require('../models/ActivityLog');

/**
 * Fire-and-forget activity logging. Failures are logged but never break
 * the calling request — activity history is important but non-critical.
 */
async function logActivity(userId, event, metadata = {}) {
  try {
    await ActivityLog.create({ user: userId, event, metadata });
  } catch (err) {
    console.error('[activity] failed to log', event, err.message);
  }
}

module.exports = { logActivity };
