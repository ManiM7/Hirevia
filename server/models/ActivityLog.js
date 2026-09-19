const mongoose = require('mongoose');

const EVENT_TYPES = [
  'REGISTERED',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGED',
  'RESUME_UPLOADED',
  'RESUME_ANALYZED',
  'ASSESSMENT_STARTED',
  'QUESTION_ANSWERED',
  'ASSESSMENT_COMPLETED',
  'ASSESSMENT_TERMINATED',
  'PROFILE_UPDATED',
  'CONNECTION_REQUESTED',
  'CONNECTION_AVAILABILITY_SUBMITTED',
  'CONNECTION_DECLINED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_CANCELLED',
];

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: String, enum: EVENT_TYPES, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
