/**
 * models/Payroll.js
 * Monthly payroll model
 */

const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: 0,
    },
    allowances: {
      houseRent: { type: Number, default: 0 },
      medical:   { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      other:     { type: Number, default: 0 },
    },
    deductions: {
      tax:       { type: Number, default: 0 },
      provident: { type: Number, default: 0 },
      other:     { type: Number, default: 0 },
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['bank', 'cash', 'mobile'],
      default: 'bank',
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound index: one payroll record per employee per month/year ───────────
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
