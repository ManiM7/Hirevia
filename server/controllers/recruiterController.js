const mongoose = require('mongoose');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateCandidateSummary } = require('../services/candidateSummaryService');
const { streamResumeForCandidate } = require('./resumeController');
const RecruiterProfile = require('../models/RecruiterProfile');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseIntOr(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatOr(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

const search = asyncHandler(async (req, res) => {
  const {
    skills: skillsParam,
    location,
    experienceMin,
    experienceMax,
    atsMin,
    assessmentMin,
    role,
    q,
    sortBy,
    order,
  } = req.query;

  const page = Math.max(1, parseIntOr(req.query.page, 1));
  const limit = Math.min(50, Math.max(1, parseIntOr(req.query.limit, 20)));

  const requestedSkills = skillsParam
    ? String(skillsParam)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const match = {};

  if (requestedSkills.length > 0) {
    match.skills = {
      $in: requestedSkills.map((s) => new RegExp(escapeRegex(s), 'i')),
    };
  }
  if (location) {
    match.location = new RegExp(escapeRegex(location), 'i');
  }
  if (role) {
    match.$or = [
      { preferredRole: new RegExp(escapeRegex(role), 'i') },
      { currentRole: new RegExp(escapeRegex(role), 'i') },
    ];
  }
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    match.$or = [
      ...(match.$or || []),
      { fullName: re },
      { currentRole: re },
      { preferredRole: re },
      { skills: re },
    ];
  }
  if (experienceMin !== undefined || experienceMax !== undefined) {
    match.yearsOfExperience = {};
    if (experienceMin !== undefined) match.yearsOfExperience.$gte = parseFloatOr(experienceMin, 0);
    if (experienceMax !== undefined) match.yearsOfExperience.$lte = parseFloatOr(experienceMax, 999);
  }
  if (atsMin !== undefined) {
    match.atsScore = { $gte: parseFloatOr(atsMin, 0) };
  }
  if (assessmentMin !== undefined) {
    match.assessmentScore = { $gte: parseFloatOr(assessmentMin, 0) };
  }

  const pipeline = [{ $match: match }];

  if (requestedSkills.length > 0) {
    const lowerRequested = requestedSkills.map((s) => escapeRegex(s.toLowerCase()));
    pipeline.push({
      $addFields: {
        platformMatch: {
          $let: {
            vars: {
              matched: {
                $size: {
                  $filter: {
                    input: '$skills',
                    as: 'skill',
                    // Substring match, same semantics as the $match stage above,
                    // so "node" counts toward matching a candidate's "Node.js".
                    cond: {
                      $anyElementTrue: {
                        $map: {
                          input: lowerRequested,
                          as: 'req',
                          in: { $regexMatch: { input: '$$skill', regex: '$$req', options: 'i' } },
                        },
                      },
                    },
                  },
                },
              },
            },
            in: { $round: [{ $multiply: [{ $divide: ['$$matched', lowerRequested.length] }, 100] }, 0] },
          },
        },
      },
    });
  }

  const sortStage = {};
  const dir = order === 'asc' ? 1 : -1;
  const sortField =
    sortBy === 'atsScore'
      ? 'atsScore'
      : sortBy === 'assessmentScore'
      ? 'assessmentScore'
      : sortBy === 'experience'
      ? 'yearsOfExperience'
      : sortBy === 'lastActive'
      ? 'lastActive'
      : requestedSkills.length > 0
      ? 'platformMatch'
      : 'lastActive';
  sortStage[sortField] = dir;
  if (sortField !== 'lastActive') sortStage.lastActive = -1;
  pipeline.push({ $sort: sortStage });

  pipeline.push({
    $facet: {
      data: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            fullName: 1,
            profilePhoto: 1,
            currentRole: 1,
            location: 1,
            yearsOfExperience: 1,
            experienceLevel: 1,
            skills: 1,
            atsScore: 1,
            assessmentScore: 1,
            assessmentStats: 1,
            profileCompleteness: 1,
            lastActive: 1,
            resume: 1,
            platformMatch: 1,
          },
        },
      ],
      totalCount: [{ $count: 'count' }],
    },
  });

  const [aggResult] = await CandidateProfile.aggregate(pipeline);
  const data = aggResult?.data || [];
  const total = aggResult?.totalCount?.[0]?.count || 0;

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const getCandidateProfile = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid candidate id');

  const profile = await CandidateProfile.findById(req.params.id);
  if (!profile) throw new ApiError(404, 'Candidate not found');

  const InterviewAttempt = require('../models/InterviewAttempt');
  const [resume, atsAnalysis, attempts, latestInterview] = await Promise.all([
    profile.resume ? Resume.findById(profile.resume).select('-rawText') : null,
    profile.latestResumeAnalysis ? ResumeAnalysis.findById(profile.latestResumeAnalysis) : null,
    AssessmentAttempt.find({ candidate: profile._id, status: { $in: ['completed', 'terminated'] } })
      .sort({ createdAt: 1 })
      .select('createdAt status result skills violations terminationReason'),
    profile.latestInterviewAttempt
      ? InterviewAttempt.findById(profile.latestInterviewAttempt).select('createdAt report totalQuestions personalizationContext')
      : null,
  ]);

  const summary = generateCandidateSummary({ profile, atsAnalysis, attempts });

  res.json({
    success: true,
    data: {
      profile,
      resume,
      atsAnalysis,
      assessmentHistory: attempts,
      latestInterview,
      summary,
    },
  });
});

const downloadCandidateResume = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid candidate id');
  const profile = await CandidateProfile.findById(req.params.id);
  if (!profile) throw new ApiError(404, 'Candidate not found');
  await streamResumeForCandidate(profile, res);
});

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await RecruiterProfile.findOne({ user: req.user._id }).populate('company');
  if (!profile) throw new ApiError(404, 'Recruiter profile not found');
  res.json({ success: true, data: profile });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await RecruiterProfile.findOne({ user: req.user._id });
  if (!profile) throw new ApiError(404, 'Recruiter profile not found');
  const { fullName, phone } = req.body;
  if (fullName !== undefined) profile.fullName = fullName;
  if (phone !== undefined) profile.phone = phone;
  profile.lastActive = new Date();
  await profile.save();
  res.json({ success: true, data: profile });
});

module.exports = { search, getCandidateProfile, downloadCandidateResume, getMyProfile, updateMyProfile };
