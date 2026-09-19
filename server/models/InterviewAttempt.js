const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    questionText: { type: String, required: true },
    topic: { type: String, required: true }, // skill name, "behavioral", "careerObjective", "areaOfInterest", "certification"
    isFollowUp: { type: Boolean, default: false },
    followUpOfIndex: { type: Number, default: null },

    answerText: { type: String, default: '' },
    answeredAt: { type: Date, default: null },
    answerTimeMs: { type: Number, default: null },

    analysis: {
      wordCount: { type: Number, default: 0 },
      fillerWordCount: { type: Number, default: 0 },
      relevanceScore: { type: Number, default: null }, // 0-100, keyword-overlap based
      keywordsMatched: [{ type: String }],
    },
  },
  { _id: false }
);

const interviewAttemptSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateProfile', required: true, index: true },
    sourceAssessmentAttempt: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', default: null },

    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress', index: true },

    // Candidate's self-reported gender and the AI voice gender picked for
    // this interview (always the opposite — never inferred/guessed).
    candidateGender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    aiVoiceGender: { type: String, enum: ['male', 'female'], default: 'female' },

    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    totalQuestions: { type: Number, required: true },

    // Snapshot of personalization inputs used to build this interview's
    // question pool, for transparency/audit.
    personalizationContext: {
      skills: [{ type: String }],
      areaOfInterest: { type: String, default: '' },
      careerObjective: { type: String, default: '' },
      certifications: [{ type: String }],
      experienceLevel: { type: String, default: '' },
    },

    // Every question text ever asked to this candidate in any interview —
    // snapshotted at start (like assessments) to guarantee no repeats.
    priorHistoryQuestionTexts: [{ type: String }],

    questions: [interviewQuestionSchema],

    report: {
      overallScore: { type: Number, default: null },
      technicalKnowledge: { type: Number, default: null },
      communication: { type: Number, default: null },
      answerRelevance: { type: Number, default: null },
      confidenceClarity: { type: Number, default: null },
      skillsDemonstrated: [{ type: String }],
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      improvementSuggestions: [{ type: String }],
    },
  },
  { timestamps: true }
);

interviewAttemptSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewAttempt', interviewAttemptSchema);
