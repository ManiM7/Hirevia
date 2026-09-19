const CandidateProfile = require('../models/CandidateProfile');
const RecruiterProfile = require('../models/RecruiterProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const connectionService = require('../services/connectionService');

async function ownCandidateProfile(userId) {
  const profile = await CandidateProfile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Candidate profile not found');
  return profile;
}

async function ownRecruiterProfile(userId) {
  const profile = await RecruiterProfile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Recruiter profile not found');
  return profile;
}

const create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'recruiter') throw new ApiError(403, 'Only recruiters can send connection requests');
  const recruiterProfile = await ownRecruiterProfile(req.user._id);
  const { candidateId, message } = req.body;
  if (!candidateId) throw new ApiError(422, 'candidateId is required');
  const connection = await connectionService.createConnection(recruiterProfile, candidateId, message);
  res.status(201).json({ success: true, data: connection });
});

const list = asyncHandler(async (req, res) => {
  const profile =
    req.user.role === 'candidate' ? await ownCandidateProfile(req.user._id) : await ownRecruiterProfile(req.user._id);
  const connections = await connectionService.listConnections(profile, req.user.role, req.query.status);
  res.json({ success: true, data: connections });
});

const detail = asyncHandler(async (req, res) => {
  const connection = await connectionService.getConnectionDetail(req.params.id, req.user);
  res.json({ success: true, data: connection });
});

const submitAvailability = asyncHandler(async (req, res) => {
  if (req.user.role !== 'candidate') throw new ApiError(403, 'Only candidates can submit availability');
  const profile = await ownCandidateProfile(req.user._id);
  const { slots, message } = req.body;
  const connection = await connectionService.submitAvailability(req.params.id, profile, slots, message);
  res.json({ success: true, data: connection });
});

const decline = asyncHandler(async (req, res) => {
  if (req.user.role !== 'candidate') throw new ApiError(403, 'Only candidates can decline a connection request');
  const profile = await ownCandidateProfile(req.user._id);
  const connection = await connectionService.declineConnection(req.params.id, profile, req.body.reason);
  res.json({ success: true, data: connection });
});

const schedule = asyncHandler(async (req, res) => {
  if (req.user.role !== 'recruiter') throw new ApiError(403, 'Only recruiters can schedule an interview');
  const profile = await ownRecruiterProfile(req.user._id);
  const { slotId, title } = req.body;
  if (!slotId) throw new ApiError(422, 'slotId is required');
  const connection = await connectionService.scheduleInterview(req.params.id, profile, slotId, title);
  res.json({ success: true, data: connection });
});

const cancel = asyncHandler(async (req, res) => {
  if (!['candidate', 'recruiter'].includes(req.user.role)) throw new ApiError(403, 'Not permitted');
  const connection = await connectionService.cancelConnection(req.params.id, req.user, req.user.role, req.body.reason);
  res.json({ success: true, data: connection });
});

module.exports = { create, list, detail, submitAvailability, decline, schedule, cancel };
