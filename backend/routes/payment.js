/**
 * routes/payment.js
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  initiateSSLPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIPN,
} = require('../controllers/paymentController');

// User initiates payment
router.post('/initiate', protect, initiateSSLPayment);

// SSLCommerz callbacks
router.post('/success', paymentSuccess);
router.post('/fail', paymentFail);
router.post('/cancel', paymentCancel);
router.post('/ipn', paymentIPN);

module.exports = router;
