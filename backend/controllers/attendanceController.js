/**
 * controllers/attendanceController.js
 * Employee attendance tracking controller
 */

const Attendance = require('../models/Attendance');
const Employee   = require('../models/Employee');
const moment     = require('moment');

// ─── POST /api/attendance/mark ────────────────────────────────────────────────
exports.markAttendance = async (req, res, next) => {
  try {
    const { employee: employeeId, action, status, notes } = req.body;
    // action: 'checkin' | 'checkout'

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const today     = moment().startOf('day').toDate();
    const tomorrow  = moment().endOf('day').toDate();

    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lte: tomorrow },
    });

    if (action === 'checkin') {
      if (attendance) {
        return res.status(400).json({ success: false, message: 'Already checked in today.' });
      }

      const checkInTime = new Date();
      const workStartHour = 9; // 9 AM
      const attendanceStatus = checkInTime.getHours() > workStartHour ? 'late' : (status || 'present');

      attendance = await Attendance.create({
        employee:  employeeId,
        date:      today,
        checkIn:   checkInTime,
        status:    attendanceStatus,
        notes,
      });
    } else if (action === 'checkout') {
      if (!attendance) {
        return res.status(400).json({ success: false, message: 'No check-in record found for today.' });
      }

      if (attendance.checkOut) {
        return res.status(400).json({ success: false, message: 'Already checked out today.' });
      }

      attendance.checkOut = new Date();
      if (notes) attendance.notes = notes;
      await attendance.save();
    } else {
      // Manual attendance record (e.g., absent, halfday)
      if (attendance) {
        attendance.status = status || 'absent';
        attendance.notes  = notes;
        await attendance.save();
      } else {
        attendance = await Attendance.create({
          employee: employeeId,
          date:     today,
          status:   status || 'absent',
          notes,
        });
      }
    }

    const populated = await attendance.populate('employee', 'name department');
    res.json({ success: true, message: 'Attendance recorded.', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/attendance/employee/:id ─────────────────────────────────────────
exports.getAttendanceByEmployee = async (req, res, next) => {
  try {
    const { month, year, page = 1, limit = 31 } = req.query;

    const query = { employee: req.params.id };

    if (month && year) {
      const start = moment({ year: Number(year), month: Number(month) - 1 }).startOf('month').toDate();
      const end   = moment({ year: Number(year), month: Number(month) - 1 }).endOf('month').toDate();
      query.date  = { $gte: start, $lte: end };
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Attendance.countDocuments(query);

    const records = await Attendance.find(query)
      .populate('employee', 'name department')
      .sort('-date')
      .skip(skip)
      .limit(Number(limit));

    // Summary
    const summary = {
      present:  records.filter((r) => r.status === 'present').length,
      absent:   records.filter((r) => r.status === 'absent').length,
      late:     records.filter((r) => r.status === 'late').length,
      halfday:  records.filter((r) => r.status === 'halfday').length,
    };

    res.json({ success: true, count: records.length, total, summary, data: records });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/attendance/report ───────────────────────────────────────────────
exports.getAttendanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, department } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate)   dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));

    const attendanceQuery = {};
    if (Object.keys(dateFilter).length) attendanceQuery.date = dateFilter;

    let records = await Attendance.find(attendanceQuery)
      .populate('employee', 'name department designation')
      .sort('-date');

    // Filter by department if provided
    if (department) {
      records = records.filter(
        (r) => r.employee && r.employee.department === department
      );
    }

    const summary = await Attendance.aggregate([
      { $match: attendanceQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({ success: true, count: records.length, summary, data: records });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/attendance/today ────────────────────────────────────────────────
exports.getTodayAttendance = async (req, res, next) => {
  try {
    const today    = moment().startOf('day').toDate();
    const tomorrow = moment().endOf('day').toDate();

    const records = await Attendance.find({
      date: { $gte: today, $lte: tomorrow },
    }).populate('employee', 'name department designation avatar');

    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent:  records.filter((r) => r.status === 'absent').length,
      late:    records.filter((r) => r.status === 'late').length,
      halfday: records.filter((r) => r.status === 'halfday').length,
      total:   records.length,
    };

    res.json({ success: true, summary, data: records });
  } catch (error) {
    next(error);
  }
};
