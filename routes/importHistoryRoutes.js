const express = require("express");
const router = express.Router();
const {
  addImport,
  getImportHistory,
  filterImportHistory,
} = require("../controllers/importHistoryController"); // Đảm bảo đúng file

// Route để thêm lịch sử nhập hàng
router.post("/addImport", addImport);

// Route để lấy lịch sử nhập hàng
router.get("/getImportHistory", getImportHistory);

// Route để lọc lịch sử nhập hàng
router.get("/filter", filterImportHistory);

module.exports = router;
