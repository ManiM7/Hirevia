const mongoose = require('mongoose');

const assessmentAnswerSchema = new mongoose.Schema(
  {
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    skill: { type: String, required: true },
    difficulty: { type: String, required: true },
    submittedAnswer: { type: String, default: '' },
    isCorrect: { type: Boolean, required: true },
    timeTakenMs: { type: Number, default: null },
    questionIndex: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

assessmentAnswerSchema.index({ attempt: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentAnswer', assessmentAnswerSchema);
