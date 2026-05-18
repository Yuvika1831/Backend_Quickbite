// backend/routes/adminRoutes.js

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { broadcastUpdate } = require("../webSocket");

const prisma = new PrismaClient();


// ----------------------
// GET all categories
// ----------------------
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});


// ----------------------
// GET all restaurants
// ----------------------
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany();
    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});


// ----------------------
// TOGGLE featured category
// ----------------------
router.post("/featured-categories", async (req, res) => {
  try {
    const { id, isFeatured } = req.body;

    const updated = await prisma.category.update({
      where: {
        id: Number(id),
      },
      data: {
        featured: isFeatured,
      },
    });

    const featuredCategories = await prisma.category.findMany({
      where: {
        featured: true,
      },
    });

    broadcastUpdate("category", featuredCategories);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});


// ----------------------
// TOGGLE featured restaurant
// ----------------------
router.post("/featured-restaurants", async (req, res) => {
  try {
    const { id, isFeatured } = req.body;

    const updated = await prisma.restaurant.update({
      where: {
        id: Number(id),
      },
      data: {
        isFeatured,
      },
    });

    const featuredRestaurants = await prisma.restaurant.findMany({
      where: {
        isFeatured: true,
      },
    });

    broadcastUpdate("restaurant", featuredRestaurants);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});


// ======================================================
// 💎 MEMBERSHIP PLANS
// ======================================================


// ----------------------
// CREATE MEMBERSHIP PLAN (ADMIN)
// ----------------------
router.post("/membership-plans", async (req, res) => {
  try {
    const {
      name,
      price,
      benefits,
      duration,
      discountPercent,
      minOrderAmount,
    } = req.body;

    // validation
    if (
      !name ||
      !price ||
      !duration ||
      discountPercent === undefined ||
      minOrderAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name,
        price: Number(price),
        benefits,
        duration: Number(duration),
        discountPercent: Number(discountPercent),
        minOrderAmount: Number(minOrderAmount),
      },
    });

    res.json({
      success: true,
      message: "Membership plan created successfully",
      plan,
    });
  } catch (err) {
    console.error("CREATE MEMBERSHIP PLAN ERROR:", err);

    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});


// ----------------------
// GET ALL MEMBERSHIP PLANS
// ----------------------
router.get("/membership-plans", async (req, res) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      plans,
    });
  } catch (err) {
    console.error("GET MEMBERSHIP PLANS ERROR:", err);

    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});


// ----------------------
// DELETE MEMBERSHIP PLAN
// ----------------------
router.delete("/membership-plans/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.membershipPlan.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    console.error("DELETE MEMBERSHIP PLAN ERROR:", err);

    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});


module.exports = router;
