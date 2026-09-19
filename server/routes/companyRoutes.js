const express = require('express');
const { requireAuth } = require('../middleware/auth');
const companyController = require('../controllers/companyController');

const router = express.Router();

router.get('/:id', requireAuth, companyController.getById);

module.exports = router;
