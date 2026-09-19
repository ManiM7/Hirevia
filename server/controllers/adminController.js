const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Company = require('../models/Company');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const TestViolation = require('../models/TestViolation');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// ---- Users ----

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (req.query.role) filter.role = req.query.role;

  const [data, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

const setUserDisabled = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid user id');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.isDisabled = Boolean(req.body.isDisabled);
  await user.save();
  res.json({ success: true, data: user });
});

// ---- Questions ----

const listQuestions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (req.query.skill) filter.skill = req.query.skill;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [data, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Question.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

const createQuestion = asyncHandler(async (req, res) => {
  const question = await Question.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: question });
});

const updateQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid question id');
  const question = await Question.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');

  const EDITABLE = ['skill', 'type', 'difficulty', 'question', 'codeSnippet', 'options', 'correctAnswer', 'explanation', 'isActive'];
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) question[field] = req.body[field];
  }
  await question.save();
  res.json({ success: true, data: question });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid question id');
  const question = await Question.findByIdAndDelete(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  res.json({ success: true, message: 'Question deleted' });
});

// ---- Assessments (review) ----

const listAssessments = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    AssessmentAttempt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'candidate', select: 'fullName' }),
    AssessmentAttempt.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

const listSuspiciousAssessments = asyncHandler(async (req, res) => {
  const attempts = await AssessmentAttempt.find({
    $or: [{ status: 'terminated' }, { 'violations.warnings': { $gt: 0 } }],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: 'candidate', select: 'fullName' });

  res.json({ success: true, data: attempts });
});

const getAssessmentViolations = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid assessment id');
  const violations = await TestViolation.find({ attempt: req.params.id }).sort({ createdAt: 1 });
  res.json({ success: true, data: violations });
});

// ---- Companies ----

const listCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find().sort({ createdAt: -1 });
  res.json({ success: true, data: companies });
});

module.exports = {
  listUsers,
  setUserDisabled,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listAssessments,
  listSuspiciousAssessments,
  getAssessmentViolations,
  listCompanies,
};
