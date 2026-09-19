const path = require('path');
const fs = require('fs/promises');
const CandidateProfile = require('../models/CandidateProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../services/activityService');
const { uploadDir } = require('../config/env');

const EDITABLE_FIELDS = [
  'fullName',
  'mobile',
  'location',
  'dateOfBirth',
  'highestEducation',
  'experienceLevel',
  'yearsOfExperience',
  'currentRole',
  'preferredRole',
  'preferredLocation',
  'githubProfile',
  'linkedinProfile',
  'skills',
  'gender',
  'areaOfInterest',
  'careerObjective',
];

const VALID_GENDERS = new Set(['male', 'female', 'other']);

const getProfile = asyncHandler(async (req, res) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id }).populate('resume');
  if (!profile) throw new ApiError(404, 'Candidate profile not found');
  res.json({ success: true, data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id });
  if (!profile) throw new ApiError(404, 'Candidate profile not found');

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] === undefined) continue;
    if (field === 'gender') {
      profile.gender = VALID_GENDERS.has(req.body.gender) ? req.body.gender : null;
      continue;
    }
    profile[field] = req.body[field];
  }

  if (req.file) {
    const previousPhoto = profile.profilePhoto;
    profile.profilePhoto = req.file.filename;
    if (previousPhoto) {
      const previousPath = path.join(__dirname, '..', uploadDir, 'photos', previousPhoto);
      await fs.unlink(previousPath).catch(() => {});
    }
  }

  profile.recalculateCompleteness();
  await profile.save();
  await logActivity(req.user._id, 'PROFILE_UPDATED', {});

  res.json({ success: true, data: profile });
});

module.exports = { getProfile, updateProfile };
