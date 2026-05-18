// backend/routes/couponRoutes.js

const express = require("express");
const router = express.Router();

const {
  applyCoupon,
  createCoupon,
  getAllCoupons,
  deleteCoupon,
} = require("../controllers/couponController");

// auth middleware
const protect = require("../middleware/authMiddleware");


// -----------------------------------
// APPLY COUPON (User)
// POST /api/coupons/apply
// -----------------------------------
router.post("/apply", protect, applyCoupon);


// -----------------------------------
// CREATE COUPON (Admin)
// POST /api/coupons/create
// -----------------------------------
router.post("/create", protect, createCoupon);


// -----------------------------------
// GET ALL COUPONS (Admin)
// GET /api/coupons
// -----------------------------------
router.get("/", protect, getAllCoupons);


// -----------------------------------
// DELETE COUPON (Admin)
// DELETE /api/coupons/:id
// -----------------------------------
router.delete("/:id", protect, deleteCoupon);


module.exports = router;
