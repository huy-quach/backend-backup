const express = require("express");
const {
  importProducts,
  getInventory,
  getProductInventory,
  updateInventoryAfterSale,
  updateLatestPrice,
  getTotalStock // Import hàm cập nhật sau khi bán
} = require("../controllers/inventoryController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const multer = require("multer");

const router = express.Router();

// Cấu hình multer để lưu file ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Đặt thư mục lưu file ảnh
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Tên file duy nhất dựa trên thời gian
  },
});

const upload = multer({ storage: storage });

// Route để nhập hàng vào kho (Chỉ admin mới được phép)
router.post(
  "/import",
  authenticateToken,
  authorizeRoles("admin", "employee"),
  upload.single("image"), // Xử lý upload một file ảnh với field "image"
  importProducts
);

// Route để xem toàn bộ kho hàng (Chỉ admin và employee mới được phép)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "employee"),
  getInventory
);

router.get(
  "/:productId/stock",
  authenticateToken,
  authorizeRoles("admin", "employee"),
  getTotalStock
);

router.patch(
  "/:productId/update-price",
  authenticateToken,
  authorizeRoles("admin"),
  updateLatestPrice
);
// Route để xem tồn kho của một sản phẩm cụ thể (Có thể yêu cầu xác thực, tùy theo yêu cầu)
router.get(
  "/:productId",
  authenticateToken,
  authorizeRoles("admin", "employee"),
  getProductInventory
);

// Route để cập nhật số lượng tồn kho sau khi đơn hàng hoàn thành
router.patch(
  "/update-after-sale",
  authenticateToken,
  authorizeRoles("admin", "employee"),
  updateInventoryAfterSale
);

module.exports = router;