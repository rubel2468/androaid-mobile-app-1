/**
 * utils/email.js
 * Nodemailer transporter and email sending helpers
 */

const nodemailer = require('nodemailer');

// ─── Create reusable transporter ─────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send a welcome email to a newly registered user
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 */
const sendWelcomeEmail = async (to, name) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"ERP System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to ERP System!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F46E5; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to ERP System!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hello, ${name}!</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            Your account has been successfully created. You can now log in and start managing your business operations.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" 
               style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Login to Dashboard
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">
            If you did not create this account, please ignore this email.
          </p>
        </div>
        <div style="padding: 15px; text-align: center; background: #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ERP System. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${to}:`, error.message);
    // Don't throw — email failure should not block registration
  }
};

/**
 * Send password reset email with a token link
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} resetToken - Password reset token
 */
const sendPasswordResetEmail = async (to, name, resetToken) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"ERP System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #DC2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hello, ${name}!</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            We received a request to reset your password. Click the button below to reset it.
            This link will expire in <strong>1 hour</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">
            Or copy this link: <br />
            <a href="${resetUrl}" style="color: #4F46E5;">${resetUrl}</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px;">
            If you did not request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div style="padding: 15px; text-align: center; background: #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ERP System. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${to}:`, error.message);
    throw new Error('Failed to send password reset email. Please try again.');
  }
};

/**
 * Send order confirmation email to a customer
 * @param {string} to - Customer email
 * @param {string} customerName - Customer name
 * @param {object} order - SalesOrder document
 */
const sendOrderConfirmationEmail = async (to, customerName, order) => {
  const transporter = createTransporter();

  const itemsHTML = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.productName || 'Product'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">৳${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">৳${(item.total || item.price * item.qty).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const mailOptions = {
    from: `"ERP System" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hello, ${customerName}!</h2>
          <p style="color: #6b7280;">Your order <strong>${order.orderNumber}</strong> has been confirmed.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>

          <div style="text-align: right; margin-top: 15px;">
            <p style="color: #6b7280;">Subtotal: <strong>৳${order.subtotal.toFixed(2)}</strong></p>
            ${order.tax > 0 ? `<p style="color: #6b7280;">Tax: <strong>৳${order.tax.toFixed(2)}</strong></p>` : ''}
            ${order.discount > 0 ? `<p style="color: #6b7280;">Discount: <strong>-৳${order.discount.toFixed(2)}</strong></p>` : ''}
            <p style="color: #1f2937; font-size: 18px;">Total: <strong>৳${order.totalAmount.toFixed(2)}</strong></p>
          </div>

          <p style="color: #6b7280; font-size: 13px;">Status: <strong>${order.status.toUpperCase()}</strong></p>
        </div>
        <div style="padding: 15px; text-align: center; background: #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ERP System. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email:`, error.message);
    // Don't throw — email failure should not block order creation
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
};
