const CandidateProfile = require('../models/CandidateProfile');
const InterviewAttempt = require('../models/InterviewAttempt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const interviewService = require('../services/interviewService');

async function ownProfile(userId) {
  const profile = await CandidateProfile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Candidate profile not found');
  return profile;
}

const start = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const { sourceAssessmentAttemptId } = req.body;
  const { attempt, question } = await interviewService.startInterview(profile, sourceAssessmentAttemptId);
  res.status(201).json({
    success: true,
    data: { attemptId: attempt._id, totalQuestions: attempt.totalQuestions, aiVoiceGender: attempt.aiVoiceGender, question },
  });
});

const getQuestion = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const question = await interviewService.getCurrentQuestion(req.params.id, profile._id);
  res.json({ success: true, data: question });
});

const answer = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const { answerText, answerTimeMs } = req.body;
  const result = await interviewService.submitAnswer(req.params.id, profile._id, answerText, answerTimeMs);
  res.json({ success: true, data: result });
});

const finish = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const attempt = await interviewService.finishInterview(req.params.id, profile._id);
  res.json({ success: true, data: attempt });
});

const result = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const attempt = await interviewService.getResult(req.params.id, profile._id);
  res.json({ success: true, data: attempt });
});

const history = asyncHandler(async (req, res) => {
  const profile = await ownProfile(req.user._id);
  const attempts = await InterviewAttempt.find({ candidate: profile._id, status: 'completed' })
    .sort({ createdAt: -1 })
    .select('createdAt report totalQuestions personalizationContext');
  res.json({ success: true, data: attempts });
});

module.exports = { start, getQuestion, answer, finish, result, history };
