const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");

// ✅ GET PROFILE (WITH MEMBERSHIP FIXED)
const getMe = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    // USER BASIC INFO
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // MEMBERSHIP (FIXED SAFE QUERY)
    const membership = await prisma.userMembership.findFirst({
      where: {
        userId,
        endDate: { gte: new Date() },
        status: {
          in: ["active", "Active", "ACTIVE"], // safe match
        },
      },
      include: {
        plan: true,
      },
    });

    return res.json({
      ...user,
      membership: membership || null,
    });
  } catch (err) {
    console.log("GET PROFILE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ UPDATE PROFILE
const updateMe = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const data = {};

    if (name) data.name = name;

    // EMAIL CHECK
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ error: "Email already in use" });
      }

      data.email = email;
    }

    // PASSWORD HASH
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No data to update" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(req.user.id) },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.json(updatedUser);
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ✅ ORDER HISTORY (UNCHANGED BUT SAFE)
const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: Number(req.user.id) },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                name: true,
                price: true,
                image: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(orders);
  } catch (err) {
    console.log("GET ORDERS ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMe,
  updateMe,
  getMyOrders,
};
