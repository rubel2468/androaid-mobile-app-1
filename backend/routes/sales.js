/**
 * routes/sales.js
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
} = require('../controllers/salesController');

router.get('/stats', protect, getOrderStats);
router.get('/', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
