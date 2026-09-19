const CandidateProfile = require('../models/CandidateProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const assessmentService = require('../services/assessmentService');

async function ownProfile(userId) {
  const profile = await CandidateProfile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Candidate profile not found');
  return profile;
}

const start = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const { skills } = req.body;
  const { attempt, question } = await assessmentService.startAssessment(profile, skills);
  res.status(201).json({
    success: true,
    data: {
      attemptId: attempt._id,
      totalQuestions: attempt.totalQuestions,
      timeLimitSeconds: attempt.timeLimitSeconds,
      skills: attempt.skills,
      question,
    },
  });
});

const getQuestion = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const question = await assessmentService.getCurrentQuestion(req.params.id, profile._id);
  res.json({ success: true, data: question });
});

const answer = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const result = await assessmentService.submitAnswer(req.params.id, profile._id, req.body.submittedAnswer);
  res.json({ success: true, data: result });
});

const violation = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const { type } = req.body;
  const result = await assessmentService.recordViolation(req.params.id, profile._id, type);
  res.json({ success: true, data: result });
});

const finish = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const attempt = await assessmentService.finishAssessment(req.params.id, profile._id);
  res.json({ success: true, data: attempt });
});

const result = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const attempt = await assessmentService.getResult(req.params.id, profile._id);
  res.json({ success: true, data: attempt });
});

const progress = asyncHandler(async (req, res) => {
  const AssessmentAttempt = require('../models/AssessmentAttempt');
  const profile = await ownProfile(req.user._id);
  const attempts = await AssessmentAttempt.find({
    candidate: profile._id,
    status: { $in: ['completed', 'terminated'] },
  })
    .sort({ createdAt: 1 })
    .select('createdAt status result skills skillState violations terminationReason');

  res.json({
    success: true,
    data: {
      attempts,
      profileSnapshot: {
        atsScore: profile.atsScore,
        assessmentStats: profile.assessmentStats,
        skills: profile.skills,
      },
    },
  });
});

module.exports = { start, getQuestion, answer, violation, finish, result, progress };
