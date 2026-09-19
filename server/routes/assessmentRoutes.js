const express = require('express');
const { body } = require('express-validator');
const { requireAuth, requireRole, requirePasswordChanged } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assessmentController = require('../controllers/assessmentController');
const { VIOLATION_TYPES } = require('../models/TestViolation');

const router = express.Router();

router.use(requireAuth, requireRole('candidate'), requirePasswordChanged);

router.post('/start', assessmentController.start);
router.get('/:id/question', assessmentController.getQuestion);
router.post('/:id/answer', assessmentController.answer);
router.post(
  '/:id/violation',
  validate([body('type').isIn(VIOLATION_TYPES).withMessage('Invalid violation type')]),
  assessmentController.violation
);
router.post('/:id/finish', assessmentController.finish);
router.get('/:id/result', assessmentController.result);

module.exports = router;
