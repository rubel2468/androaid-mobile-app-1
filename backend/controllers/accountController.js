/**
 * controllers/accountController.js
 * Financial accounting and transaction management
 */

const Transaction = require('../models/Transaction');

// @desc    Add new transaction (income / expense)
// @route   POST /api/accounts/transaction
// @access  Private
exports.addTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, description, reference, date } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Type, category and amount are required.',
      });
    }

    const transaction = await Transaction.create({
      type,
      category,
      amount: Number(amount),
      description,
      reference,
      invoiceNumber: reference || `TXN-${Date.now().toString(36).toUpperCase()}`,
      date: date || new Date(),
      createdBy: req.user ? req.user.id : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transactions with filtering and pagination
// @route   GET /api/accounts/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('createdBy', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get account summary (Total income, expense, balance)
// @route   GET /api/accounts/summary
// @access  Private
exports.getSummary = async (req, res, next) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    stats.forEach((item) => {
      if (item._id === 'income') totalIncome = item.total;
      if (item._id === 'expense') totalExpense = item.total;
    });

    const netProfit = totalIncome - totalExpense;

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netProfit,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly report for income and expense
// @route   GET /api/accounts/monthly-report
// @access  Private
exports.getMonthlyReport = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const report = months.map((month, index) => {
      const monthNum = index + 1;
      const incomeEntry = monthlyData.find(
        (d) => d._id.month === monthNum && d._id.type === 'income'
      );
      const expenseEntry = monthlyData.find(
        (d) => d._id.month === monthNum && d._id.type === 'expense'
      );

      const income = incomeEntry ? incomeEntry.total : 0;
      const expense = expenseEntry ? expenseEntry.total : 0;

      return {
        month,
        monthNumber: monthNum,
        income,
        expense,
        profit: income - expense,
      };
    });

    res.json({
      success: true,
      year,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Comprehensive Financial Report (Revenue, COGS, Expenses, Net Profit, Receivables, Stock Value)
// @route   GET /api/accounts/financial-report
// @access  Private
exports.getFinancialReport = async (req, res, next) => {
  try {
    const SalesOrder = require('../models/SalesOrder');
    const PurchaseOrder = require('../models/PurchaseOrder');
    const Customer = require('../models/Customer');
    const Product = require('../models/Product');

    const [salesAgg, purchaseAgg, expensesAgg, customerAgg, productAgg, expenseCategories] = await Promise.all([
      SalesOrder.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            paidRevenue: { $sum: '$paidAmount' },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      PurchaseOrder.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { type: 'expense' } },
        {
          $group: {
            _id: null,
            totalOperatingExpenses: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Customer.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalReceivables: { $sum: '$balance' },
            creditCustomersCount: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } },
          },
        },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalStockCost: { $sum: { $multiply: ['$stockQuantity', '$costPrice'] } },
            totalStockRetail: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
            totalUnits: { $sum: '$stockQuantity' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { type: 'expense' } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalRevenue = salesAgg[0]?.totalRevenue || 0;
    const paidRevenue = salesAgg[0]?.paidRevenue || 0;
    const totalPurchases = purchaseAgg[0]?.totalPurchases || 0;
    const grossProfit = totalRevenue - totalPurchases;
    const totalOperatingExpenses = expensesAgg[0]?.totalOperatingExpenses || 0;
    const netProfit = grossProfit - totalOperatingExpenses;

    const totalStockCost = productAgg[0]?.totalStockCost || 0;
    const totalStockRetail = productAgg[0]?.totalStockRetail || 0;
    const totalReceivables = customerAgg[0]?.totalReceivables || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          paidRevenue,
          totalPurchases,
          grossProfit,
          totalOperatingExpenses,
          netProfit,
          totalStockCost,
          totalStockRetail,
          totalReceivables,
          creditCustomersCount: customerAgg[0]?.creditCustomersCount || 0,
        },
        expenseCategories: expenseCategories.map((c) => ({
          category: c._id || 'General',
          amount: c.total,
          count: c.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Daily Sales vs. Actual Cash Collection Tracking
// @route   GET /api/accounts/daily-summary
// @access  Private
exports.getDailySummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const SalesOrder = require('../models/SalesOrder');

    // 1. All Sales Orders created on this day
    const dayOrders = await SalesOrder.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    }).populate('customer', 'customerId name phone');

    let dailySalesTotal = 0;
    let dailySalesCashCollected = 0;
    let dailyDueSales = 0;

    for (const ord of dayOrders) {
      dailySalesTotal += (ord.totalAmount || 0);
      dailySalesCashCollected += (ord.paidAmount || 0);
      const due = Math.max(0, (ord.totalAmount || 0) - (ord.paidAmount || 0));
      dailyDueSales += due;
    }

    // 2. All Due Collections received on this day (via pay-due)
    const dayDueCollections = await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      category: 'Customer Due Payment',
    }).populate('customer', 'customerId name phone');

    let dailyPreviousDuesCollected = 0;
    for (const txn of dayDueCollections) {
      dailyPreviousDuesCollected += (txn.amount || 0);
    }

    // 3. Total Cash / Money collected today
    const totalCashCollectedToday = dailySalesCashCollected + dailyPreviousDuesCollected;

    // 4. All Bank Deposits made on this day
    const dayBankDeposits = await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      category: 'Bank Deposit',
    }).populate('createdBy', 'name');

    let totalBankDepositedToday = 0;
    for (const dep of dayBankDeposits) {
      totalBankDepositedToday += (dep.amount || 0);
    }

    // 5. Remaining Net Cash in Hand for today after bank deposits
    const netCashInHandToday = Math.max(0, totalCashCollectedToday - totalBankDepositedToday);

    // 6. Cumulative / All-Time undeposited cash in drawer
    const [allCashInflow, allBankDeposited] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { category: 'Bank Deposit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const cumulativeCashInflow = allCashInflow[0]?.total || 0;
    const cumulativeBankDeposited = allBankDeposited[0]?.total || 0;
    const allTimeRemainingCash = Math.max(0, cumulativeCashInflow - cumulativeBankDeposited);

    res.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        dailySalesTotal,
        dailyOrdersCount: dayOrders.length,
        dailySalesCashCollected,
        dailyDueSales,
        dailyPreviousDuesCollected,
        totalCashCollectedToday,
        totalBankDepositedToday,
        netCashInHandToday,
        allTimeRemainingCash,
        cumulativeBankDeposited,
        dayOrders,
        dayDueCollections,
        dayBankDeposits,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Day-wise Bank Deposit (Deducts from Cash Collection)
// @route   POST /api/accounts/bank-deposit
// @access  Private
exports.recordBankDeposit = async (req, res, next) => {
  try {
    const { amount, bankName, accountNumber, depositSlip, date, notes } = req.body;
    const depAmount = Number(amount);

    if (isNaN(depAmount) || depAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid deposit amount is required.' });
    }

    if (!bankName || !String(bankName).trim()) {
      return res.status(400).json({ success: false, message: 'Bank name is required.' });
    }

    const slip = (depositSlip || `SLIP-${Date.now().toString(36).toUpperCase()}`).trim();
    const cleanBank = String(bankName).trim();
    const cleanAccount = (accountNumber || '').trim();

    const transaction = await Transaction.create({
      type: 'expense',
      category: 'Bank Deposit',
      amount: depAmount,
      bankName: cleanBank,
      accountNumber: cleanAccount,
      depositSlip: slip,
      reference: slip,
      invoiceNumber: slip,
      description: `Bank Deposit to ${cleanBank}${cleanAccount ? ` (A/C: ${cleanAccount})` : ''} - Slip: ${slip}${notes ? ` - ${notes}` : ''}`,
      date: date ? new Date(date) : new Date(),
      createdBy: req.user ? req.user._id : undefined,
    });

    res.status(201).json({
      success: true,
      message: `৳${depAmount.toLocaleString()} deposited to ${cleanBank}. Cash collection updated.`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unified All-Reports Data for Printing & PDF Export
// @route   GET /api/accounts/reports/data
// @access  Private
exports.getAllReportsData = async (req, res, next) => {
  try {
    const { type = 'all', date, startDate, endDate } = req.query;

    const SalesOrder = require('../models/SalesOrder');
    const Product = require('../models/Product');
    const Customer = require('../models/Customer');
    const PurchaseOrder = require('../models/PurchaseOrder');

    const result = {};

    // 0. Daily Sales vs Cash Collection Summary
    if (type === 'all' || type === 'daily') {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayOrders = await SalesOrder.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
      }).populate('customer', 'customerId name phone');

      let dailySalesTotal = 0;
      let dailySalesCashCollected = 0;
      let dailyDueSales = 0;
      for (const ord of dayOrders) {
        dailySalesTotal += (ord.totalAmount || 0);
        dailySalesCashCollected += (ord.paidAmount || 0);
        dailyDueSales += Math.max(0, (ord.totalAmount || 0) - (ord.paidAmount || 0));
      }

      const dayDueCollections = await Transaction.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        category: 'Customer Due Payment',
      }).populate('customer', 'customerId name phone');

      let dailyPreviousDuesCollected = 0;
      for (const txn of dayDueCollections) {
        dailyPreviousDuesCollected += (txn.amount || 0);
      }

      const totalCashCollectedToday = dailySalesCashCollected + dailyPreviousDuesCollected;

      const dayBankDeposits = await Transaction.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        category: 'Bank Deposit',
      }).populate('createdBy', 'name');

      let totalBankDepositedToday = 0;
      for (const dep of dayBankDeposits) {
        totalBankDepositedToday += (dep.amount || 0);
      }

      const netCashInHandToday = Math.max(0, totalCashCollectedToday - totalBankDepositedToday);

      result.daily = {
        date: startOfDay.toISOString().split('T')[0],
        dailySalesTotal,
        dailyOrdersCount: dayOrders.length,
        dailySalesCashCollected,
        dailyDueSales,
        dailyPreviousDuesCollected,
        totalCashCollectedToday,
        totalBankDepositedToday,
        netCashInHandToday,
        orders: dayOrders,
        bankDeposits: dayBankDeposits,
      };
    }

    // 1. Dues Report (All customers with outstanding balance)
    if (type === 'all' || type === 'dues') {
      const dueCustomers = await Customer.find({ balance: { $gt: 0 } })
        .sort({ balance: -1 })
        .select('customerId name phone address city customerType creditLimit balance');

      const totalReceivables = dueCustomers.reduce((sum, c) => sum + (c.balance || 0), 0);

      result.dues = {
        count: dueCustomers.length,
        totalReceivables,
        customers: dueCustomers,
      };
    }

    // 2. Stock / Inventory Valuation Report
    if (type === 'all' || type === 'stock') {
      const products = await Product.find({ isActive: true })
        .populate('category', 'name')
        .sort({ name: 1 });

      let totalStockUnits = 0;
      let totalCostValue = 0;
      let totalRetailValue = 0;

      const productList = products.map((p) => {
        const costVal = (p.stockQuantity || 0) * (p.costPrice || 0);
        const retailVal = (p.stockQuantity || 0) * (p.sellingPrice || 0);
        totalStockUnits += (p.stockQuantity || 0);
        totalCostValue += costVal;
        totalRetailValue += retailVal;

        return {
          _id: p._id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || 'General',
          stockQuantity: p.stockQuantity,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          totalCostValue: costVal,
          totalRetailValue: retailVal,
          projectedProfit: retailVal - costVal,
        };
      });

      result.stock = {
        totalProducts: products.length,
        totalStockUnits,
        totalCostValue,
        totalRetailValue,
        projectedGrossProfit: totalRetailValue - totalCostValue,
        products: productList,
      };
    }

    // 3. Profit & Loss / Financial Summary
    if (type === 'all' || type === 'pnl') {
      const [salesAgg, purchaseAgg, expensesAgg, expenseCategories] = await Promise.all([
        SalesOrder.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
              paidRevenue: { $sum: '$paidAmount' },
              totalOrders: { $sum: 1 },
            },
          },
        ]),
        PurchaseOrder.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: null,
              totalPurchases: { $sum: '$totalAmount' },
              count: { $sum: 1 },
            },
          },
        ]),
        Transaction.aggregate([
          { $match: { type: 'expense', category: { $ne: 'Bank Deposit' } } },
          {
            $group: {
              _id: null,
              totalOperatingExpenses: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]),
        Transaction.aggregate([
          { $match: { type: 'expense', category: { $ne: 'Bank Deposit' } } },
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const totalRevenue = salesAgg[0]?.totalRevenue || 0;
      const cogs = purchaseAgg[0]?.totalPurchases || 0;
      const grossProfit = totalRevenue - cogs;
      const operatingExpenses = expensesAgg[0]?.totalOperatingExpenses || 0;
      const netProfit = grossProfit - operatingExpenses;

      result.pnl = {
        totalRevenue,
        cogs,
        grossProfit,
        operatingExpenses,
        netProfit,
        operatingMarginPercent: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        expenseCategories: expenseCategories.map((c) => ({
          category: c._id || 'General',
          amount: c.total,
          count: c.count,
        })),
      };
    }

    // 4. Bank Deposits Report
    if (type === 'all' || type === 'bank') {
      const deposits = await Transaction.find({ category: 'Bank Deposit' })
        .sort({ date: -1 })
        .limit(100)
        .populate('createdBy', 'name');

      const totalDeposited = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);

      result.bank = {
        count: deposits.length,
        totalDeposited,
        deposits,
      };
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
