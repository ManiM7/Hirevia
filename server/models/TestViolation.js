const mongoose = require('mongoose');

const VIOLATION_TYPES = [
  'tab_switch',
  'window_blur',
  'fullscreen_exit',
  'copy',
  'paste',
  'right_click',
  'dev_tools_shortcut',
];

const testViolationSchema = new mongoose.Schema(
  {
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateProfile', required: true },
    type: { type: String, enum: VIOLATION_TYPES, required: true },
    questionIndex: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('TestViolation', testViolationSchema);
module.exports.VIOLATION_TYPES = VIOLATION_TYPES;
