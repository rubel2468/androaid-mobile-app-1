/**
 * routes/payroll.js
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generatePayroll,
  getPayrolls,
  processPayment,
} = require('../controllers/payrollController');

router.post('/generate', protect, authorize('admin', 'manager'), generatePayroll);
router.get('/', protect, getPayrolls);
router.put('/:id/pay', protect, authorize('admin', 'manager'), processPayment);

module.exports = router;
