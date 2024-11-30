const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Furniture", // Tham chiếu đến model Furniture
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
  images: {
    type: [String], // Mảng tên file hình ảnh
    default: [],
  },
  isTestimonial: {
    type: Boolean, // Trường để kiểm tra đã chuyển thành phản hồi chưa
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Review", reviewSchema);
