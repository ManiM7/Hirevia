const mongoose = require('mongoose');

const recruiterProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecruiterProfile', recruiterProfileSchema);
