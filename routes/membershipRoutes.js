// backend/routes/membershipRoutes.js

const express = require("express");
const router = express.Router();

const {
  getMembershipPlans,
  buyMembership,
  getMyMembership,
} = require("../controllers/membershipController");

// auth middleware
const protect = require("../middleware/authMiddleware");


// -----------------------------------
// Get all membership plans
// -----------------------------------
router.get("/plans", getMembershipPlans);


// -----------------------------------
// Buy membership (Protected)
// -----------------------------------
router.post("/buy", protect, buyMembership);


// -----------------------------------
// Get current user's active membership
// -----------------------------------
router.get(
  "/my-membership",
  protect,
  getMyMembership
);


module.exports = router;
