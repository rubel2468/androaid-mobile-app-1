/**
 * routes/products.js
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  adjustStock,
  getLowStockProducts,
  getStockValuation,
} = require('../controllers/productController');

router.get('/stock-valuation', protect, getStockValuation);
router.get('/low-stock', protect, getLowStockProducts);
router.get('/', protect, getAllProducts);
router.get('/:id', protect, getProductById);
router.post('/', protect, authorize('admin', 'manager'), createProduct);
router.put('/:id', protect, authorize('admin', 'manager'), updateProduct);
router.put('/:id/stock', protect, updateStock);
router.post('/:id/adjust-stock', protect, adjustStock);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
