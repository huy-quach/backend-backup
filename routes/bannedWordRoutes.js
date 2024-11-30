const express = require("express");
const router = express.Router();
const bannedWordController = require("../controllers/bannedWordController");
const { authenticateToken } = require("../middleware/authMiddleware");
// Lấy tất cả từ cấm
router.get("/", authenticateToken, bannedWordController.getAllBannedWords);

// Thêm từ cấm mới
router.post("/", authenticateToken, bannedWordController.addBannedWord);

// Xóa từ cấm
router.delete("/:id", authenticateToken, bannedWordController.deleteBannedWord);

module.exports = router;
