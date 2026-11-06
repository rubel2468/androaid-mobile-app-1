/**
 * controllers/categoryController.js
 * Category CRUD controller
 */

const Category = require('../models/Category');

// ─── GET /api/categories ──────────────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const { isActive, parent } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (parent !== undefined)   query.parent   = parent === 'null' ? null : parent;

    const categories = await Category.find(query)
      .populate('parent', 'name')
      .sort('name');

    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/categories/:id ──────────────────────────────────────────────────
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent', 'name');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/categories ─────────────────────────────────────────────────────
exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Category created.', data: category });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/categories/:id ──────────────────────────────────────────────────
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('parent', 'name');

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({ success: true, message: 'Category updated.', data: category });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, message: 'Category deleted.' });
  } catch (error) {
    next(error);
  }
};
