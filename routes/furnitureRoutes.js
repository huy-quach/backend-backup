const express = require("express");
const {
  countFurniture,
  getAllFurniture,
  updateFurniture,
  hideFurniture,
  getHiddenFurniture,
  getFurnitureById,
  unhideFurniture,
  deleteFurniture,
  searchFurniture,
  upload,
} = require("../controllers/furnitureController");
const {
  getTotalStock,
} = require("../controllers/inventoryController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/count",countFurniture);

// Lấy tất cả các sản phẩm
router.get("/", getAllFurniture);

router.get("/search",searchFurniture);
// Tạo sản phẩm mới (Chỉ admin mới được phép)
router.get("/:id/stock", authenticateToken, authorizeRoles("admin"), getTotalStock);

// Cập nhật sản phẩm (Chỉ admin mới được phép)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  upload.single("image"),
  updateFurniture
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"), // Chỉ admin mới được phép xóa
  deleteFurniture
);

// Xóa sản phẩm (Chỉ admin mới được phép)
router.put(
  "/:productId/hide",
  authenticateToken,
  authorizeRoles("admin"),
  hideFurniture
);

// Route để lấy các sản phẩm bị ẩn
router.get("/hidden", authenticateToken, authorizeRoles("admin"), getHiddenFurniture);

// Route để bỏ ẩn sản phẩm
router.put(
  "/:productId/unhide",
  authenticateToken,
  authorizeRoles("admin"),
  unhideFurniture
);

// Lấy sản phẩm theo ID (Không yêu cầu xác thực, hoặc bạn có thể thêm middleware nếu cần)
router.get("/:id", getFurnitureById);

module.exports = router;