const prisma = require("../prisma/client");
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔥 helper function (safe AI call with timeout)
async function getAIResponse(modelName, prompt, timeout = 10000) {
  const model = genAI.getGenerativeModel({ model: modelName });
  
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Timeout")), timeout);
  });
  
  const aiPromise = model.generateContent(prompt);
  
  const result = await Promise.race([aiPromise, timeoutPromise]);
  const response = await result.response;
  
  return response.text();
}

exports.chatbot = async (req, res) => {
  try {
    const userMessage = req.body.message || "";
    const userId = req.user?.id;

    // 🔹 1. Get DB data (with error handling)
    let restaurants = [];
    let lastOrder = null;
    
    try {
      restaurants = await prisma.restaurant.findMany({
        include: { menuItems: true }
      });
    } catch (dbError) {
      console.log("DB fetch error:", dbError.message);
    }

    // 🔹 2. Last order (if logged in)
    if (userId) {
      try {
        lastOrder = await prisma.order.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          include: {
            items: { include: { menuItem: true } },
            restaurant: true
          }
        });
      } catch (orderError) {
        console.log("Order fetch error:", orderError.message);
      }
    }

    // 🔹 3. Build AI prompt (shorter = faster)
    const prompt = `
You are QuickBite AI assistant. Be very short and friendly.

Restaurants: ${JSON.stringify(restaurants).slice(0, 2000)}
LastOrder: ${JSON.stringify(lastOrder).slice(0, 500)}

User: ${userMessage}
`;

    // 🔥 4. MODEL FALLBACK SYSTEM (Multiple models)
    const models = [
      "models/gemini-2.0-flash",        // Most stable
      "models/gemini-1.5-flash",        // Backup
      "models/gemini-2.5-flash-lite"    // Lite version
    ];

    let reply = null;
    let lastError = null;

    for (let m of models) {
      try {
        console.log(`🔄 Trying model: ${m}`);
        reply = await getAIResponse(m, prompt, 8000);
        console.log(`✅ Success with model: ${m}`);
        break;
      } catch (err) {
        console.log(`❌ Model failed: ${m}`, err.message);
        lastError = err;
      }
    }

    // 🔥 5. FINAL FALLBACK (no crash ever)
    if (!reply) {
      // Simple rule-based responses as ultimate fallback
      reply = getFallbackResponse(userMessage, restaurants, lastOrder);
    }

    return res.json({ reply });

  } catch (err) {
    console.error("🔥 CHATBOT ERROR:", err);
    
    // Ultimate fallback - always return something
    return res.status(200).json({
      reply: "I'm here! What would you like to order today? 🍔"
    });
  }
};

// 🔥 Ultimate fallback function (no AI required)
function getFallbackResponse(userMessage, restaurants, lastOrder) {
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes("menu") || lowerMsg.includes("food")) {
    if (restaurants.length > 0) {
      const firstRestaurant = restaurants[0];
      const menuItems = firstRestaurant.menuItems?.slice(0, 3) || [];
      if (menuItems.length > 0) {
        return `Here's our menu: ${menuItems.map(i => i.name).join(", ")}. Want to order? 🍽️`;
      }
    }
    return "Check our menu on the homepage! 🍕";
  }
  
  if (lowerMsg.includes("order") && lastOrder) {
    return `Your last order was ${lastOrder.total} rupees. Want to reorder? 🛵`;
  }
  
  if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
    return "Hello! Welcome to QuickBite! What would you like today? 🍔";
  }
  
  return "How can I help you with your order today? 😊";
}
