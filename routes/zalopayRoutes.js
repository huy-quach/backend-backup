const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const zalopayController = require("../controllers/zalopayController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Rate limiter to limit callback requests
const callbackRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Route to create ZaloPay payment with validation
router.post(
  "/create-payment",
  authenticateToken,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("userId").notEmpty().withMessage("User ID is required"),
    body("items").isArray().withMessage("Items must be an array"),
  ],
  zalopayController.createPayment
);
// function verifyZaloPaySource(req, res, next) {
//   const allowedIPs = ["LIST_OF_ZALOPAY_IPS"];
//   const requestIP = req.ip;

//   if (allowedIPs.includes(requestIP)) {
//     next();
//   } else {
//     res.status(403).send("Forbidden: Invalid Source IP");
//   }
// }
// Route to handle callback (webhook) from ZaloPay
router.post("/callback",callbackRateLimiter, zalopayController.handleCallback);

// Route to check payment status with validation
router.post(
  "/check-status",
  authenticateToken,
  [
    body("app_trans_id").notEmpty().withMessage("App transaction ID is required"),
  ],
  zalopayController.checkPaymentStatus
);

module.exports = router;
