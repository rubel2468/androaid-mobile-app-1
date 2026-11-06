/**
 * models/Payment.js
 * Payment gateway transaction records (SSLCommerz, etc.)
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
    },
    orderType: {
      type: String,
      enum: ['sales', 'purchase'],
      required: [true, 'Order type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    method: {
      type: String,
      enum: ['ssl', 'cash', 'bank', 'mobile'],
      default: 'ssl',
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'success', 'failed', 'cancelled'],
      default: 'initiated',
    },
    // Raw gateway response stored for audit/reconciliation
    gatewayData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    currency: {
      type: String,
      default: 'BDT',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Index ────────────────────────────────────────────────────────────────────
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
