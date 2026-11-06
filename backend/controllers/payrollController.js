/**
 * controllers/payrollController.js
 * Monthly payroll generation and processing
 */

const Payroll  = require('../models/Payroll');
const Employee = require('../models/Employee');
const Transaction = require('../models/Transaction');

// ─── POST /api/payroll/generate ───────────────────────────────────────────────
exports.generatePayroll = async (req, res, next) => {
  try {
    const {
      employee: employeeId,
      month,
      year,
      allowances = {},
      deductions = {},
      paymentMethod = 'bank',
      notes,
    } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Check if payroll already generated for this period
    const existing = await Payroll.findOne({ employee: employeeId, month, year });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Payroll for ${employee.name} (${month}/${year}) already exists.`,
      });
    }

    const basicSalary = employee.salary;

    // Calculate total allowances
    const totalAllowances =
      (allowances.houseRent || 0) +
      (allowances.medical   || 0) +
      (allowances.transport || 0) +
      (allowances.other     || 0);

    // Calculate total deductions
    const totalDeductions =
      (deductions.tax       || 0) +
      (deductions.provident || 0) +
      (deductions.other     || 0);

    const netSalary = basicSalary + totalAllowances - totalDeductions;

    const payroll = await Payroll.create({
      employee: employeeId,
      month,
      year,
      basicSalary,
      allowances: {
        houseRent: allowances.houseRent || 0,
        medical:   allowances.medical   || 0,
        transport: allowances.transport || 0,
        other:     allowances.other     || 0,
      },
      deductions: {
        tax:       deductions.tax       || 0,
        provident: deductions.provident || 0,
        other:     deductions.other     || 0,
      },
      netSalary,
      paymentMethod,
      notes,
    });

    const populated = await payroll.populate('employee', 'name department designation');
    res.status(201).json({ success: true, message: 'Payroll generated.', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/payroll ─────────────────────────────────────────────────────────
exports.getPayrolls = async (req, res, next) => {
  try {
    const {
      employee,
      month,
      year,
      status,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};
    if (employee) query.employee = employee;
    if (month)    query.month    = Number(month);
    if (year)     query.year     = Number(year);
    if (status)   query.status   = status;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Payroll.countDocuments(query);

    const payrolls = await Payroll.find(query)
      .populate('employee', 'name department designation')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Total salary in view
    const totalNetSalary = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

    res.json({
      success: true,
      count: payrolls.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      totalNetSalary,
      data:  payrolls,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/payroll/:id/pay ─────────────────────────────────────────────────
exports.processPayment = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate('employee', 'name');
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Payroll already processed.' });
    }

    payroll.status      = 'paid';
    payroll.paymentDate = new Date();
    await payroll.save();

    // Record salary expense transaction
    await Transaction.create({
      type:        'expense',
      category:    'Salary',
      amount:      payroll.netSalary,
      description: `Salary for ${payroll.employee.name} — ${payroll.month}/${payroll.year}`,
      reference:   `PAY-${payroll.employee._id}-${payroll.month}-${payroll.year}`,
      date:        new Date(),
      createdBy:   req.user._id,
    });

    const populated = await payroll.populate('employee', 'name department designation');
    res.json({ success: true, message: 'Payroll payment processed.', data: populated });
  } catch (error) {
    next(error);
  }
};
