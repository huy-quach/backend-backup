const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const momoController = require("../controllers/momoController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Rate limiter to limit callback requests
const callbackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Route to create MoMo payment with validation
router.post(
  "/create-payment",
  authenticateToken,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("userId").notEmpty().withMessage("User ID is required"),
    body("items").isArray().withMessage("Items must be an array"),
  ],
  momoController.createPayment
);

// Route to handle callback (webhook) from MoMo
router.post("/callback", callbackRateLimiter, momoController.handleCallback);

// Route to check payment status with validation
router.post(
  "/check-status",
  authenticateToken,
  [
    body("orderId").notEmpty().withMessage("Order ID is required"),
  ],
  momoController.checkPaymentStatus
);

module.exports = router;
