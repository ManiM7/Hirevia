const InterviewAttempt = require('../models/InterviewAttempt');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const ApiError = require('../utils/ApiError');
const { buildQuestionPool, analyzeAnswer, generateFollowUp, CLOSING_QUESTION } = require('./interviewQuestionService');
const { generateInterviewReport } = require('./interviewReportService');
const { logActivity } = require('./activityService');

const MAX_TOTAL_QUESTIONS = 10;
const MIN_TOTAL_QUESTIONS = 4;

function oppositeGenderVoice(candidateGender) {
  // Male candidate -> female AI voice; female (or unset/other) -> male AI
  // voice, per spec. Gender is only ever read from the candidate's own
  // profile field — never inferred from name or resume content.
  return candidateGender === 'male' ? 'female' : 'male';
}

function publicQuestion(attempt, entry) {
  return {
    index: entry.index,
    questionText: entry.questionText,
    topic: entry.topic,
    isFollowUp: entry.isFollowUp,
    questionNumber: entry.index + 1,
    totalQuestions: attempt.totalQuestions,
    aiVoiceGender: attempt.aiVoiceGender,
  };
}

async function loadOwnedAttempt(attemptId, candidateId) {
  const attempt = await InterviewAttempt.findById(attemptId);
  if (!attempt) throw new ApiError(404, 'Interview not found');
  if (String(attempt.candidate) !== String(candidateId)) {
    throw new ApiError(403, 'This interview does not belong to you');
  }
  return attempt;
}

async function startInterview(candidateProfile, sourceAssessmentAttemptId) {
  if (!candidateProfile.gender) {
    throw new ApiError(400, 'Set your gender in your profile first — it is used to choose an opposite-gender AI interviewer voice and is never guessed.');
  }

  const existing = await InterviewAttempt.findOne({ candidate: candidateProfile._id, status: 'in_progress' });
  if (existing) {
    throw new ApiError(409, 'You already have an interview in progress', { attemptId: existing._id });
  }

  const skills = candidateProfile.skills || [];
  if (skills.length === 0) {
    throw new ApiError(400, 'Upload and analyze a resume first so we can personalize your interview questions');
  }

  let certifications = [];
  if (candidateProfile.resume) {
    const resume = await Resume.findById(candidateProfile.resume).select('parsed.certifications');
    certifications = resume?.parsed?.certifications || [];
  }

  const priorAttempts = await InterviewAttempt.find({ candidate: candidateProfile._id }).select('questions.questionText');
  const priorHistoryQuestionTexts = Array.from(
    new Set(priorAttempts.flatMap((a) => a.questions.map((q) => q.questionText)))
  );

  const pool = buildQuestionPool(
    {
      skills,
      areaOfInterest: candidateProfile.areaOfInterest,
      careerObjective: candidateProfile.careerObjective,
      certifications,
      experienceLevel: candidateProfile.experienceLevel,
    },
    priorHistoryQuestionTexts
  );

  if (pool.length === 0) {
    throw new ApiError(409, "You've already covered every available interview question in past attempts — check back after more question variety is added.");
  }

  const totalQuestions = Math.max(MIN_TOTAL_QUESTIONS, Math.min(pool.length, MAX_TOTAL_QUESTIONS));
  const aiVoiceGender = oppositeGenderVoice(candidateProfile.gender);

  const attempt = await InterviewAttempt.create({
    candidate: candidateProfile._id,
    sourceAssessmentAttempt: sourceAssessmentAttemptId || null,
    status: 'in_progress',
    candidateGender: candidateProfile.gender,
    aiVoiceGender,
    startTime: new Date(),
    totalQuestions,
    personalizationContext: {
      skills,
      areaOfInterest: candidateProfile.areaOfInterest || '',
      careerObjective: candidateProfile.careerObjective || '',
      certifications,
      experienceLevel: candidateProfile.experienceLevel || '',
    },
    priorHistoryQuestionTexts,
    questions: [{ index: 0, questionText: pool[0].questionText, topic: pool[0].topic, isFollowUp: false }],
  });

  const user = await CandidateProfile.findById(candidateProfile._id).select('user');
  await logActivity(user.user, 'ASSESSMENT_STARTED', { interviewAttemptId: attempt._id, type: 'voice_interview' });

  return { attempt, question: publicQuestion(attempt, attempt.questions[0]) };
}

