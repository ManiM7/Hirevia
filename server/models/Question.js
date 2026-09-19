const mongoose = require('mongoose');

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const QUESTION_TYPES = ['mcq', 'code-output', 'debugging', 'conceptual'];
// 'aptitude' is skill-independent (skill is set to the pseudo-skill "Aptitude");
// the other three map onto the existing per-skill question types above.
const QUESTION_CATEGORIES = ['technical', 'coding', 'debugging', 'aptitude'];

const questionSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true, index: true }, // canonical skill name, e.g. "JavaScript"; "Aptitude" for aptitude questions
    type: { type: String, enum: QUESTION_TYPES, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true, index: true },
    category: { type: String, enum: QUESTION_CATEGORIES, default: 'technical', index: true },

    question: { type: String, required: true },
    codeSnippet: { type: String, default: '' }, // for code-output / debugging questions

    options: [{ type: String }], // MCQ options (also used for code-output "what is the output" choices)
    correctAnswer: { type: String, required: true }, // never sent to the frontend before submission
    explanation: { type: String, default: '' },

    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Times this question has been served to any candidate — used to bias
    // selection toward under-used questions so different candidates tend
    // to receive different question sets from a shared bank.
    timesServed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

questionSchema.index({ skill: 1, difficulty: 1, isActive: 1 });

module.exports = mongoose.model('Question', questionSchema);
module.exports.DIFFICULTIES = DIFFICULTIES;
module.exports.QUESTION_TYPES = QUESTION_TYPES;
module.exports.QUESTION_CATEGORIES = QUESTION_CATEGORIES;
