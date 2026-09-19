const mongoose = require('mongoose');

const STATUSES = ['pending', 'availability_submitted', 'scheduled', 'completed', 'cancelled'];

const slotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    startTime: { type: String, required: true }, // 'HH:mm'
    endTime: { type: String, required: true }, // 'HH:mm'
    timezone: { type: String, required: true }, // IANA zone name, e.g. "Asia/Kolkata"
  },
  { _id: true }
);

const connectionSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterProfile', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateProfile', required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },

    status: { type: String, enum: STATUSES, default: 'pending', index: true },

    message: { type: String, default: '', trim: true }, // recruiter's initial message
    candidateMessage: { type: String, default: '', trim: true }, // candidate's message with availability

    availabilitySlots: [slotSchema],

    selectedSlot: {
      date: String,
      startTime: String,
      endTime: String,
      timezone: String,
      startAt: { type: Date, default: null }, // precise UTC instant
      endAt: { type: Date, default: null },
    },

    meeting: {
      provider: { type: String, default: 'google_meet' },
      meetingId: { type: String, default: null }, // Google Calendar event id
      meetingLink: { type: String, default: null }, // real Google Meet URL only — never fabricated
      htmlLink: { type: String, default: null },
      title: { type: String, default: null },
    },

    cancelledBy: { type: String, enum: ['candidate', 'recruiter', null], default: null },
    cancelReason: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

connectionSchema.index({ recruiter: 1, status: 1, createdAt: -1 });
connectionSchema.index({ candidate: 1, status: 1, createdAt: -1 });
connectionSchema.index({ 'selectedSlot.startAt': 1 });

module.exports = mongoose.model('Connection', connectionSchema);
module.exports.STATUSES = STATUSES;
