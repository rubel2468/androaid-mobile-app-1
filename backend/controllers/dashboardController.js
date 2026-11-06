/**
 * controllers/dashboardController.js
 * Dashboard statistics and analytics
 */

const SalesOrder = require('../models/SalesOrder');
const PurchaseOrder = require('../models/PurchaseOrder');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Employee = require('../models/Employee');
const Transaction = require('../models/Transaction');

// @desc    Get comprehensive dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCustomers,
      totalProducts,
      totalEmployees,
      lowStockCount,
      salesStats,
      purchaseStats,
      stockStats,
      customerDues,
      expenseStats,
      recentSales,
      recentPurchases,
    ] = await Promise.all([
      Customer.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Employee.countDocuments({ isActive: true }),
      Product.countDocuments({
        $expr: { $lte: ['$stockQuantity', '$minStockLevel'] },
        isActive: true,
      }),
      SalesOrder.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            paidRevenue: { $sum: '$paidAmount' },
          },
        },
      ]),
      PurchaseOrder.aggregate([
        {
          $group: {
            _id: null,
            totalExpense: { $sum: '$totalAmount' },
            totalPurchases: { $sum: 1 },
          },
        },
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalStockValue: { $sum: { $multiply: ['$stockQuantity', '$costPrice'] } },
            totalStockRetailValue: { $sum: { $multiply: ['$stockQuantity', '$sellingPrice'] } },
            totalUnits: { $sum: '$stockQuantity' },
          },
        },
      ]),
      Customer.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalDue: { $sum: '$balance' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { type: 'expense' } },
        {
          $group: {
            _id: null,
            totalOperatingExpenses: { $sum: '$amount' },
          },
        },
      ]),
      SalesOrder.find()
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5),
      PurchaseOrder.find()
        .populate('supplier', 'name phone')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    // Calculate last 6 months revenue for chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlySales = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartLabels = [];
    const chartData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      chartLabels.push(monthNames[d.getMonth()]);

      const found = monthlySales.find((item) => item._id.year === y && item._id.month === m);
      chartData.push(found ? Math.round(found.total) : 0);
    }

    const totalRevenue = salesStats[0]?.totalRevenue || 0;
    const totalSalesOrders = salesStats[0]?.totalOrders || 0;
    const totalPurchasesCost = purchaseStats[0]?.totalExpense || 0;
    const totalPurchasesCount = purchaseStats[0]?.totalPurchases || 0;
    const totalStockValue = stockStats[0]?.totalStockValue || 0;
    const totalStockRetailValue = stockStats[0]?.totalStockRetailValue || 0;
    const totalCustomerDue = customerDues[0]?.totalDue || 0;
    const totalOperatingExpenses = expenseStats[0]?.totalOperatingExpenses || 0;
    const netProfit = totalRevenue - totalPurchasesCost - totalOperatingExpenses;

    res.json({
      success: true,
      data: {
        kpi: {
          totalRevenue,
          totalSalesOrders,
          totalPurchasesCost,
          totalPurchasesCount,
          totalCustomers,
          totalProducts,
          totalEmployees,
          lowStockCount,
          totalStockValue,
          totalStockRetailValue,
          totalCustomerDue,
          totalOperatingExpenses,
          netProfit,
        },
        chart: {
          labels: chartLabels,
          datasets: [{ data: chartData.length > 0 ? chartData : [0, 0, 0, 0, 0, 0] }],
        },
        recentSales,
        recentPurchases,
      },
    });
  } catch (error) {
    next(error);
  }
};
