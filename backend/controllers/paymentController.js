/**
 * controllers/paymentController.js
 * SSLCommerz Payment Gateway Integration
 */

const axios = require('axios');
const Payment = require('../models/Payment');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');

// @desc    Initiate SSLCommerz payment session
// @route   POST /api/payment/initiate
// @access  Private
exports.initiateSSLPayment = async (req, res, next) => {
  try {
    const { orderId, amount, customerName, customerEmail, customerPhone, customerAddress } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required.',
      });
    }

    const tran_id = `TRAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Create payment record in DB
    const payment = await Payment.create({
      orderId,
      orderType: 'sales',
      amount: Number(amount),
      method: 'ssl',
      transactionId: tran_id,
      status: 'initiated',
    });

    const sslData = new URLSearchParams({
      store_id: process.env.STORE_ID || 'wczep68e90d5632880',
      store_passwd: process.env.STORE_PASSWORD || 'wczep68e90d5632880@ssl',
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: tran_id,
      success_url: process.env.SSL_SUCCESS_URL || 'http://localhost:5000/api/payment/success',
      fail_url: process.env.SSL_FAIL_URL || 'http://localhost:5000/api/payment/fail',
      cancel_url: process.env.SSL_CANCEL_URL || 'http://localhost:5000/api/payment/cancel',
      ipn_url: 'http://localhost:5000/api/payment/ipn',
      shipping_method: 'NO',
      product_name: 'ERP Order ' + orderId,
      product_category: 'ERP Goods',
      product_profile: 'general',
      cus_name: customerName || 'Valued Customer',
      cus_email: customerEmail || 'customer@example.com',
      cus_add1: customerAddress || 'Dhaka, Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: customerPhone || '01700000000',
    });

    try {
      const response = await axios.post(
        'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
        sslData.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      if (response.data && response.data.status === 'SUCCESS') {
        payment.gatewayData = response.data;
        await payment.save();

        return res.json({
          success: true,
          gatewayUrl: response.data.GatewayPageURL,
          transactionId: tran_id,
          sessionkey: response.data.sessionkey,
        });
      } else {
        // Fallback for simulation / mock in development
        return res.json({
          success: true,
          gatewayUrl: `https://sandbox.sslcommerz.com/gwprocess/v4/simulator.php?tran_id=${tran_id}`,
          transactionId: tran_id,
          message: response.data?.failedreason || 'Payment initiated successfully',
        });
      }
    } catch (sslErr) {
      console.warn('SSLCommerz gateway direct call warning:', sslErr.message);
      // Fallback response for offline/sandbox testing
      return res.json({
        success: true,
        gatewayUrl: `https://sandbox.sslcommerz.com/easycheckout/testbox/?tran_id=${tran_id}`,
        transactionId: tran_id,
        simulated: true,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Payment success handler (SSLCommerz POST redirect)
// @route   POST /api/payment/success
// @access  Public
exports.paymentSuccess = async (req, res) => {
  try {
    const { tran_id, val_id, amount, card_type } = req.body;

    const payment = await Payment.findOne({ transactionId: tran_id });
    if (payment) {
      payment.status = 'success';
      payment.gatewayData = req.body;
      await payment.save();

      // Update SalesOrder if applicable
      const salesOrder = await SalesOrder.findOne({ orderNumber: payment.orderId });
      if (salesOrder) {
        salesOrder.status = 'confirmed';
        salesOrder.paymentStatus = 'paid';
        salesOrder.paidAmount = payment.amount;
        salesOrder.transactionId = tran_id;
        salesOrder.paymentMethod = card_type || 'sslcommerz';
        await salesOrder.save();
      }
    }

    // Return HTML or redirect
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #e8f5e9; }
          .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 400px; width: 90%; }
          .icon { font-size: 56px; color: #2e7d32; margin-bottom: 16px; }
          h2 { color: #1b5e20; margin: 0 0 8px; }
          p { color: #555; margin: 6px 0; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #1565c0; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>Payment Successful!</h2>
          <p>Transaction ID: <strong>${tran_id || 'N/A'}</strong></p>
          <p>Amount: <strong>৳${amount || ''}</strong></p>
          <p>Your order payment has been confirmed.</p>
          <a class="btn" href="exp://">Return to App</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Payment success error:', err);
    res.status(500).send('Error processing payment success');
  }
};

// @desc    Payment fail handler
// @route   POST /api/payment/fail
// @access  Public
exports.paymentFail = async (req, res) => {
  try {
    const { tran_id } = req.body;
    if (tran_id) {
      await Payment.findOneAndUpdate(
        { transactionId: tran_id },
        { status: 'failed', gatewayData: req.body }
      );
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffebee; }
          .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 400px; width: 90%; }
          .icon { font-size: 56px; color: #c62828; margin-bottom: 16px; }
          h2 { color: #b71c1c; margin: 0 0 8px; }
          p { color: #555; margin: 6px 0; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #c62828; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">❌</div>
          <h2>Payment Failed</h2>
          <p>The transaction could not be completed.</p>
          <a class="btn" href="exp://">Return to App</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error processing payment failure');
  }
};

// @desc    Payment cancel handler
// @route   POST /api/payment/cancel
// @access  Public
exports.paymentCancel = async (req, res) => {
  try {
    const { tran_id } = req.body;
    if (tran_id) {
      await Payment.findOneAndUpdate(
        { transactionId: tran_id },
        { status: 'cancelled', gatewayData: req.body }
      );
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Cancelled</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff8e1; }
          .card { background: white; padding: 32px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; }
          .icon { font-size: 56px; color: #f57f17; margin-bottom: 16px; }
          h2 { color: #e65100; margin: 0 0 8px; }
          p { color: #555; margin: 6px 0; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f57f17; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚠️</div>
          <h2>Payment Cancelled</h2>
          <p>You have cancelled the transaction.</p>
          <a class="btn" href="exp://">Return to App</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error processing payment cancellation');
  }
};

// @desc    IPN (Instant Payment Notification) listener
// @route   POST /api/payment/ipn
// @access  Public
exports.paymentIPN = async (req, res) => {
  try {
    const { tran_id, status } = req.body;
    if (tran_id && status === 'VALID') {
      await Payment.findOneAndUpdate(
        { transactionId: tran_id },
        { status: 'success', gatewayData: req.body }
      );
    }
    res.status(200).send('IPN received');
  } catch (err) {
    res.status(500).send('IPN error');
  }
};
