const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateProfile', required: true, index: true },
    originalFilename: { type: String, required: true },
    storedFilename: { type: String, required: true }, // safe, randomly generated name on disk
    fileType: { type: String, enum: ['pdf', 'docx'], required: true },
    fileSizeBytes: { type: Number, required: true },

    rawText: { type: String, default: '' }, // full extracted plain text

    parsed: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      summary: { type: String, default: '' },
      skills: [{ type: String }],
      education: [{ type: String }],
      experience: [{ type: String }],
      projects: [{ type: String }],
      certifications: [{ type: String }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