async function getCurrentQuestion(attemptId, candidateId) {
  const attempt = await loadOwnedAttempt(attemptId, candidateId);
  if (attempt.status !== 'in_progress') throw new ApiError(409, `Interview is ${attempt.status}`);

  const current = attempt.questions[attempt.questions.length - 1];
  if (!current || current.answerText) throw new ApiError(409, 'No active question for this interview');

  return publicQuestion(attempt, current);
}

async function finalize(attempt) {
  attempt.status = 'completed';
  attempt.endTime = new Date();
  attempt.report = generateInterviewReport(attempt.questions);
  await attempt.save();

  await CandidateProfile.updateOne(
    { _id: attempt.candidate },
    { $set: { latestInterviewAttempt: attempt._id, interviewScore: attempt.report.overallScore, lastActive: new Date() } }
  );

  const user = await CandidateProfile.findById(attempt.candidate).select('user');
  if (user) {
    await logActivity(user.user, 'ASSESSMENT_COMPLETED', { interviewAttemptId: attempt._id, type: 'voice_interview', score: attempt.report.overallScore });
  }

  return attempt;
}

async function submitAnswer(attemptId, candidateId, answerText, answerTimeMs) {
  const attempt = await loadOwnedAttempt(attemptId, candidateId);
  if (attempt.status !== 'in_progress') throw new ApiError(409, `Interview is ${attempt.status}`);

  const current = attempt.questions[attempt.questions.length - 1];
  if (!current || current.answerText) throw new ApiError(409, 'No active question to answer');

  const analysis = analyzeAnswer(answerText, current.topic, attempt.personalizationContext.skills);
  current.answerText = String(answerText || '');
  current.answeredAt = new Date();
  current.answerTimeMs = answerTimeMs ?? null;
  current.analysis = analysis;

  if (attempt.questions.length >= attempt.totalQuestions) {
    await finalize(attempt);
    return { finished: true, report: attempt.report };
  }

  const askedTexts = new Set(attempt.questions.map((q) => q.questionText));

  const followUpText = generateFollowUp({
    questionText: current.questionText,
    topic: current.topic,
    answerText,
    analysis,
    alreadyFollowedUp: current.isFollowUp,
  });

  let nextEntry = null;
  if (followUpText && !askedTexts.has(followUpText)) {
    nextEntry = { index: attempt.questions.length, questionText: followUpText, topic: current.topic, isFollowUp: true, followUpOfIndex: current.index };
  } else {
    // Pull the next question from the personalization pool, rebuilt from
    // the same inputs but excluding everything asked in this attempt plus
    // this candidate's full prior history — pure function, cheap to redo.
    const pool = buildQuestionPool(
      {
        skills: attempt.personalizationContext.skills,
        areaOfInterest: attempt.personalizationContext.areaOfInterest,
        careerObjective: attempt.personalizationContext.careerObjective,
        certifications: attempt.personalizationContext.certifications,
        experienceLevel: attempt.personalizationContext.experienceLevel,
      },
      [...attempt.priorHistoryQuestionTexts, ...askedTexts]
    );
    const next = pool[0] || (askedTexts.has(CLOSING_QUESTION) ? null : { questionText: CLOSING_QUESTION, topic: 'closing' });
    if (next) {
      nextEntry = { index: attempt.questions.length, questionText: next.questionText, topic: next.topic, isFollowUp: false };
    }
  }

  if (!nextEntry) {
    await finalize(attempt);
    return { finished: true, report: attempt.report };
  }

  attempt.questions.push(nextEntry);
  await attempt.save();

  return { finished: false, question: publicQuestion(attempt, nextEntry) };
}

async function finishInterview(attemptId, candidateId) {
  const attempt = await loadOwnedAttempt(attemptId, candidateId);
  if (attempt.status !== 'in_progress') return attempt;
  return finalize(attempt);
}

async function getResult(attemptId, candidateId) {
  const attempt = await loadOwnedAttempt(attemptId, candidateId);
  if (attempt.status === 'in_progress') throw new ApiError(409, 'Interview is still in progress');
  return attempt;
}

module.exports = { startInterview, getCurrentQuestion, submitAnswer, finishInterview, getResult, loadOwnedAttempt };
