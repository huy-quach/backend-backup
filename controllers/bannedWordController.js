const BannedWord = require("../models/bannedWord");

// Lấy danh sách từ cấm
exports.getAllBannedWords = async (req, res) => {
  try {
    const words = await BannedWord.find();
    res.status(200).json(words);
  } catch (error) {
    console.error("Error fetching banned words:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Thêm từ cấm mới
exports.addBannedWord = async (req, res) => {
  try {
    const { word } = req.body;
    const addedBy = req.user._id; // Lấy ID người dùng từ token

    // Kiểm tra từ đã tồn tại chưa
    const existingWord = await BannedWord.findOne({ word: word.trim().toLowerCase() });
    if (existingWord) {
      return res.status(400).json({ message: "Từ ngữ này đã tồn tại trong danh sách." });
    }

    const bannedWord = new BannedWord({ word: word.trim().toLowerCase(), addedBy });
    await bannedWord.save();
    res.status(201).json({ message: "Thêm từ cấm thành công.", bannedWord });
  } catch (error) {
    console.error("Error adding banned word:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Xóa từ cấm
exports.deleteBannedWord = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedWord = await BannedWord.findByIdAndDelete(id);

    if (!deletedWord) {
      return res.status(404).json({ message: "Từ cấm không tồn tại." });
    }

    res.status(200).json({ message: "Xóa từ cấm thành công.", deletedWord });
  } catch (error) {
    console.error("Error deleting banned word:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};
