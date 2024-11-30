const express = require("express");
const router = express.Router();
const { getRevenueAndProfit, getRevenueAndProfitByDate } = require("../controllers/financeController");

// Định nghĩa route cho việc lấy doanh thu và lợi nhuận
router.get("/revenue-profit", getRevenueAndProfit);
router.get("/revenue-profit-by-date", getRevenueAndProfitByDate);

module.exports = router;
