const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Review", required: true }, // Liên kết với đánh giá
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Furniture", required: true },
  comment: { type: String, required: true },
  rating: { type: Number, required: true },
  images: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Testimonial", testimonialSchema);
