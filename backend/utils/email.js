const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
};

const orderConfirmationEmail = (order, user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f4f4f4; }
        .order-details { background: white; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Hi ${user.name},</p>
          <p>Thank you for your order! Your order has been received and is being processed.</p>
          <div class="order-details">
            <h3>Order #${order._id}</h3>
            <p><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
          </div>
          <p>We'll send you another email when your order ships.</p>
        </div>
        <div class="footer">
          <p>© 2024 BuyEEasy. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { sendEmail, orderConfirmationEmail };
