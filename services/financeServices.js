const Furniture = require("../models/furniture");
const Inventory = require("../models/inventory");
const Order = require("../models/order");

async function calculateRevenueAndProfit() {
  try {
    // Lấy tất cả sản phẩm đang hoạt động (còn bán)
    const products = await Furniture.find({ active: true });

    let totalRevenue = 0;
    let totalCOGS = 0;

    // Lặp qua từng sản phẩm để tính toán
    for (const product of products) {
      const revenue = product.price * product.quantity; // Doanh thu cho sản phẩm này
      totalRevenue += revenue;

      // Tìm thông tin nhập kho của sản phẩm để tính COGS
      const inventoryEntries = await Inventory.find({ product: product._id });

      for (const entry of inventoryEntries) {
        const cogs = entry.costPrice * entry.quantity; // Chi phí vốn hàng bán cho sản phẩm này
        totalCOGS += cogs;
      }
    }

    // Lợi nhuận gộp
    const grossProfit = totalRevenue - totalCOGS;

    // Trả về kết quả
    return {
      totalRevenue,
      totalCOGS,
      grossProfit
    };
  } catch (error) {
    throw new Error("Lỗi khi tính toán: " + error.message);
  }
}
async function calculateRevenueAndProfitByDateRange(startDate, endDate) {
  try {
    // Chuyển đổi ngày bắt đầu và kết thúc thành đối tượng Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Đảm bảo rằng thời gian kết thúc là 23:59:59 (bao gồm cả ngày kết thúc)
    end.setHours(23, 59, 59, 999); // Cập nhật giờ, phút, giây, mili giây

    // Truy vấn với phạm vi ngày đầy đủ
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
    });

    let dailyStats = {};
    let totalRevenue = 0;
    let totalCOGS = 0;

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split("T")[0]; // Chuyển thành định dạng yyyy-mm-dd
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { revenue: 0, cogs: 0, grossProfit: 0 };
      }

      for (const item of order.products) {
        const product = await Furniture.findById(item.product); // Truy vấn chi tiết sản phẩm
        if (product) {
          const price = item.price || product.price; // Nếu `item.price` bị null, dùng `product.price`
          const revenue = price * item.quantity; // Doanh thu từ sản phẩm
          const cogs = product.originalPrice * item.quantity; // Chi phí vốn hàng bán

          dailyStats[dateKey].revenue += revenue;
          dailyStats[dateKey].cogs += cogs;

          totalRevenue += revenue;
          totalCOGS += cogs;
        }
      }

      dailyStats[dateKey].grossProfit =
        dailyStats[dateKey].revenue - dailyStats[dateKey].cogs;
    }

    const grossProfit = totalRevenue - totalCOGS;

    return { totalRevenue, totalCOGS, grossProfit, dailyStats };
  } catch (error) {
    throw new Error("Lỗi khi tính toán theo ngày: " + error.message);
  }
}






module.exports = {
  calculateRevenueAndProfit,
  calculateRevenueAndProfitByDateRange,
};
