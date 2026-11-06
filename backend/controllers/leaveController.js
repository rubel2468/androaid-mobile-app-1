/**
 * controllers/leaveController.js
 * Employee leave request management
 */

const Leave    = require('../models/Leave');
const Employee = require('../models/Employee');

// ─── POST /api/leaves/apply ───────────────────────────────────────────────────
exports.applyLeave = async (req, res, next) => {
  try {
    const { employee: employeeId, leaveType, startDate, endDate, reason } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date.' });
    }

    // Check for overlapping leave
    const overlap = await Leave.findOne({
      employee: employeeId,
      status:   { $ne: 'rejected' },
      $or: [
        { startDate: { $lte: end,   $gte: start } },
        { endDate:   { $lte: end,   $gte: start } },
        { startDate: { $lte: start }, endDate: { $gte: end } },
      ],
    });

    if (overlap) {
      return res.status(400).json({ success: false, message: 'Leave request overlaps with an existing leave.' });
    }

    const leave = await Leave.create({
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate:   end,
      reason,
    });

    const populated = await leave.populate('employee', 'name department');
    res.status(201).json({ success: true, message: 'Leave applied.', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/leaves ──────────────────────────────────────────────────────────
exports.getLeaves = async (req, res, next) => {
  try {
    const {
      employee,
      status,
      leaveType,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};
    if (employee)  query.employee  = employee;
    if (status)    query.status    = status;
    if (leaveType) query.leaveType = leaveType;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Leave.countDocuments(query);

    const leaves = await Leave.find(query)
      .populate('employee', 'name department designation')
      .populate('approvedBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: leaves.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  leaves,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/leaves/:id/approve ─────────────────────────────────────────────
exports.approveLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave is already ${leave.status}.` });
    }

    leave.status     = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    const populated = await leave.populate([
      { path: 'employee',   select: 'name department' },
      { path: 'approvedBy', select: 'name' },
    ]);

    res.json({ success: true, message: 'Leave approved.', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/leaves/:id/reject ──────────────────────────────────────────────
exports.rejectLeave = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave is already ${leave.status}.` });
    }

    leave.status          = 'rejected';
    leave.approvedBy      = req.user._id;
    leave.approvedAt      = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    const populated = await leave.populate([
      { path: 'employee',   select: 'name department' },
      { path: 'approvedBy', select: 'name' },
    ]);

    res.json({ success: true, message: 'Leave rejected.', data: populated });
  } catch (error) {
    next(error);
  }
};
