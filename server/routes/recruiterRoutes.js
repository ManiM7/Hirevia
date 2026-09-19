const express = require('express');
const { requireAuth, requireRole, requirePasswordChanged } = require('../middleware/auth');
const recruiterController = require('../controllers/recruiterController');
const companyController = require('../controllers/companyController');
const { uploadLogo } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth, requireRole('recruiter'), requirePasswordChanged);

router.get('/profile', recruiterController.getMyProfile);
router.put('/profile', recruiterController.updateMyProfile);

router.get('/company', companyController.getMine);
router.put('/company', uploadLogo.single('companyLogo'), companyController.updateMine);

router.get('/candidates', recruiterController.search);
router.get('/candidates/:id', recruiterController.getCandidateProfile);
router.get('/candidates/:id/resume/file', recruiterController.downloadCandidateResume);

module.exports = router;
