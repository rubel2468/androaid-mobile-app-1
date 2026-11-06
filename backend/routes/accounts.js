/**
 * routes/accounts.js
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addTransaction,
  getTransactions,
  getSummary,
  getMonthlyReport,
  getFinancialReport,
  getDailySummary,
  recordBankDeposit,
  getAllReportsData,
} = require('../controllers/accountController');

router.post('/transaction', protect, addTransaction);
router.get('/transactions', protect, getTransactions);
router.get('/summary', protect, getSummary);
router.get('/monthly-report', protect, getMonthlyReport);
router.get('/financial-report', protect, getFinancialReport);
router.get('/daily-summary', protect, getDailySummary);
router.post('/bank-deposit', protect, recordBankDeposit);
router.get('/bank-deposits', protect, getAllReportsData);
router.get('/reports/data', protect, getAllReportsData);

module.exports = router;
