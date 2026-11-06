/**
 * controllers/salesController.js
 * Sales order management controller
 */

const SalesOrder  = require('../models/SalesOrder');
const Product     = require('../models/Product');
const Customer    = require('../models/Customer');
const Transaction = require('../models/Transaction');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { sendOrderConfirmationEmail } = require('../utils/email');

// ─── GET /api/sales ───────────────────────────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const {
      search,
      status,
      paymentStatus,
      customer,
      startDate,
      endDate,
      page  = 1,
      limit = 20,
      sort  = '-createdAt',
    } = req.query;

    const query = {};

    if (search) {
      const matchingCustomers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { customerId: { $regex: search, $options: 'i' } },
        ]
      }).select('_id').limit(100);
      const custIds = matchingCustomers.map(c => c._id);

      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customer: { $in: custIds } }
      ];
    }

    if (status)        query.status        = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer)      query.customer      = customer;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await SalesOrder.countDocuments(query);

    const orders = await SalesOrder.find(query)
      .populate('customer', 'customerId name email phone address city customerType balance')
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

// ─── GET /api/sales/:id ───────────────────────────────────────────────────────
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('customer', 'customerId name email phone address city customerType balance')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/sales ──────────────────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const {
      customer: customerId,
      items,
      tax       = 0,
      discount  = 0,
      paidAmount = 0,
      paymentMethod,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one item.' });
    }

    // 1. Resolve or find/create customer
    let finalCustomerId = customerId;
    if (!finalCustomerId && (req.body.customerName || req.body.customerPhone)) {
      const phoneClean = (req.body.customerPhone || '').trim();
      const nameClean = (req.body.customerName || '').trim();
      const emailClean = (req.body.customerEmail || '').trim();
      const addressClean = (req.body.customerAddress || req.body.address || '').trim();
      const typeClean = req.body.customerType || 'cash';
      const limitClean = Number(req.body.creditLimit) || 0;

      if (!nameClean) {
        return res.status(400).json({ success: false, message: 'Customer name is required.' });
      }

      let cust = await Customer.findOne({
        $or: [
          ...(phoneClean ? [{ phone: phoneClean }] : []),
          ...(nameClean ? [{ name: nameClean }] : []),
        ],
      });

      if (!cust) {
        const count = await Customer.countDocuments();
        const genId = `CUST-${String(count + 1001).padStart(4, '0')}`;
        cust = await Customer.create({
          customerId: genId,
          name: nameClean,
          phone: phoneClean || '01700000000',
          email: emailClean || undefined,
          address: addressClean || undefined,
          customerType: typeClean,
          creditLimit: limitClean,
        });
      }
      finalCustomerId = cust._id;
    }

    if (!finalCustomerId) {
      return res.status(400).json({ success: false, message: 'Customer is required. Please select or create a customer first.' });
    }

    const customer = await Customer.findById(finalCustomerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found. Please select or register customer first.' });
    }

    // 2. Validate stock & build order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found.` });
      }

      const itemQty = Number(item.qty ?? item.quantity) || 1;
      const itemPrice = Number(item.price ?? item.unitPrice ?? product.sellingPrice) || 0;

      if (product.stockQuantity < itemQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`,
        });
      }

      const itemDiscount = Number(item.discount) || 0;
      const itemTotal    = (itemPrice * itemQty) - itemDiscount;
      subtotal          += itemTotal;

      orderItems.push({
        product:     product._id,
        productName: product.name,
        qty:         itemQty,
        price:       itemPrice,
        discount:    itemDiscount,
        total:       itemTotal,
      });

      // 3. Deduct stock
      product.stockQuantity -= itemQty;
      await product.save();
    }

    // 4. Calculate totals & Discount System (3000 taka beshi hole 2% discount hobe)
    let finalDiscount = Number(discount) || 0;
    if (subtotal > 3000) {
      const autoDiscount = Math.round((subtotal * 0.02) * 100) / 100;
      if (autoDiscount > finalDiscount) {
        finalDiscount = autoDiscount;
      }
    }

    const totalAmount  = Math.max(0, subtotal + Number(tax) - finalDiscount);
    const isCreditSale = req.body.paymentType === 'credit' || paymentMethod === 'credit';
    const actualPaid   = isCreditSale && (req.body.paidAmount === undefined || req.body.paidAmount === null || req.body.paidAmount === '')
      ? 0
      : (req.body.paidAmount !== undefined && req.body.paidAmount !== null && req.body.paidAmount !== ''
          ? Number(req.body.paidAmount)
          : (paymentMethod ? totalAmount : 0));
    const dueAmount    = Math.max(0, totalAmount - actualPaid);

    let paymentStatus = 'pending';
    if (actualPaid >= totalAmount) paymentStatus = 'paid';
    else if (actualPaid > 0)       paymentStatus = 'partial';
    else                           paymentStatus = 'unpaid';

    // If customer had customerType undefined or cash, but made credit purchase, set to credit
    if (dueAmount > 0 && customer.customerType !== 'credit') {
      customer.customerType = 'credit';
    }

    const initialStatus =
      req.body.status ||
      (actualPaid >= totalAmount || paymentMethod === 'cash' || paymentMethod === 'bank'
        ? 'confirmed'
        : 'pending');

    // 5. Generate order number
    const orderNumber = await generateOrderNumber('SO');

    // 6. Create order
    const order = await SalesOrder.create({
      orderNumber,
      customer: finalCustomerId,
      items:    orderItems,
      subtotal,
      tax:      Number(tax),
      discount: finalDiscount,
      totalAmount,
      paidAmount: actualPaid,
      paymentStatus,
      paymentMethod,
      status:   initialStatus,
      notes,
      createdBy: req.user ? req.user._id : undefined,
    });

    // 7. Update customer balance (outstanding due)
    if (dueAmount > 0) {
      customer.balance += dueAmount;
      await customer.save();
    }

    // 8. Record income transaction if paid
    if (Number(paidAmount) > 0) {
      await Transaction.create({
        type:        'income',
        category:    'Sales',
        amount:      Number(paidAmount),
        description: `Payment for order ${orderNumber}`,
        reference:   orderNumber,
        invoiceNumber: orderNumber,
        date:        new Date(),
        createdBy:   req.user ? req.user._id : undefined,
      });
    }

    // 9. Send confirmation email (non-blocking)
    if (customer.email) {
      sendOrderConfirmationEmail(customer.email, customer.name, order);
    }

    const populated = await order.populate('customer', 'customerId name email phone address city customerType balance');
    res.status(201).json({ success: true, message: 'Sales order created.', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/sales/:id/status ────────────────────────────────────────────────
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paidAmount, paymentMethod, transactionId } = req.body;

    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update a cancelled order.' });
    }

    if (status) order.status = status;
    if (transactionId) order.transactionId = transactionId;
    if (paymentMethod) order.paymentMethod = paymentMethod;

    if (req.body.paymentStatus) {
      order.paymentStatus = req.body.paymentStatus;
      if (req.body.paymentStatus === 'paid' && order.paidAmount < order.totalAmount) {
        order.paidAmount = order.totalAmount;
      }
    }

    // Handle partial/full payment updates
    if (paidAmount !== undefined && Number(paidAmount) > 0) {
      const addPaid = Number(paidAmount);
      const newPaid = order.paidAmount + addPaid;
      order.paidAmount = newPaid;

      // Update customer balance
      const customer = await Customer.findById(order.customer);
      if (customer) {
        customer.balance -= addPaid;
        if (customer.balance < 0) customer.balance = 0;
        await customer.save();
      }

      // Record transaction
      await Transaction.create({
        type:        'income',
        category:    'Sales',
        amount:      addPaid,
        description: `Payment for order ${order.orderNumber}`,
        reference:   order.orderNumber,
        date:        new Date(),
        createdBy:   req.user ? req.user._id : undefined,
      });

      if (newPaid >= order.totalAmount) order.paymentStatus = 'paid';
      else if (newPaid > 0)            order.paymentStatus = 'partial';
    } else if (order.paidAmount >= order.totalAmount) {
      order.paymentStatus = 'paid';
    }

    await order.save();
    const updated = await order.populate('customer', 'name email phone');
    res.json({ success: true, message: 'Order updated.', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/sales/:id/cancel ────────────────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found.' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled.' });
    }

    if (['delivered'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled.' });
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.qty },
      });
    }

    // Restore customer balance
    const due = order.totalAmount - order.paidAmount;
    if (due > 0) {
      await Customer.findByIdAndUpdate(order.customer, { $inc: { balance: -due } });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, message: 'Order cancelled and stock restored.', data: order });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/sales/stats ─────────────────────────────────────────────────────
exports.getOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate)   dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));

    const matchStage = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const stats = await SalesOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:         null,
          totalOrders: { $sum: 1 },
          totalRevenue:{ $sum: '$totalAmount' },
          totalPaid:   { $sum: '$paidAmount' },
          totalDue:    { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
        },
      },
    ]);

    const byStatus = await SalesOrder.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      success: true,
      data: {
        summary:  stats[0] || { totalOrders: 0, totalRevenue: 0, totalPaid: 0, totalDue: 0 },
        byStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};
