const Review = require("../models/review");
const multer = require("multer");
const path = require("path");
const BannedWord = require("../models/bannedWord");
const Testimonial = require("../models/testimonial");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Đường dẫn thư mục lưu trữ ảnh
  },
  filename: (req, file, cb) => {
    // Đặt tên file là timestamp kết hợp với tên gốc
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Giới hạn file 2MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

// Middleware upload nhiều file (tối đa 3 hình ảnh)
exports.upload = upload.array("images", 3);

// Tạo review
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    // Kiểm tra nếu người dùng đã đánh giá
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "Bạn đã đánh giá sản phẩm này trước đó." });
    }

    // Lấy danh sách từ cấm từ database
    const bannedWords = await BannedWord.find().select("word");
    const bannedWordsList = bannedWords.map((item) => item.word);

    // Kiểm tra từ ngữ thô tục trong comment
    const hasBannedWord = bannedWordsList.some((word) =>
      comment.toLowerCase().includes(word.toLowerCase())
    );
    if (hasBannedWord) {
      return res
        .status(400)
        .json({ message: "Nội dung đánh giá chứa từ ngữ không phù hợp." });
    }

    const reviewData = {
      productId,
      userId,
      rating,
      comment,
    };

    // Nếu có nhiều file, thêm tất cả tên file vào mảng
    if (req.files) {
      reviewData.images = req.files.map((file) => file.filename);
    }

    const review = new Review(reviewData);
    await review.save();

    return res
      .status(201)
      .json({ message: "Đánh giá đã được tạo thành công.", review });
  } catch (error) {
    console.error("Lỗi khi tạo đánh giá:", error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};



// Lấy tất cả review theo ProductID
exports.getReviewsByProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    // Sử dụng populate để lấy thông tin userId với các trường name
    const reviews = await Review.find({ productId }).populate("userId", "name");

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Lấy danh sách sản phẩm đã được đánh giá bởi người dùng
exports.getReviewedProductsByUser = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy userId từ middleware xác thực

    // Tìm tất cả các review của người dùng hiện tại
    const reviews = await Review.find({ userId }).select("productId");

    // Trả về danh sách các productId đã được đánh giá
    const reviewedProducts = reviews.map((review) => review.productId);

    res.status(200).json({ reviewedProducts });
  } catch (error) {
    console.error("Error fetching reviewed products:", error);
    res.status(500).json({ error: "Server error" });
  }
};
exports.addTestimonialFromReview = async (req, res) => {
  try {
    const { reviewId } = req.body; // Nhận ID của đánh giá cần chuyển thành phản hồi

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });
    }

    // Cập nhật isTestimonial thành true
    review.isTestimonial = true;
    await review.save();

    // Tạo phản hồi từ đánh giá
    const testimonial = new Testimonial({
      reviewId: review._id,
      userId: review.userId,
      productId: review.productId,
      comment: review.comment,
      rating: review.rating,
      images: review.images,
    });

    await testimonial.save();

    res.status(201).json({ message: "Phản hồi đã được thêm thành công.", testimonial });
  } catch (error) {
    console.error("Lỗi khi thêm phản hồi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find()
      .populate("userId", "name") // Hiển thị thông tin người dùng
      .populate("reviewId", "comment images"); // Hiển thị thông tin đánh giá gốc

    res.status(200).json(testimonials);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phản hồi:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.getPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isTestimonial: false })
      .populate("userId", "name")
      .populate("productId", "name");

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};
// Xóa đánh giá khỏi cơ sở dữ liệu
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });
    }

    // Xóa đánh giá
    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({ message: "Đánh giá đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa đánh giá:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Thu hồi phản hồi (trả phản hồi về danh sách đánh giá)
exports.revertTestimonial = async (req, res) => {
  try {
      const { testimonialId } = req.body;

      const testimonial = await Testimonial.findById(testimonialId);
      if (!testimonial) {
          return res.status(404).json({ message: "Không tìm thấy phản hồi." });
      }

      const review = await Review.findById(testimonial.reviewId);
      if (!review) {
          return res.status(404).json({ message: "Không tìm thấy đánh giá gốc." });
      }

      // Đặt lại isTestimonial thành false
      review.isTestimonial = false;
      await review.save();

      // Xóa phản hồi
      await Testimonial.findByIdAndDelete(testimonialId);

      // Trả về đánh giá gốc
      res.status(200).json({ message: "Thu hồi thành công.", review });
  } catch (error) {
      console.error("Lỗi khi thu hồi phản hồi:", error);
      res.status(500).json({ error: "Lỗi server" });
  }
};

