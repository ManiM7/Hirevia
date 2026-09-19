const express = require('express');
const { requireAuth, requireRole, requirePasswordChanged } = require('../middleware/auth');
const interviewController = require('../controllers/interviewController');

const router = express.Router();

router.use(requireAuth, requireRole('candidate'), requirePasswordChanged);

router.post('/start', interviewController.start);
router.get('/:id/question', interviewController.getQuestion);
router.post('/:id/answer', interviewController.answer);
router.post('/:id/finish', interviewController.finish);
router.get('/:id/result', interviewController.result);

module.exports = router;
