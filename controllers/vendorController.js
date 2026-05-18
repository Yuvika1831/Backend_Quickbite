const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * 🧾 Get Vendor Dashboard
 * Fetch vendor's restaurant and menu items
 */
const getVendorDashboard = async (req, res) => {
  try {
    const { vendorId } = req.query;
    if (!vendorId) return res.status(400).json({ error: "Vendor ID required" });

    const vendor = await prisma.user.findUnique({
      where: { id: Number(vendorId) },
      include: {
        restaurants: {
          include: {
            menuItems: true,
            categories: true, // optional, if you track categories
          },
        },
      },
    });

    if (!vendor || vendor.role !== "VENDOR")
      return res.status(404).json({ error: "Vendor not found or not a vendor" });

    res.json({ restaurants: vendor.restaurants });
  } catch (err) {
    console.error("❌ Error fetching vendor dashboard:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🛎 Get Vendor Orders
 */
const getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.query;
    if (!vendorId) return res.status(400).json({ error: "Vendor ID required" });

    const restaurants = await prisma.restaurant.findMany({
      where: { ownerId: Number(vendorId) },
      select: { id: true },
    });

    const restaurantIds = restaurants.map(r => r.id);

    const orders = await prisma.order.findMany({
      where: { restaurantId: { in: restaurantIds } },
      include: {
        items: { include: { menuItem: true } },
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (err) {
    console.error("❌ Error fetching vendor orders:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🍴 Add a new restaurant
 */
const addRestaurant = async (req, res) => {
  try {
    const { ownerId, name, category, image, checkoutTime, description } = req.body;

    if (!ownerId || !name || !category || !image) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingRestaurant = await prisma.restaurant.findFirst({
      where: { ownerId: Number(ownerId) },
    });
    if (existingRestaurant)
      return res.status(400).json({ error: "Vendor already has a restaurant" });

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        description,
        category,
        image,
        checkoutTime: checkoutTime ? Number(checkoutTime) : 30,
        ownerId: Number(ownerId),
      },
    });

    res.status(201).json({ restaurant });
  } catch (err) {
    console.error("❌ Error adding restaurant:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🧆 Add menu item
 */
const addMenuItem = async (req, res) => {
  try {
    const { restaurantId, name, description, price, image } = req.body;

    if (!restaurantId || !name || !description || !price || !image)
      return res.status(400).json({ error: "All fields are required" });

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: Number(price),
        image,
        restaurantId: Number(restaurantId),
      },
    });

    res.status(201).json({ menuItem });
  } catch (err) {
    console.error("❌ Error adding menu item:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✏ Update menu item
 */
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image } = req.body;

    const updateData = { name, description, price: Number(price) };
    if (image) updateData.image = image;

    const updated = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({ updated });
  } catch (err) {
    console.error("❌ Error updating menu item:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🗑 Delete menu item (soft delete)
 */
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItemId = Number(id);

    // Check if menuItem exists
    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) return res.status(404).json({ error: "MenuItem not found" });

    // Delete dependent orderItems first
    await prisma.orderItem.deleteMany({ where: { menuItemId } });

    // Then delete the menuItem
    await prisma.menuItem.delete({ where: { id: menuItemId } });

    res.json({ message: "Menu item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting menu item:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  getVendorDashboard,
  getVendorOrders,
  addRestaurant,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
