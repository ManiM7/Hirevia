const mongoose = require('mongoose');

const sectionScoreSchema = new mongoose.Schema(
  { score: Number, max: Number },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateProfile', required: true, index: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },

    totalScore: { type: Number, required: true, min: 0, max: 100 },
    sectionScores: {
      contact: sectionScoreSchema,
      summary: sectionScoreSchema,
      skills: sectionScoreSchema,
      experience: sectionScoreSchema,
      projects: sectionScoreSchema,
      education: sectionScoreSchema,
      certifications: sectionScoreSchema,
      keywords: sectionScoreSchema,
    },
    skills: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    missingKeywords: [{ type: String }],
    recommendations: [{ type: String }],
  },
  { timestamps: true }
);

resumeAnalysisSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
