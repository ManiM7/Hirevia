const express = require('express');
const { requireAuth, requirePasswordChanged } = require('../middleware/auth');
const connectionController = require('../controllers/connectionController');

const router = express.Router();

// Both candidates and recruiters use this router — each handler enforces
// its own role requirement (a recruiter sends requests/schedules, a
// candidate responds/submits availability, either party can cancel).
router.use(requireAuth, requirePasswordChanged);

router.post('/', connectionController.create);
router.get('/', connectionController.list);
router.get('/:id', connectionController.detail);
router.post('/:id/availability', connectionController.submitAvailability);
router.post('/:id/decline', connectionController.decline);
router.post('/:id/schedule', connectionController.schedule);
router.post('/:id/cancel', connectionController.cancel);

module.exports = router;
