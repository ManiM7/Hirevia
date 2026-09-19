const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(requireAuth, requirePasswordChanged);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
