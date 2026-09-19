const express = require('express');
const { requireAuth, requireRole, requirePasswordChanged } = require('../middleware/auth');
const { uploadPhoto, uploadResume } = require('../middleware/upload');
const candidateController = require('../controllers/candidateController');
const resumeController = require('../controllers/resumeController');
const assessmentController = require('../controllers/assessmentController');
const interviewController = require('../controllers/interviewController');

const router = express.Router();

router.use(requireAuth, requireRole('candidate'), requirePasswordChanged);

router.get('/profile', candidateController.getProfile);
router.put('/profile', uploadPhoto.single('profilePhoto'), candidateController.updateProfile);

router.post('/resume', uploadResume.single('resume'), resumeController.uploadResume);
router.get('/resume', resumeController.getResume);
router.post('/resume/analyze', resumeController.analyzeResumeHandler);
router.get('/resume/file', resumeController.downloadOwnResume);
router.get('/ats', resumeController.getAts);

router.get('/progress', assessmentController.progress);
router.get('/interviews', interviewController.history);

module.exports = router;
