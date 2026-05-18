const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// -----------------------------------
// APPLY COUPON
// -----------------------------------
exports.applyCoupon = async (req, res) => {
  try {
    const { code, price } = req.body;

    if (!code || !price) {
      return res.status(400).json({
        success: false,
        message: "Coupon code and price are required",
      });
    }

    const coupon = await prisma.coupon.findUnique({
      where: {
        code: code.trim().toUpperCase(),
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "Coupon is inactive",
      });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired",
      });
    }

    // ✅ NEW: min order validation
    if (Number(price) < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ₹${coupon.minOrderAmount} required`,
      });
    }

    const discountAmount =
      (Number(price) * Number(coupon.discount)) / 100;

    const finalPrice = Number(price) - discountAmount;

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      couponCode: coupon.code,
      discountPercent: coupon.discount,
      discountAmount,
      finalPrice,
    });

  } catch (error) {
    console.log("APPLY COUPON ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to apply coupon",
      error: error.message,
    });
  }
};


// -----------------------------------
// CREATE COUPON (ADMIN)
// -----------------------------------
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discount,
      minOrderAmount,
      expiryDate,
    } = req.body;

    if (!code || !discount || !minOrderAmount || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discount: Number(discount),
        minOrderAmount: Number(minOrderAmount),
        expiryDate: new Date(expiryDate),
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      coupon,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// -----------------------------------
// GET ALL COUPONS (ADMIN + USER)
// -----------------------------------
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        expiryDate: {
          gte: new Date(), // only not expired
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      coupons,
    });

  } catch (error) {
    console.log("GET COUPONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// -----------------------------------
// DELETE COUPON (FIXED)
// -----------------------------------
exports.deleteCoupon = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
