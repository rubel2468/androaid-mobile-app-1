/**
 * controllers/employeeController.js
 * Employee HR CRUD controller
 */

const Employee = require('../models/Employee');

// ─── GET /api/employees ───────────────────────────────────────────────────────
exports.getAllEmployees = async (req, res, next) => {
  try {
    const {
      search,
      department,
      isActive,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { email:       { $regex: search, $options: 'i' } },
        { department:  { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) query.department = { $regex: department, $options: 'i' };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Employee.countDocuments(query);

    const employees = await Employee.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: employees.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  employees,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
exports.getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/employees ──────────────────────────────────────────────────────
exports.createEmployee = async (req, res, next) => {
  try {
    if (!req.body.phone || !String(req.body.phone).trim()) req.body.phone = '01700000000';
    if (!req.body.department || !String(req.body.department).trim()) req.body.department = 'General';
    if (!req.body.designation || !String(req.body.designation).trim()) req.body.designation = 'Staff';
    if (!req.body.joinDate) req.body.joinDate = new Date();

    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, message: 'Employee created.', data: employee });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ success: false, message: 'An employee with this email already exists.' });
    }
    next(error);
  }
};

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
exports.updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    res.json({ success: true, message: 'Employee updated.', data: employee });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    res.json({ success: true, message: 'Employee deleted.' });
  } catch (error) {
    next(error);
  }
};
