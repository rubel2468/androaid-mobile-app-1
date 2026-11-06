/**
 * routes/attendance.js
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  markAttendance,
  getAttendanceReport,
  getTodayAttendance,
} = require('../controllers/attendanceController');

router.post('/mark', protect, markAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/report', protect, getAttendanceReport);

module.exports = router;
