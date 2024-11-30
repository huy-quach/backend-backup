const { calculateRevenueAndProfit, calculateRevenueAndProfitByDateRange } = require("../services/financeServices.js");

// Hàm lấy doanh thu và lợi nhuận tổng quát
async function getRevenueAndProfit(req, res) {
  try {
    const { totalRevenue, totalCOGS, grossProfit } = await calculateRevenueAndProfit();
    res.json({ revenue: totalRevenue, cogs: totalCOGS, grossProfit: grossProfit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRevenueAndProfitByDate(req, res) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Cần cung cấp startDate và endDate" });
    }

    const result = await calculateRevenueAndProfitByDateRange(startDate, endDate);
    res.json(result);
  } catch (error) {
    console.error("Lỗi trong getRevenueAndProfitByDate:", error);
    res.status(500).json({ error: error.message });
  }
}




module.exports = {
  getRevenueAndProfit,
  getRevenueAndProfitByDate,
};
