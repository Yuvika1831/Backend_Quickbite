const express = require("express");
const router = express.Router();
const { signup, login, getCurrentUser } = require("../controllers/authController");

// Existing routes
router.post("/signup", signup);
router.post("/login", login);

// Add /me route
router.get("/me", getCurrentUser);

module.exports = router;
