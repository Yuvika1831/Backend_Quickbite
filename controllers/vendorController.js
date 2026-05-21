const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   DASHBOARD
========================= */
const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = Number(req.query.vendorId);

    if (!vendorId) {
      return res.status(400).json({
        error: "Vendor ID required",
      });
    }

    const vendor = await prisma.user.findUnique({
      where: {
        id: vendorId,
      },
      include: {
        restaurants: {
          include: {
            menuItems: true,
            categories: true,
          },
        },
      },
    });

    if (!vendor || vendor.role !== "VENDOR") {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    return res.json({
      restaurants: vendor.restaurants,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================
   ANALYTICS
========================= */
const getVendorAnalytics = async (req, res) => {
  try {
    const vendorId = Number(req.query.vendorId);

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID required",
      });
    }

    // =========================
    // GET RESTAURANTS
    // =========================

    const restaurants = await prisma.restaurant.findMany({
      where: {
        ownerId: vendorId,
      },

      select: {
        id: true,
      },
    });

    const restaurantIds = restaurants.map((r) => r.id);

    if (restaurantIds.length === 0) {
      return res.json({
        success: true,

        stats: {
          totalOrders: 0,
          confirmedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
        },

        weeklySales: [],
        orderStatus: [],
        topItems: [],
      });
    }

    // =========================
    // GET ORDERS
    // =========================

    const allOrders = await prisma.order.findMany({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
      },

      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    // =========================
    // STATS
    // =========================

    const totalOrders = allOrders.length;

    const confirmedOrders = allOrders.filter((o) =>
      ["Confirmed", "Preparing"].includes(o.status)
    ).length;

    const deliveredOrders = allOrders.filter((o) =>
      ["Delivered", "Out for Delivery", "Ready to Deliver"].includes(o.status)
    ).length;

    const cancelledOrders = allOrders.filter(
      (o) => o.status === "Cancelled"
    ).length;

    // =========================
    // REVENUE
    // =========================

    const totalRevenue = allOrders
      .filter((o) =>
        ["Delivered", "Ready to Deliver", "Out for Delivery"].includes(o.status)
      )
      .reduce((sum, order) => {
        return sum + Number(order.total || 0);
      }, 0);

    // =========================
    // WEEKLY SALES
    // =========================

    const weekMap = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    allOrders.forEach((order) => {
      if (
        ["Delivered", "Ready to Deliver", "Out for Delivery"].includes(order.status)
      ) {
        const day = new Date(order.createdAt).toLocaleDateString("en-US", {
          weekday: "short",
        });

        weekMap[day] += Number(order.total || 0);
      }
    });

    const weeklySales = Object.keys(weekMap).map((day) => ({
      day,
      revenue: weekMap[day],
    }));

    // =========================
    // TOP ITEMS
    // =========================

    const itemMap = {};

    allOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!item.menuItem) return;

        const itemName = item.menuItem.name;

        itemMap[itemName] =
          (itemMap[itemName] || 0) + Number(item.quantity || 0);
      });
    });

    const topItems = Object.keys(itemMap)
      .map((name) => ({
        name,
        orders: itemMap[name],
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 6);

    // =========================
    // ORDER STATUS
    // =========================

    const orderStatus = [
      {
        name: "Confirmed",
        value: allOrders.filter((o) => o.status === "Confirmed").length,
      },

      {
        name: "Preparing",
        value: allOrders.filter((o) => o.status === "Preparing").length,
      },

      {
        name: "Delivered",
        value: deliveredOrders,
      },
    ].filter((item) => item.value > 0);

    // =========================
    // RESPONSE
    // =========================

    return res.json({
      success: true,

      stats: {
        totalOrders,
        confirmedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
      },

      weeklySales,

      orderStatus,

      topItems,
    });
  } catch (error) {
    console.error("Analytics Error:", error);

    return res.status(500).json({
      success: false,
      message: "Analytics fetch failed",
    });
  }
};

/* =========================
   GET ORDERS
========================= */
const getVendorOrders = async (req, res) => {
  try {
    const vendorId = Number(req.query.vendorId);

    const restaurants = await prisma.restaurant.findMany({
      where: {
        ownerId: vendorId,
      },

      select: {
        id: true,
      },
    });

    const restaurantIds = restaurants.map((r) => r.id);

    if (restaurantIds.length === 0) {
      return res.json({
        orders: [],
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: {
          in: restaurantIds,
        },
      },

      include: {
        items: {
          include: {
            menuItem: true,
          },
        },

        user: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      orders,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================
   ADD RESTAURANT
========================= */
const addRestaurant = async (req, res) => {
  try {
    const {
      ownerId,
      name,
      category,
      image,
      checkoutTime,
      description,
    } = req.body;

    const existing = await prisma.restaurant.findFirst({
      where: {
        ownerId: Number(ownerId),
      },
    });

    if (existing) {
      return res.status(400).json({
        error: "Restaurant already exists",
      });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        description,
        category,
        image,
        checkoutTime: Number(checkoutTime) || 30,
        ownerId: Number(ownerId),
      },
    });

    return res.status(201).json({
      restaurant,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================
   ADD MENU ITEM
========================= */
const addMenuItem = async (req, res) => {
  try {
    const {
      restaurantId,
      name,
      description,
      price,
      image,
    } = req.body;

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: Number(price),
        image,
        restaurantId: Number(restaurantId),
      },
    });

    return res.status(201).json({
      menuItem,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================
   UPDATE MENU ITEM
========================= */
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.menuItem.update({
      where: {
        id: Number(id),
      },

      data: req.body,
    });

    return res.json({
      updated,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================
   DELETE MENU ITEM
========================= */
const deleteMenuItem = async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.orderItem.deleteMany({
      where: {
        menuItemId: id,
      },
    });

    await prisma.menuItem.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================
   EXPORTS
========================= */
module.exports = {
  getVendorDashboard,
  getVendorAnalytics,
  getVendorOrders,
  addRestaurant,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
