const nodemailer = require("nodemailer");

// ✅ USE EMAIL everywhere
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- USER ORDER PLACED ----------------
const sendOrderConfirmationEmail = async (order, email) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL, // ✅ FIXED
      to: email,
      subject: "🧾 Order Placed",
      html: `<h2>Order #${order.id} placed successfully</h2>`,
    });

    console.log("✅ Order placed email sent");
  } catch (err) {
    console.log("❌ Order email failed:", err.message);
  }
};

// ---------------- STATUS EMAIL ----------------
const sendStatusUpdateEmail = async (order, email, type) => {
  try {
    let message = "";

    if (type === "Order Confirmed") {
      message = "✅ Your order has been confirmed and is being prepared.";
    } 
    else if (type === "Preparing") {
      message = "🍳 Your order is being prepared.";
    } 
    else if (type === "Ready to Deliver") {
      message = "🚚 Your order is ready and out for delivery.";
    } 
    else if (type === "Delivered") {
      message = "🎉 Your order has been delivered.";
    } 
    else {
      message = `📦 Order status updated: ${order.status}`;
    }

    await transporter.sendMail({
      from: process.env.EMAIL, // ✅ FIXED
      to: email,
      subject: `Order #${order.id} Update`,
      html: `<h2>${message}</h2>`,
    });

    console.log("✅ Status email sent:", type);
  } catch (err) {
    console.log("❌ Status email failed:", err.message);
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendStatusUpdateEmail,
};
