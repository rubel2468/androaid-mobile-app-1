/**
 * utils/generateOrderNumber.js
 * Unique sequential order number generator
 * Format: SO-2024-0001 (sales), PO-2024-0001 (purchase)
 */

const SalesOrder    = require('../models/SalesOrder');
const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * Generate a unique order number
 * @param {'SO'|'PO'} prefix - Order type prefix
 * @returns {Promise<string>} e.g. "SO-2024-0042"
 */
const generateOrderNumber = async (prefix = 'SO') => {
  const year = new Date().getFullYear();
  const Model = prefix === 'SO' ? SalesOrder : PurchaseOrder;

  // Find the highest-numbered order for this year
  const lastOrder = await Model.findOne({
    orderNumber: new RegExp(`^${prefix}-${year}-`),
  })
    .sort({ orderNumber: -1 })
    .select('orderNumber')
    .lean();

  let sequence = 1;

  if (lastOrder) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    sequence = lastSeq + 1;
  }

  // Zero-pad to 4 digits
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
};

module.exports = generateOrderNumber;
