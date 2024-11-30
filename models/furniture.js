const mongoose = require("mongoose");

const furnitureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["Ghế", "Bàn", "Giường Ngủ", "Salon Phòng Khách", "Bếp Ăn"],
      required: true,
    },
    material: { type: String, required: true },
    image: { type: String, default: "no-image.jpg" },
    active: { type: Boolean, default: true }, // Sản phẩm có hoạt động hay không
    inStock: { type: Boolean, default: true }, // Còn hàng hay không
    totalStock: { type: Number, default: 0 }, // Tổng tồn kho, cập nhật từ Inventory
    costPrice: { type: Number, default: 0 }, // Giá nhập (được đồng bộ từ lần nhập gần nhất)
    salePrice: { type: Number, default: 0 }, // Giá bán (được đồng bộ từ lần nhập gần nhất)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Furniture", furnitureSchema);
