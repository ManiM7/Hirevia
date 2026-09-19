const mongoose = require('mongoose');

const assessmentAttemptSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateProfile', required: true, index: true },
    skills: [{ type: String, required: true }],

    status: {
      type: String,
      enum: ['in_progress', 'completed', 'terminated'],
      default: 'in_progress',
      index: true,
    },
    terminationReason: { type: String, default: null },

    // Backend-authoritative timing — the frontend timer is display-only.
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date, default: null },
    timeLimitSeconds: { type: Number, required: true },

    totalQuestions: { type: Number, required: true },
    askedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    currentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
    currentQuestionIssuedAt: { type: Date, default: null },

    // Snapshot, taken once at start, of every question this candidate has
    // ever been asked in any prior attempt — combined with askedQuestionIds
    // above (this attempt's own) to guarantee no question ever repeats for
    // the same candidate across attempts.
    priorHistoryQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],

    // What personalization inputs were used to build the skill/category
    // pool for this attempt — stored for transparency/audit, not re-read
    // by the adaptive engine itself.
    personalizationContext: {
      resumeSkills: [{ type: String }],
      interestDerivedSkills: [{ type: String }],
      areaOfInterest: { type: String, default: '' },
      careerObjective: { type: String, default: '' },
      experienceLevel: { type: String, default: '' },
    },

    // Per-skill adaptive state, keyed by canonical skill name (e.g. "Node.js").
    // Plain Mixed object rather than a typed Map: several canonical skill
    // names contain "." (Node.js, Next.js, ...) which Mongoose's Map key
    // casting rejects, so this is read/written as a plain JS object and
    // mutations must call attempt.markModified('skillState').
    skillState: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Aggregated result, populated when the attempt finishes.
    result: {
      totalScore: { type: Number, default: null },
      correctCount: { type: Number, default: 0 },
      wrongCount: { type: Number, default: 0 },
      accuracy: { type: Number, default: null },
      timeTakenSeconds: { type: Number, default: null },
      skillScores: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    violations: {
      warnings: { type: Number, default: 0 },
      tabSwitches: { type: Number, default: 0 },
      windowBlur: { type: Number, default: 0 },
      fullscreenExits: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
