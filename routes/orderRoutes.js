const express = require("express");
const {
  createOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  countOrders,
  searchOrderByPhone,
  searchOrdersByCustomerName,
  updateOrderStatusByShipper,
  cancelOrder,
  updateOrderStatusByAdmin,
  updateCODOrderStatus // Import the COD update function
} = require("../controllers/orderController");

const { authenticateToken } = require("../middleware/authMiddleware");

// Middleware để kiểm tra quyền hạn của Shipper, Admin, hoặc Người dùng
const isShipper = (req, res, next) => {
  if (req.user.role === "shipper") {
    return next();
  } else {
    return res.status(403).json({ message: "Không có quyền truy cập" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  } else {
    return res.status(403).json({ message: "Không có quyền truy cập" });
  }
};

const isAdminOrEmployee = (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "employee") {
    return next();
  } else {
    return res.status(403).json({ message: "Không có quyền truy cập" });
  }
};

const router = express.Router();

// Tạo đơn hàng
router.post("/", authenticateToken, createOrder);

// Đếm tổng số đơn hàng
router.get("/count", countOrders);

// Lấy danh sách đơn hàng của người dùng, cần xác thực
router.get("/user", authenticateToken, getOrdersByUser);

// Lấy tất cả đơn hàng (Admin)
router.get("/", authenticateToken, getAllOrders);

// Cập nhật trạng thái đơn hàng từ "Đang gửi" -> "Đang vận chuyển" (Dành cho Admin hoặc Employee)
router.patch("/:id/admin-update", authenticateToken, isAdminOrEmployee, updateOrderStatusByAdmin);

// Cập nhật trạng thái đơn hàng từ "Đang vận chuyển" -> "Hoàn thành" hoặc "Hủy bỏ" (Dành cho Shipper)
router.patch("/:id/shipper-status", authenticateToken, isShipper, updateOrderStatusByShipper);

// Cập nhật trạng thái đơn hàng cho COD sau khi giao hàng thành công (Dành cho Shipper)
router.patch("/:id/cod-delivery", authenticateToken, isShipper, updateCODOrderStatus);

// Route cho Shipper tìm kiếm đơn hàng theo số điện thoại
router.get("/search", authenticateToken, isShipper, searchOrderByPhone);

// Tìm kiếm đơn hàng theo tên khách hàng
router.get("/search-by-name", authenticateToken, isShipper, searchOrdersByCustomerName);

// Route cho người dùng hủy đơn hàng nếu trạng thái là "Đang gửi"
router.patch("/:id/cancel", authenticateToken, cancelOrder);

module.exports = router;
