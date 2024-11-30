const mongoose = require("mongoose");

const importHistorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Furniture",
    required: true,
  }, // Liên kết với sản phẩm
  quantity: { type: Number, required: true }, // Số lượng nhập
  costPrice: { type: Number, required: true }, // Giá nhập
  salePrice: { type: Number }, // Giá bán tại thời điểm nhập (nếu có)
  supplier: { type: String, required: true }, // Nhà cung cấp
  entryDate: { type: Date, default: Date.now }, // Ngày nhập hàng
});

module.exports = mongoose.model("ImportHistory", importHistorySchema);
