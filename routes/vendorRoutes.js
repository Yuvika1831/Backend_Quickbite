const express = require("express");
const router = express.Router();
const {
  getVendorDashboard,
  getVendorOrders,
  addRestaurant,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/vendorController");

router.get("/dashboard", getVendorDashboard);       // Fetch vendor + restaurant + menu
router.get("/orders", getVendorOrders);            // Fetch all orders for this vendor
router.post("/restaurant", addRestaurant);          // Add restaurant
router.post("/menu", addMenuItem);                  // Add menu item
router.put("/menu/:id", updateMenuItem);            // Update menu item
router.delete("/menu/:id", deleteMenuItem);         // Delete menu item

module.exports = router;
