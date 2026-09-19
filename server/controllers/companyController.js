const mongoose = require('mongoose');
const Company = require('../models/Company');
const RecruiterProfile = require('../models/RecruiterProfile');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid company id');
  const company = await Company.findById(req.params.id);
  if (!company) throw new ApiError(404, 'Company not found');
  res.json({ success: true, data: company });
});

const getMine = asyncHandler(async (req, res) => {
  const recruiter = await RecruiterProfile.findOne({ user: req.user._id }).populate('company');
  if (!recruiter?.company) throw new ApiError(404, 'No company profile yet');
  res.json({ success: true, data: recruiter.company });
});

const EDITABLE_FIELDS = ['name', 'website', 'type', 'location', 'description'];

const updateMine = asyncHandler(async (req, res) => {
  const recruiter = await RecruiterProfile.findOne({ user: req.user._id });
  if (!recruiter?.company) throw new ApiError(404, 'No company profile yet');

  const company = await Company.findById(recruiter.company);
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) company[field] = req.body[field];
  }
  if (req.file) company.logo = req.file.filename;
  await company.save();

  res.json({ success: true, data: company });
});

module.exports = { getById, getMine, updateMine };
