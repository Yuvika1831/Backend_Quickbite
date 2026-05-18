const prisma = require("../prisma/client");
const { sendStatusUpdateEmail } = require("../utils/emailService");

// --------------------------
// PLACE ORDER (UNCHANGED)
// --------------------------
const placeOrder = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { restaurantId, items, paymentMethod = "COD", deliveryInfo } = req.body;

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid order payload" });
    }

    const total = items.reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
      0
    );

    const order = await prisma.order.create({
      data: {
        userId,
        restaurantId: Number(restaurantId),
        status: "Pending",
        total,
        paymentMethod,
        deliveryName: deliveryInfo?.name,
        deliveryPhone: deliveryInfo?.phone,
        deliveryAddress: deliveryInfo?.address,
      },
    });

    await prisma.orderItem.createMany({
      data: items.map((it) => ({
        orderId: order.id,
        menuItemId: Number(it.menuItemId),
        quantity: Number(it.quantity),
        price: Number(it.price || 0),
      })),
    });

    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: true,
        restaurant: true,
        items: true,
      },
    });

    res.json({
      message: "Order placed successfully",
      order: fullOrder,
    });
  } catch (err) {
    console.error("❌ placeOrder error", err);
    res.status(500).json({ error: err.message });
  }
};

// --------------------------
// GET ORDER (UNCHANGED)
// --------------------------
const getOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        user: true,
        restaurant: true,
      },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error("❌ getOrder error", err);
    res.status(500).json({ error: err.message });
  }
};

// --------------------------
// UPDATE STATUS (FIXED SAFE)
// --------------------------
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    // 🔥 FIX: frontend compatibility mapping
    if (status === "Ready to Deliver") {
      status = "Out for Delivery";
    }

    const allowed = [
      "Confirmed",
      "Preparing",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        user: true,
        restaurant: true,
      },
    });

    // EMAIL LOGIC (UNCHANGED)
    if (order.user?.email) {
      try {
        if (status === "Confirmed") {
          await sendStatusUpdateEmail(order, order.user.email, "Order Confirmed");
        }

        if (status === "Preparing") {
          await sendStatusUpdateEmail(order, order.user.email, "Preparing");
        }

        if (status === "Out for Delivery") {
          await sendStatusUpdateEmail(order, order.user.email, "Ready to Deliver");
        }

        console.log("✅ Status email sent:", status);
      } catch (err) {
        console.log("❌ Email failed:", err.message);
      }
    }

    res.json({
      message: "Status updated",
      order,
    });

  } catch (err) {
    console.error("❌ updateStatus error", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  placeOrder,
  getOrder,
  updateStatus,
};
