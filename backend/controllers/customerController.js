/**
 * controllers/customerController.js
 * Customer CRUD controller
 */

const Customer = require('../models/Customer');

// ─── GET /api/customers ───────────────────────────────────────────────────────
exports.getAllCustomers = async (req, res, next) => {
  try {
    const {
      search,
      isActive,
      page  = 1,
      limit = 50,
      sort  = '-createdAt',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { customerId: { $regex: search, $options: 'i' } },
        { name:       { $regex: search, $options: 'i' } },
        { phone:      { $regex: search, $options: 'i' } },
        { address:    { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { company:    { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: customers.length,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  customers,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/customers/:id ───────────────────────────────────────────────────
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/customers ──────────────────────────────────────────────────────
exports.createCustomer = async (req, res, next) => {
  try {
    if (!req.body.customerId || !String(req.body.customerId).trim()) {
      const count = await Customer.countDocuments();
      req.body.customerId = `CUST-${String(count + 1001).padStart(4, '0')}`;
    } else {
      req.body.customerId = String(req.body.customerId).trim().toUpperCase();
    }

    try {
      const customer = await Customer.create(req.body);
      return res.status(201).json({ success: true, message: 'Customer created.', data: customer });
    } catch (createErr) {
      if (createErr.code === 11000 && createErr.keyPattern?.customerId) {
        req.body.customerId = `CUST-${Date.now().toString(36).toUpperCase()}`;
        const customer = await Customer.create(req.body);
        return res.status(201).json({ success: true, message: 'Customer created.', data: customer });
      }
      throw createErr;
    }
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/customers/:id ───────────────────────────────────────────────────
exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.json({ success: true, message: 'Customer updated.', data: customer });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/customers/:id ────────────────────────────────────────────────
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.json({ success: true, message: 'Customer deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/customers/:id/balance ───────────────────────────────────────────
exports.updateBalance = async (req, res, next) => {
  try {
    const { amount, operation } = req.body; // operation: 'add' | 'subtract' | 'set'

    if (amount === undefined || amount < 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (operation === 'add')      customer.balance += Number(amount);
    else if (operation === 'subtract') customer.balance -= Number(amount);
    else if (operation === 'set') customer.balance  = Number(amount);
    else return res.status(400).json({ success: false, message: 'Invalid operation.' });

    await customer.save();
    res.json({ success: true, message: 'Balance updated.', data: customer });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/customers/:id/pay-due ──────────────────────────────────────────
exports.payDue = async (req, res, next) => {
  try {
    const { amount, paymentMethod = 'cash', notes } = req.body;
    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    customer.balance = Math.max(0, (customer.balance || 0) - payAmount);
    await customer.save();

    // Record accounting income transaction
    const Transaction = require('../models/Transaction');
    const invoiceNumber = `DUE-PAY-${Date.now().toString(36).toUpperCase()}`;
    await Transaction.create({
      type: 'income',
      category: 'Customer Due Payment',
      amount: payAmount,
      customer: customer._id,
      customerId: customer.customerId,
      description: `Due payment collected from ${customer.name} (${customer.customerId || ''}) via ${paymentMethod}${notes ? ` - ${notes}` : ''}`,
      reference: invoiceNumber,
      invoiceNumber,
      date: new Date(),
      createdBy: req.user ? req.user._id : undefined,
    });

    res.json({
      success: true,
      message: `৳${payAmount.toLocaleString()} payment collected. Remaining due: ৳${customer.balance.toLocaleString()}`,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/customers/:id/ledger ───────────────────────────────────────────
// Customer ID wise Ledger System & Complete History
exports.getCustomerLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    const SalesOrder = require('../models/SalesOrder');
    const Transaction = require('../models/Transaction');

    let customer = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      customer = await Customer.findById(id);
    }
    if (!customer) {
      // Lookup by customerId or phone
      customer = await Customer.findOne({
        $or: [
          { customerId: String(id).toUpperCase() },
          { customerId: String(id) },
          { phone: String(id) },
        ],
      });
    }

    if (!customer) {
      return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
    }

    // 1. Fetch all sales orders for this customer
    const orders = await SalesOrder.find({ customer: customer._id })
      .populate('items.product', 'name sku unit')
      .sort({ createdAt: 1 });

    // 2. Fetch all transactions linked to customer or orders
    const orderNumbers = orders.map((o) => o.orderNumber);
    const transactions = await Transaction.find({
      $or: [
        { customer: customer._id },
        { customerId: customer.customerId },
        { reference: { $in: orderNumbers } },
        { invoiceNumber: { $in: orderNumbers } },
      ],
    }).sort({ date: 1, createdAt: 1 });

    // 3. Construct chronological ledger timeline
    const entries = [];

    for (const order of orders) {
      // Debit entry: The Invoice
      entries.push({
        id: `INV-${order._id}`,
        rawDate: order.createdAt,
        date: order.createdAt,
        type: 'invoice',
        reference: order.orderNumber,
        particulars: `Sales Invoice (${order.items.length} item${order.items.length > 1 ? 's' : ''})`,
        items: order.items.map((it) => ({
          name: it.productName || it.product?.name || 'Item',
          qty: it.qty,
          price: it.price,
          total: it.total,
        })),
        debit: order.totalAmount,
        credit: 0,
        discount: order.discount || 0,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        status: order.status,
      });

      // Credit entry: Initial payment made on this order (if any)
      if ((order.paidAmount || 0) > 0) {
        entries.push({
          id: `PMT-${order._id}`,
          rawDate: new Date(new Date(order.createdAt).getTime() + 1000), // 1 second offset so payment follows invoice
          date: order.createdAt,
          type: 'payment',
          reference: order.transactionId || order.orderNumber,
          particulars: `Payment for ${order.orderNumber} via ${(order.paymentMethod || 'cash').toUpperCase()}`,
          debit: 0,
          credit: order.paidAmount,
          discount: 0,
          paymentStatus: 'paid',
          paymentMethod: order.paymentMethod,
          status: 'completed',
        });
      }

      // If order was cancelled, reverse the debit
      if (order.status === 'cancelled') {
        entries.push({
          id: `CAN-${order._id}`,
          rawDate: order.updatedAt || order.createdAt,
          date: order.updatedAt || order.createdAt,
          type: 'cancellation',
          reference: order.orderNumber,
          particulars: `Order Cancelled - Reversal of ${order.orderNumber}`,
          debit: 0,
          credit: order.totalAmount,
          discount: 0,
          paymentStatus: 'refunded',
          paymentMethod: 'reversal',
          status: 'cancelled',
        });
      }
    }

    // Additional due collections or stand-alone transactions
    for (const txn of transactions) {
      // Skip if this transaction was just the initial sales order payment we already included
      if (orderNumbers.includes(txn.reference) && txn.category === 'Sales') {
        continue;
      }

      entries.push({
        id: `TXN-${txn._id}`,
        rawDate: txn.date || txn.createdAt,
        date: txn.date || txn.createdAt,
        type: 'due_collection',
        reference: txn.reference || txn.invoiceNumber || 'PAYMENT',
        particulars: txn.description || `${txn.category} (Due Collection)`,
        debit: 0,
        credit: txn.amount,
        discount: 0,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        status: 'completed',
      });
    }

    // Sort chronologically ascending to calculate running balance accurately
    entries.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalDiscount = 0;

    for (const item of entries) {
      totalDebit += item.debit;
      totalCredit += item.credit;
      totalDiscount += (item.discount || 0);
      runningBalance += (item.debit - item.credit);
      item.runningBalance = Math.max(0, runningBalance);
    }

    // Return latest first for convenient ledger review in mobile app
    const latestFirstEntries = [...entries].reverse();

    res.json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          customerId: customer.customerId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          customerType: customer.customerType,
          creditLimit: customer.creditLimit,
          balance: customer.balance,
        },
        summary: {
          totalBilled: totalDebit,
          totalPaid: totalCredit,
          totalDiscount,
          currentBalance: customer.balance,
          totalOrders: orders.length,
          totalTransactions: entries.length,
        },
        entries: latestFirstEntries,
      },
    });
  } catch (error) {
    next(error);
  }
};
