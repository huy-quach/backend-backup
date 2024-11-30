const express = require("express");
const {
  createReview,
  getReviewsByProduct,
  getReviewedProductsByUser,
} = require("../controllers/reviewController");
const { authenticateToken } = require("../middleware/authMiddleware");
const router = express.Router();
const { upload } = require("../controllers/reviewController"); // Import multer config
const { addTestimonialFromReview, getAllTestimonials, getPendingReviews, deleteReview, revertTestimonial } = require("../controllers/reviewController");

// Route để tạo review với tối đa 3 hình ảnh
router.post(
  "/",
  authenticateToken,
  upload, // Middleware upload tối đa 3 hình ảnh
  createReview
);
// Route để admin chuyển đánh giá thành phản hồi
router.post("/add-testimonial", authenticateToken, addTestimonialFromReview);

router.get('/pending-reviews', authenticateToken, getPendingReviews);

// Route để lấy danh sách phản hồi
router.get("/testimonials", getAllTestimonials);

// Xóa đánh giá
router.delete("/:reviewId", deleteReview);

// Thu hồi phản hồi
router.post("/revert-testimonial",revertTestimonial);


// Route để lấy tất cả các review theo productId
router.get("/product/:productId", getReviewsByProduct);

// Route để lấy danh sách sản phẩm đã được đánh giá bởi user
router.get(
  "/user-reviewed-products",
  authenticateToken,
  getReviewedProductsByUser
);

module.exports = router;
