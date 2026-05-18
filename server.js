const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config();

const app = express();

// 🔥 PRODUCTION CORS CONFIGURATION
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.FRONTEND_URL, "https://quickbitefrontend-3pdr.onrender.com"].filter(Boolean)
  : ["http://localhost:3000"];

console.log("🔧 Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        console.log("❌ Blocked origin:", origin);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Health check endpoint (for Render)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/restaurants", require("./routes/restaurantRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/vendor", require("./routes/vendorRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/membership", require("./routes/membershipRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/chat", require("./routes/chatbotRoutes"));

app.get("/", (req, res) => {
  res.send("QuickBite Backend is Running!");
});

// Socket Server
const server = http.createServer(app);
const { initWebSocket } = require("./webSocket");
initWebSocket(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
