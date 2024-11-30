require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const contactRoutes = require("./routes/contactRoutes");
const cartRoutes = require("./routes/cartRoutes");
const userRoutes = require("./routes/userRoutes");
const furnitureRoutes = require("./routes/furnitureRoutes");
const orderRoutes = require("./routes/orderRoutes");
const carouselRoutes = require("./routes/carouselRoutes");
const momoRoutes = require("./routes/momoRoutes");
const zalopayRoutes = require("./routes/zalopayRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const financeRoutes = require("./routes/financeRoutes");

const connectDB = require("./config/db"); // Import hàm kết nối MongoDB
require("./config/passport");

const app = express();

// Kết nối MongoDB
connectDB();

// Cấu hình session cho passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "yourSecretKey",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(cors());
app.use(express.json());

app.use("/api/carousels", carouselRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/contact", contactRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/furniture", furnitureRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);


const importHistoryRoutes = require('./routes/importHistoryRoutes');
app.use('/api/import-history', importHistoryRoutes);


const blogRoutes = require("./routes/blogRoutes");
app.use("/api/blogs", blogRoutes);

const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

const bannedWordRoutes = require("./routes/bannedWordRoutes");
app.use("/api/banned-words", bannedWordRoutes);


app.use("/api/momo", momoRoutes);
app.use("/api/zalopay", zalopayRoutes);

// Route xác thực bằng Facebook
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// Route callback sau khi xác thực bằng Facebook
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/" }),
  (req, res) => {
    // Tạo JWT token từ thông tin người dùng
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, name: req.user.name },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const user = {
      name: req.user.name,
      email: req.user.email,
    };

    // Chuyển hướng về frontend trên cổng 5001
    res.redirect(
      `http://localhost:5001/?token=${token}&name=${user.name}&email=${user.email}`
    );
  }
);

// Cấu hình đăng xuất
app.get("/auth/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/"); // Chuyển hướng về trang chủ sau khi logout
  });
});

// Phục vụ các file tĩnh từ thư mục build của Vue.js (frontend)
app.use(express.static(path.join(__dirname, "dist")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Cấu hình CORS cho frontend
app.use(
  cors({
    origin: "http://localhost:5001", // Thay bằng địa chỉ frontend của bạn
    credentials: true,
  })
);

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
