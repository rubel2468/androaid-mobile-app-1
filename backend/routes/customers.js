/**
 * routes/customers.js
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  payDue,
  getCustomerLedger,
} = require('../controllers/customerController');

router.get('/', protect, getAllCustomers);
router.get('/:id/ledger', protect, getCustomerLedger);
router.get('/ledger/:customerId', protect, getCustomerLedger);
router.get('/:id', protect, getCustomerById);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.post('/:id/pay-due', protect, payDue);
router.delete('/:id', protect, deleteCustomer);

module.exports = router;
