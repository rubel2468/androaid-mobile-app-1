/**
 * seed.js
 * Seed initial administrative data, sample products, categories and customers
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const SalesOrder = require('./models/SalesOrder');
const Transaction = require('./models/Transaction');

async function seedData() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected.');

    // 1. Seed Admin User
    await User.deleteMany({ email: { $in: ['rk1769950@gmail.com', 'admin@erp.com'] } });

    await User.create({
      name: 'Rubel Admin',
      email: 'rk1769950@gmail.com',
      password: 'admin123', // Will be hashed once by pre('save')
      role: 'admin',
      phone: '01712345678',
      department: 'Management',
      isActive: true,
    });
    console.log('✅ Admin user created: rk1769950@gmail.com / admin123');

    await User.create({
      name: 'Super Admin',
      email: 'admin@erp.com',
      password: 'admin123', // Will be hashed once by pre('save')
      role: 'admin',
      phone: '01800000000',
      department: 'Operations',
      isActive: true,
    });
    console.log('✅ Secondary Admin created: admin@erp.com / admin123');

    // 2. Seed Categories
    const categories = ['Electronics', 'Clothing', 'Office Supplies', 'Industrial'];
    const catMap = {};
    for (const catName of categories) {
      const catDoc = await Category.findOneAndUpdate(
        { name: catName },
        { name: catName, description: `${catName} category` },
        { upsert: true, new: true }
      );
      catMap[catName] = catDoc._id;
    }
    console.log('✅ Categories seeded.');

    // 3. Seed Sample Products
    const sampleProducts = [
      {
        name: 'Wireless Barcode Scanner 2D',
        sku: 'BC-2001',
        category: catMap['Electronics'],
        costPrice: 2800,
        sellingPrice: 4200,
        stockQuantity: 45,
        minStockLevel: 10,
        unit: 'pcs',
      },
      {
        name: 'Thermal Receipt Printer 80mm',
        sku: 'TP-8002',
        category: catMap['Electronics'],
        costPrice: 4500,
        sellingPrice: 6500,
        stockQuantity: 18,
        minStockLevel: 5,
        unit: 'pcs',
      },
      {
        name: 'Premium Cotton Executive Shirt',
        sku: 'SH-1020',
        category: catMap['Clothing'],
        costPrice: 850,
        sellingPrice: 1650,
        stockQuantity: 120,
        minStockLevel: 25,
        unit: 'pcs',
      },
      {
        name: 'A4 Printing Paper Box (5 Reams)',
        sku: 'PP-4001',
        category: catMap['Office Supplies'],
        costPrice: 1800,
        sellingPrice: 2400,
        stockQuantity: 4, // Trigger low stock alert!
        minStockLevel: 10,
        unit: 'box',
      },
    ];

    for (const prod of sampleProducts) {
      await Product.findOneAndUpdate({ sku: prod.sku }, prod, { upsert: true, new: true });
    }
    console.log('✅ Sample products seeded with low-stock scenario.');

    // 4. Seed Sample Customer
    const customer = await Customer.findOneAndUpdate(
      { phone: '01700112233' },
      {
        name: 'Karim Enterprises',
        email: 'karim@enterprises.com',
        phone: '01700112233',
        address: 'Motijheel C/A, Dhaka',
        company: 'Karim Group',
        creditLimit: 50000,
        balance: 0,
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sample customer seeded.');

    // 5. Seed Sample Supplier
    await Supplier.findOneAndUpdate(
      { phone: '01888990011' },
      {
        name: 'Apex Global Distribution',
        email: 'supply@apexglobal.com',
        phone: '01888990011',
        address: 'Chittagong Port Area',
        company: 'Apex Logistics Ltd.',
        balance: 0,
      },
      { upsert: true, new: true }
    );
    console.log('✅ Sample supplier seeded.');

    // 6. Seed Sample Initial Transaction Ledger
    const existingTrans = await Transaction.countDocuments();
    if (existingTrans === 0) {
      await Transaction.create([
        {
          type: 'income',
          category: 'Sales Revenue',
          amount: 65000,
          description: 'Opening inventory initial retail batch sales',
          reference: 'INIT-REV-01',
          date: new Date(),
        },
        {
          type: 'expense',
          category: 'Office Rent',
          amount: 25000,
          description: 'Monthly office premises rental lease',
          reference: 'RENT-NOV-26',
          date: new Date(),
        },
      ]);
      console.log('✅ Sample financial transactions seeded.');
    }

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedData();
