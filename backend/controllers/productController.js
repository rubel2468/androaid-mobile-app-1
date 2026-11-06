/**
 * controllers/productController.js
 * Product/Inventory CRUD controller
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

// ─── GET /api/products ────────────────────────────────────────────────────────
exports.getAllProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      isActive,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};

    // Text search across name, sku, barcode
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { sku:     { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count:   products.length,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      data:    products,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/products/low-stock ─────────────────────────────────────────────
exports.getLowStockProducts = async (req, res, next) => {
  try {
    // Products where stockQuantity <= minStockLevel (MongoDB can't compare two fields in standard query)
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] },
    }).populate('category', 'name');

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/products/:id ────────────────────────────────────────────────────
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/products ───────────────────────────────────────────────────────
exports.createProduct = async (req, res, next) => {
  try {
    const catName =
      (typeof req.body.category === 'string' && req.body.category.trim()) ||
      (req.body.category && req.body.category.name) ||
      'General';

    if (!req.body.category || !mongoose.Types.ObjectId.isValid(req.body.category)) {
      let cat = await Category.findOne({ name: new RegExp(`^${catName}$`, 'i') });
      if (!cat) {
        cat = await Category.create({ name: catName, description: `${catName} category` });
      }
      req.body.category = cat._id;
    }

    const validUnits = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack', 'dozen', 'meter', 'feet'];
    const unitStr = String(req.body.unit || 'pcs').toLowerCase().trim();
    req.body.unit = validUnits.includes(unitStr) ? unitStr : 'pcs';

    if (!req.body.sku) {
      req.body.sku = `SKU-${Date.now().toString(36).toUpperCase()}`;
    }

    const product = await Product.create(req.body);
    const populated = await Product.findById(product._id).populate('category', 'name');
    res.status(201).json({ success: true, message: 'Product created.', data: populated });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists.' });
    }
    next(error);
  }
};

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
exports.updateProduct = async (req, res, next) => {
  try {
    if (req.body.category && !mongoose.Types.ObjectId.isValid(req.body.category)) {
      const catName =
        (typeof req.body.category === 'string' && req.body.category.trim()) ||
        (req.body.category && req.body.category.name) ||
        'General';
      let cat = await Category.findOne({ name: new RegExp(`^${catName}$`, 'i') });
      if (!cat) {
        cat = await Category.create({ name: catName, description: `${catName} category` });
      }
      req.body.category = cat._id;
    }

    if (req.body.unit) {
      const validUnits = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack', 'dozen', 'meter', 'feet'];
      const unitStr = String(req.body.unit).toLowerCase().trim();
      req.body.unit = validUnits.includes(unitStr) ? unitStr : 'pcs';
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product updated.', data: product });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists.' });
    }
    next(error);
  }
};

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/products/:id/stock ──────────────────────────────────────────────
exports.updateStock = async (req, res, next) => {
  try {
    const { action, quantity } = req.body; // action: 'increment' | 'decrement' | 'set'

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (action === 'increment') {
      product.stockQuantity += Number(quantity);
    } else if (action === 'decrement') {
      if (product.stockQuantity < quantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock.' });
      }
      product.stockQuantity -= Number(quantity);
    } else if (action === 'set') {
      product.stockQuantity = Number(quantity);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use increment, decrement, or set.' });
    }

    await product.save();
    res.json({ success: true, message: 'Stock updated.', data: product });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/products/stock-valuation ─────────────────────────────────────────
exports.getStockValuation = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).populate('category', 'name');

    let totalProducts = products.length;
    let totalUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryMap = {};

    products.forEach((p) => {
      const qty = Number(p.stockQuantity) || 0;
      const cost = Number(p.costPrice) || 0;
      const sell = Number(p.sellingPrice) || 0;
      const minLevel = Number(p.minStockLevel) || 10;

      totalUnits += qty;
      totalCostValue += qty * cost;
      totalRetailValue += qty * sell;

      if (qty === 0) outOfStockCount++;
      else if (qty <= minLevel) lowStockCount++;

      const catName = p.category?.name || 'Uncategorized';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, units: 0, costValue: 0, retailValue: 0, count: 0 };
      }
      categoryMap[catName].units += qty;
      categoryMap[catName].costValue += qty * cost;
      categoryMap[catName].retailValue += qty * sell;
      categoryMap[catName].count += 1;
    });

    const potentialProfit = Math.max(0, totalRetailValue - totalCostValue);
    const marginPercent = totalRetailValue > 0 ? ((potentialProfit / totalRetailValue) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalUnits,
        totalCostValue,
        totalRetailValue,
        potentialProfit,
        marginPercent: Number(marginPercent),
        lowStockCount,
        outOfStockCount,
        categories: Object.values(categoryMap),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/products/:id/adjust-stock ──────────────────────────────────────
exports.adjustStock = async (req, res, next) => {
  try {
    const { type = 'add', quantity, reason = 'Inventory audit' } = req.body;
    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid adjustment quantity is required.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const previousQty = product.stockQuantity || 0;
    let newQty = previousQty;

    if (type === 'add') {
      newQty = previousQty + qty;
    } else if (type === 'subtract') {
      if (previousQty < qty) {
        return res.status(400).json({ success: false, message: `Cannot reduce ${qty}. Available stock is only ${previousQty}.` });
      }
      newQty = previousQty - qty;

      // If damaged or expired, record as business loss/expense
      if (/damage|broken|loss|expire|waste/i.test(reason)) {
        const Transaction = require('../models/Transaction');
        const lossAmount = qty * (product.costPrice || 0);
        if (lossAmount > 0) {
          const invoiceNumber = `LOSS-${Date.now().toString(36).toUpperCase()}`;
          await Transaction.create({
            type: 'expense',
            category: 'Damaged Goods / Loss',
            amount: lossAmount,
            description: `Stock damage write-off: ${qty} x ${product.name} (${reason})`,
            reference: invoiceNumber,
            invoiceNumber,
            date: new Date(),
            createdBy: req.user ? req.user._id : undefined,
          });
        }
      }
    } else if (type === 'set') {
      newQty = qty;
    }

    product.stockQuantity = newQty;
    await product.save();

    res.json({
      success: true,
      message: `Stock adjusted for "${product.name}". Previous: ${previousQty}, New: ${newQty}`,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};
