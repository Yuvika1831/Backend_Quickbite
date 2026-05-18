const express = require("express");
const prisma = require("../prisma/client");
const router = express.Router();

// ✅ IMPORT CONTROLLER (IMPORTANT)
const { placeOrder, getOrder } = require("../controllers/orderController");


// --------------------------
// ✅ PLACE ORDER (NOW USES CONTROLLER → EMAIL WORKS)
// --------------------------
router.post(
  "/confirm",
  (req, res, next) => {
    // 🔥 Inject userId so controller works properly
    req.user = { id: req.body.userId };
    next();
  },
  placeOrder
);


// --------------------------
// GET ORDER BY ID
// --------------------------
router.get("/:id", getOrder);


module.exports = router
