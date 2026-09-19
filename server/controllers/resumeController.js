const path = require('path');
const fs = require('fs/promises');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { extractRawText, parseResumeText } = require('../services/resumeParserService');
const { extractSkills } = require('../services/skillExtractionService');
const { analyzeResume } = require('../services/atsAnalysisService');
const { logActivity } = require('../services/activityService');
const Notification = require('../models/Notification');

async function getOwnProfile(userId) {
  const profile = await CandidateProfile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Candidate profile not found');
  return profile;
}

const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A PDF or DOCX resume file is required');

  const profile = await getOwnProfile(req.user._id);
  const fileType = path.extname(req.file.originalname).toLowerCase() === '.pdf' ? 'pdf' : 'docx';

  let rawText;
  try {
    rawText = await extractRawText(req.file.path, fileType);
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(422, 'Could not read this file. Please upload a valid, non-corrupted PDF or DOCX resume.');
  }

  if (!rawText || rawText.trim().length < 30) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(422, 'This resume appears to be empty or unreadable (e.g. a scanned image). Please upload a text-based PDF or DOCX.');
  }

  const parsed = parseResumeText(rawText);
  const skills = extractSkills(`${rawText}\n${parsed.skillsSectionText || ''}`);

  // Replace any previous resume file on disk to avoid orphaned uploads.
  const previousResume = profile.resume ? await Resume.findById(profile.resume) : null;

  const resume = await Resume.create({
    candidate: profile._id,
    originalFilename: req.file.originalname,
    storedFilename: req.file.filename,
    fileType,
    fileSizeBytes: req.file.size,
    rawText,
    parsed: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      summary: parsed.summary,
      skills,
      education: parsed.education,
      experience: parsed.experience,
      projects: parsed.projects,
      certifications: parsed.certifications,
    },
  });

  profile.resume = resume._id;
  profile.skills = skills;
  profile.latestResumeAnalysis = null;
  profile.atsScore = null;
  profile.lastResumeUpdate = new Date();
  profile.recalculateCompleteness();
  await profile.save();

  if (previousResume) {
    const uploadRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', 'resumes');
    await fs.unlink(path.join(uploadRoot, previousResume.storedFilename)).catch(() => {});
    await Resume.deleteOne({ _id: previousResume._id });
  }

  await logActivity(req.user._id, 'RESUME_UPLOADED', { resumeId: resume._id });
  await Notification.create({
    user: req.user._id,
    type: 'RESUME_UPLOADED',
    title: 'Resume uploaded',
    message: `We found ${skills.length} technical skill(s) in your resume. Run the ATS analysis to see your score.`,
  });

  res.status(201).json({ success: true, data: { resume, detectedSkills: skills } });
});

const getResume = asyncHandler(async (req, res) => {
  const profile = await getOwnProfile(req.user._id);
  if (!profile.resume) return res.json({ success: true, data: null });
  const resume = await Resume.findById(profile.resume).select('-rawText');
  res.json({ success: true, data: resume });
});

const analyzeResumeHandler = asyncHandler(async (req, res) => {
  const profile = await getOwnProfile(req.user._id);
  if (!profile.resume) throw new ApiError(400, 'Upload a resume before requesting ATS analysis');

  const resume = await Resume.findById(profile.resume);
  if (!resume) throw new ApiError(404, 'Resume not found');

  const parsedForScoring = {
    name: resume.parsed.name,
    email: resume.parsed.email,
    phone: resume.parsed.phone,
    summary: resume.parsed.summary,
    education: resume.parsed.education,
    experience: resume.parsed.experience,
    projects: resume.parsed.projects,
    certifications: resume.parsed.certifications,
    skillsSectionText: resume.parsed.skills.join(' '),
  };

  const result = analyzeResume(resume.rawText, parsedForScoring);

  const analysis = await ResumeAnalysis.create({
    candidate: profile._id,
    resume: resume._id,
    totalScore: result.totalScore,
    sectionScores: result.sectionScores,
    skills: result.skills,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    missingKeywords: result.missingKeywords,
    recommendations: result.recommendations,
  });

  profile.atsScore = result.totalScore;
  profile.latestResumeAnalysis = analysis._id;
  if (result.skills.length > 0) profile.skills = result.skills;
  profile.recalculateCompleteness();
  await profile.save();

  await logActivity(req.user._id, 'RESUME_ANALYZED', { score: result.totalScore });
  await Notification.create({
    user: req.user._id,
    type: 'RESUME_ANALYZED',
    title: 'Resume analysis complete',
    message: `Your ATS score is ${result.totalScore}/100.`,
  });

  res.json({ success: true, data: analysis });
});

const getAts = asyncHandler(async (req, res) => {
  const profile = await getOwnProfile(req.user._id);
  if (!profile.latestResumeAnalysis) return res.json({ success: true, data: null });
  const analysis = await ResumeAnalysis.findById(profile.latestResumeAnalysis);
  res.json({ success: true, data: analysis });
});

async function streamResumeForCandidate(candidateProfile, res) {
  if (!candidateProfile.resume) throw new ApiError(404, 'This candidate has no resume on file');
  const resume = await Resume.findById(candidateProfile.resume);
  if (!resume) throw new ApiError(404, 'Resume not found');

  const uploadRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', 'resumes');
  const filePath = path.join(uploadRoot, resume.storedFilename);

  const mime = resume.fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.originalFilename)}"`);
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, message: 'Resume file not found on server' });
    }
  });
}

// Candidate downloading/viewing their own resume file.
const downloadOwnResume = asyncHandler(async (req, res) => {
  const profile = await getOwnProfile(req.user._id);
  await streamResumeForCandidate(profile, res);
});

module.exports = { uploadResume, getResume, analyzeResumeHandler, getAts, downloadOwnResume, streamResumeForCandidate };
