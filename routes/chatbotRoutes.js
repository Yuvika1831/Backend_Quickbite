const express = require("express");
const router = express.Router();
const { chatbot } = require("../controllers/chatbotController");
const  auth =require("../middleware/authMiddleware");
// ❌ REMOVE auth for now (warna 401 aayega)
router.post("/", auth,chatbot);

module.exports = router;
