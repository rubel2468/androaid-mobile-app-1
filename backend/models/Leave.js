/**
 * models/Leave.js
 * Employee leave request model
 */

const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    leaveType: {
      type: String,
      enum: ['sick', 'casual', 'annual', 'maternity'],
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    days: {
      type: Number,
      min: [0.5, 'Leave must be at least half a day'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save: auto-calculate days ───────────────────────────────────────────
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const diffMs = this.endDate - this.startDate;
    this.days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

// ─── Index ────────────────────────────────────────────────────────────────────
leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
