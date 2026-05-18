// backend/controllers/membershipController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// -----------------------------------
// GET ALL MEMBERSHIP PLANS
// -----------------------------------
exports.getMembershipPlans = async (req, res) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: { price: "asc" },
    });

    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.log("GET MEMBERSHIP PLANS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch membership plans",
      error: error.message,
    });
  }
};


// -----------------------------------
// BUY MEMBERSHIP
// -----------------------------------
exports.buyMembership = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: Number(planId) },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Membership plan not found",
      });
    }

    // Check active membership
    const existing = await prisma.userMembership.findFirst({
      where: {
        userId,
        status: "active",
        endDate: { gte: new Date() },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have an active membership",
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration);

    const membership = await prisma.userMembership.create({
      data: {
        userId,
        planId: plan.id,
        startDate,
        endDate,
        status: "active",
      },
      include: {
        plan: true, // IMPORTANT → frontend needs discountPercent + minOrderAmount
      },
    });

    return res.status(201).json({
      success: true,
      message: "Membership activated successfully",
      membership,
    });
  } catch (error) {
    console.log("BUY MEMBERSHIP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to purchase membership",
      error: error.message,
    });
  }
};


// -----------------------------------
// GET USER ACTIVE MEMBERSHIP
// -----------------------------------
exports.getMyMembership = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId = req.user.id;

    const membership = await prisma.userMembership.findFirst({
      where: {
        userId,
        status: "active",
        endDate: { gte: new Date() },
      },
      include: {
        plan: true, // 🔥 CRITICAL FOR DISCOUNT LOGIC
      },
    });

    return res.status(200).json({
      success: true,
      membership,
    });
  } catch (error) {
    console.log("GET MY MEMBERSHIP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch membership",
      error: error.message,
    });
  }
};
