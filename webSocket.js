const { Server } = require("socket.io");
const prisma = require("./prisma/client");
const orderController = require("./controllers/orderController");

let io;

const initWebSocket = (server) => {
  if (io) return io;

  // 🔥 Production CORS
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL, "https://quickbite-frontend.onrender.com"].filter(Boolean)
    : ["http://localhost:3000"];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
      transports: ['websocket', 'polling']  // Polling fallback for Render free tier
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    // Send immediate confirmation
    socket.emit("connected", { message: "WebSocket ready", socketId: socket.id });

    // Handle ping from frontend (keep-alive)
    socket.on("ping", () => {
      socket.emit("pong");
    });

    // ---------------- REGISTER ----------------
    socket.on("register", ({ userId, role }) => {
      if (!userId || !role) return;

      socket.userData = { userId, role };

      if (role.toUpperCase() === "VENDOR") {
        socket.join(`vendor_${userId}`);
        console.log(`🏪 Vendor ${userId} joined room`);
      } else if (role.toUpperCase() === "USER") {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined room`);
      }

      socket.emit("registered", { userId, role, status: "success" });
      console.log(`📝 ${role} ${userId} registered`);
    });

    // ---------------- PLACE ORDER ----------------
    socket.on("place-order", async (order) => {
      try {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: order.restaurantId },
          select: { ownerId: true, name: true }
        });

        if (!restaurant) {
          socket.emit("order-error", { message: "Restaurant not found" });
          return;
        }

        const orderWithStatus = {
          ...order,
          status: "Pending",
          restaurantName: restaurant.name,
          receivedAt: new Date().toISOString()
        };

        io.to(`vendor_${restaurant.ownerId}`).emit("order-received", orderWithStatus);
        socket.emit("order-placed", { orderId: order.id, status: "Pending", message: "Order placed!" });

        console.log(`📦 Order ${order.id} sent to vendor ${restaurant.ownerId}`);

      } catch (err) {
        console.error("❌ place-order error:", err);
        socket.emit("order-error", { message: "Failed to place order" });
      }
    });

    // ---------------- UPDATE STATUS ----------------
    socket.on("update-order-status", async (data) => {
      try {
        const { orderId, status } = data;

        if (!orderId || !status) {
          socket.emit("status-error", { message: "Invalid data" });
          return;
        }

        const fakeReq = {
          params: { id: orderId },
          body: { status },
        };

        const fakeRes = {
          json: (response) => {
            if (!response || !response.order) {
              console.log("❌ Invalid response from controller");
              return;
            }

            const order = response.order;
            console.log(`🔄 Order ${orderId} status: ${status}`);

            if (order.userId) {
              io.to(`user_${order.userId}`).emit("order-status-updated", {
                ...order,
                updatedAt: new Date().toISOString()
              });
            }

            if (order.restaurant?.ownerId) {
              io.to(`vendor_${order.restaurant.ownerId}`).emit("order-status-changed", {
                ...order,
                updatedAt: new Date().toISOString()
              });
            }

            socket.emit("status-updated", { orderId, status, success: true });
          },
          status: () => fakeRes,
        };

        await orderController.updateStatus(fakeReq, fakeRes);

      } catch (err) {
        console.error("❌ socket status error:", err);
        socket.emit("status-error", { message: "Failed to update status" });
      }
    });

    // ---------------- DISCONNECT ----------------
    socket.on("disconnect", (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.userData) {
        console.log(`🚪 User ${socket.userData.userId} left`);
      }
    });

    socket.on("error", (error) => {
      console.error(`⚠️ Socket error:`, error);
    });
  });

  console.log("✅ WebSocket initialized");
  return io;
};

module.exports = { initWebSocket };
