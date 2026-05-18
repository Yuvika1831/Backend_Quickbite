const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getMe, updateMe, getMyOrders } = require("../controllers/userController");

router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.get("/me/orders", auth, getMyOrders);

module.exports = router;
