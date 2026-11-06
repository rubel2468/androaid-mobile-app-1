/**
 * models/Employee.js
 * Employee HR model
 */

const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative'],
    },
    joinDate: {
      type: Date,
      required: [true, 'Join date is required'],
    },
    address: {
      type: String,
      trim: true,
    },
    nid: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    bankAccount: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      branchName: { type: String, trim: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Index ────────────────────────────────────────────────────────────────────
employeeSchema.index({ name: 'text', email: 'text', department: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
