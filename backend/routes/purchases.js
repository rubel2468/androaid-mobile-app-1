/**
 * routes/purchases.js
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllOrders,
  getOrderById,
  createOrder,
  receiveOrder,
  updateOrder,
} = require('../controllers/purchaseController');

router.get('/', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, createOrder);
router.put('/:id', protect, updateOrder);
router.put('/:id/receive', protect, receiveOrder);

module.exports = router;
