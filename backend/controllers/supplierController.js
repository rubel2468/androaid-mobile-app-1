/**
 * controllers/supplierController.js
 * Supplier CRUD controller
 */

const Supplier = require('../models/Supplier');

// ─── GET /api/suppliers ───────────────────────────────────────────────────────
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const {
      search,
      isActive,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { phone:   { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Supplier.countDocuments(query);

    const suppliers = await Supplier.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: suppliers.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  suppliers,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/suppliers/:id ───────────────────────────────────────────────────
exports.getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/suppliers ──────────────────────────────────────────────────────
exports.createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, message: 'Supplier created.', data: supplier });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/suppliers/:id ───────────────────────────────────────────────────
exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    res.json({ success: true, message: 'Supplier updated.', data: supplier });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/suppliers/:id ────────────────────────────────────────────────
exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }
    res.json({ success: true, message: 'Supplier deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/suppliers/:id/balance ───────────────────────────────────────────
exports.updateBalance = async (req, res, next) => {
  try {
    const { amount, operation } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ success: false, message: 'Amount is required.' });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    if (operation === 'add')           supplier.balance += Number(amount);
    else if (operation === 'subtract') supplier.balance -= Number(amount);
    else if (operation === 'set')      supplier.balance  = Number(amount);
    else return res.status(400).json({ success: false, message: 'Invalid operation.' });

    await supplier.save();
    res.json({ success: true, message: 'Balance updated.', data: supplier });
  } catch (error) {
    next(error);
  }
};
