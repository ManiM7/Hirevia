const express = require('express');
const { body } = require('express-validator');
const { requireAuth, requireRole, requirePasswordChanged } = require('../middleware/auth');
const validate = require('../middleware/validate');
const adminController = require('../controllers/adminController');
const { DIFFICULTIES, QUESTION_TYPES } = require('../models/Question');

const router = express.Router();

router.use(requireAuth, requireRole('admin'), requirePasswordChanged);

router.get('/users', adminController.listUsers);
router.patch('/users/:id/disable', adminController.setUserDisabled);

const questionValidators = [
  body('skill').trim().notEmpty(),
  body('type').isIn(QUESTION_TYPES),
  body('difficulty').isIn(DIFFICULTIES),
  body('question').trim().notEmpty(),
  body('correctAnswer').trim().notEmpty(),
];

router.get('/questions', adminController.listQuestions);
router.post('/questions', validate(questionValidators), adminController.createQuestion);
router.put('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

router.get('/assessments', adminController.listAssessments);
router.get('/assessments/suspicious', adminController.listSuspiciousAssessments);
router.get('/assessments/:id/violations', adminController.getAssessmentViolations);

router.get('/companies', adminController.listCompanies);

module.exports = router;
