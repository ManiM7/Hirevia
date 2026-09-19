const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = { user: req.user._id };
  if (req.query.unreadOnly === 'true') filter.read = false;

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({
    success: true,
    data,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid notification id');
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.json({ success: true, data: notification });
});

module.exports = { list, markRead };
