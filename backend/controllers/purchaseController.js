/**
 * controllers/purchaseController.js
 * Purchase order management controller
 */

const PurchaseOrder = require('../models/PurchaseOrder');
const Product       = require('../models/Product');
const Supplier      = require('../models/Supplier');
const Transaction   = require('../models/Transaction');
const generateOrderNumber = require('../utils/generateOrderNumber');

// ─── GET /api/purchases ───────────────────────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const {
      search,
      status,
      paymentStatus,
      supplier,
      startDate,
      endDate,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};

    if (search)        query.orderNumber   = { $regex: search, $options: 'i' };
    if (status)        query.status        = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (supplier)      query.supplier      = supplier;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await PurchaseOrder.countDocuments(query);

    const orders = await PurchaseOrder.find(query)
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: orders.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  orders,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/purchases/:id ───────────────────────────────────────────────────
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/purchases ──────────────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const {
      supplier: supplierId,
      items,
      tax       = 0,
      paidAmount = 0,
      paymentStatus,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one item.' });
    }

    // Resolve supplier or find/create
    let finalSupplierId = supplierId;
    if (!finalSupplierId && (req.body.supplierName || req.body.supplierPhone)) {
      const phoneClean = (req.body.supplierPhone || '').trim();
      const nameClean = (req.body.supplierName || 'General Supplier').trim();

      let supp = await Supplier.findOne({
        $or: [
          ...(phoneClean ? [{ phone: phoneClean }] : []),
          ...(nameClean ? [{ name: nameClean }] : []),
        ],
      });

      if (!supp) {
        supp = await Supplier.create({
          name: nameClean,
          phone: phoneClean || '01700000000',
        });
      }
      finalSupplierId = supp._id;
    }

    // Validate supplier
    const supplier = await Supplier.findById(finalSupplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found. Please provide supplier name or ID.' });
    }

    // Build order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found.` });
      }

      const itemQty = Number(item.qty ?? item.quantity) || 1;
      const itemCost = Number(item.costPrice ?? product.costPrice) || 0;
      const itemTotal = itemCost * itemQty;
      subtotal       += itemTotal;

      orderItems.push({
        product:     product._id,
        productName: product.name,
        qty:         itemQty,
        costPrice:   itemCost,
        total:       itemTotal,
      });
    }

    const totalAmount = subtotal + Number(tax);
    const actualPaid  = Number(paidAmount) || 0;
    const dueAmount   = Math.max(0, totalAmount - actualPaid);

    let pmtStatus = 'pending';
    if (actualPaid >= totalAmount) pmtStatus = 'paid';
    else if (actualPaid > 0)       pmtStatus = 'partial';

    const orderNumber = await generateOrderNumber('PO');

    const order = await PurchaseOrder.create({
      orderNumber,
      supplier: finalSupplierId,
      items:    orderItems,
      subtotal,
      tax:      Number(tax),
      totalAmount,
      paidAmount: actualPaid,
      paymentStatus: paymentStatus || pmtStatus,
      notes,
      createdBy: req.user ? req.user._id : undefined,
      status: 'ordered',
    });

    // Update supplier balance (we owe them)
    if (dueAmount > 0) {
      supplier.balance += dueAmount;
      await supplier.save();
    }

    // Record expense transaction if paid
    if (Number(paidAmount) > 0) {
      await Transaction.create({
        type:        'expense',
        category:    'Purchase',
        amount:      Number(paidAmount),
        description: `Payment for purchase order ${orderNumber}`,
        reference:   orderNumber,
        invoiceNumber: orderNumber,
        date:        new Date(),
        createdBy:   req.user ? req.user._id : undefined,
      });
    }

    const populated = await order.populate('supplier', 'name email phone');
    res.status(201).json({ success: true, message: 'Purchase order created.', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/purchases/:id/receive ──────────────────────────────────────────
exports.receiveOrder = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    if (order.status === 'received') {
      return res.status(400).json({ success: false, message: 'Order is already received.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot receive a cancelled order.' });
    }

    // Update stock for each item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.qty },
      });
    }

    order.status     = 'received';
    order.receivedAt = new Date();
    await order.save();

    res.json({ success: true, message: 'Order received and stock updated.', data: order });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/purchases/:id ───────────────────────────────────────────────────
exports.updateOrder = async (req, res, next) => {
  try {
    const { status, paidAmount, notes } = req.body;

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update a cancelled order.' });
    }

    if (status) order.status = status;
    if (notes)  order.notes  = notes;

    if (paidAmount !== undefined) {
      const newPaid = order.paidAmount + Number(paidAmount);
      order.paidAmount = newPaid;

      // Update supplier balance
      await Supplier.findByIdAndUpdate(order.supplier, { $inc: { balance: -Number(paidAmount) } });

      // Record transaction
      await Transaction.create({
        type:        'expense',
        category:    'Purchase',
        amount:      Number(paidAmount),
        description: `Payment for purchase order ${order.orderNumber}`,
        reference:   order.orderNumber,
        date:        new Date(),
        createdBy:   req.user._id,
      });

      if (newPaid >= order.totalAmount) order.paymentStatus = 'paid';
      else if (newPaid > 0)            order.paymentStatus = 'partial';
    }

    await order.save();
    const updated = await order.populate('supplier', 'name email phone');
    res.json({ success: true, message: 'Purchase order updated.', data: updated });
  } catch (error) {
    next(error);
  }
};
