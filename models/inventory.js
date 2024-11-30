const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Furniture",
    required: true,
  },
  quantity: { type: Number, required: true }, // Số lượng nhập
  remainingQuantity: { type: Number, required: true }, // Số lượng còn lại
  costPrice: { type: Number, required: true }, // Giá nhập
  salePrice: { type: Number, required: true }, // Giá bán tại thời điểm nhập
  entryDate: { type: Date, default: Date.now }, // Ngày nhập hàng
  supplier: { type: String, required: true }, // Nhà cung cấp
});


module.exports = mongoose.model("Inventory", inventorySchema);
