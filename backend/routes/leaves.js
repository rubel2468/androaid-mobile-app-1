/**
 * routes/leaves.js
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  applyLeave,
  getLeaves,
  approveLeave,
  rejectLeave,
} = require('../controllers/leaveController');

router.post('/apply', protect, applyLeave);
router.get('/', protect, getLeaves);
router.put('/:id/approve', protect, authorize('admin', 'manager'), approveLeave);
router.put('/:id/reject', protect, authorize('admin', 'manager'), rejectLeave);

module.exports = router;
