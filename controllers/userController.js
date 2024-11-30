const User = require("../models/user");
const Order = require("../models/order");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Đăng ký người dùng
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Kiểm tra xem email có tồn tại không
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    // Tạo người dùng mới
    const newUser = new User({
      name,
      email,
      password,
      role: role || "user", // Gán role mặc định là 'user' nếu không có
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Đăng nhập người dùng
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log("Email:", email, "Password:", password); // Log để kiểm tra

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ message: "Mật khẩu không chính xác" });
    }

    // Tạo JWT token bao gồm role
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ user, accessToken });
  } catch (error) {
    console.error("Login error:", error); // Thêm thông báo lỗi vào console
    res.status(500).json({ message: "Server error" });
  }
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Tạo token ngẫu nhiên
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Lưu token vào user với thời hạn 1 giờ
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
    await user.save();

    // Gửi email với link reset
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
      },
    });

    const mailOptions = {
      to: email,
      subject: "Password Reset Request",
      text: `Please use the following link to reset your password: ${resetUrl}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Mật khẩu đã đặt lại trong thư Mail của bạn!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
// userController.js
exports.resetPassword = async (req, res) => {
  const { token } = req.params; // Token từ URL
  const { password } = req.body; // Mật khẩu mới từ request body

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm user có token khớp và còn hạn sử dụng
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }

    // Cập nhật mật khẩu
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Mật khẩu đã được cập nhật thành công." });
  } catch (error) {
    console.error("Error in reset password:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi. Vui lòng thử lại sau." });
  }
};


// Lấy danh sách tất cả người dùng (chỉ admin có quyền)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin người dùng theo ID (chỉ admin có quyền)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Xóa người dùng theo ID (chỉ admin có quyền)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hàm lấy thông tin cá nhân người dùng
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Cập nhật thông tin cá nhân người dùng
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Cập nhật thông tin người dùng
    user.name = req.body.name || user.name;

    // Nếu có yêu cầu thay đổi mật khẩu, chỉ cập nhật mật khẩu mà không mã hóa
    if (req.body.newPassword) {
      user.password = req.body.newPassword; // Không mã hóa, cập nhật trực tiếp
    }

    const updatedUser = await user.save();
    res.json(updatedUser); // Trả về thông tin người dùng sau khi cập nhật thành công
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate(
      "products.product"
    );
    res.json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: error.message });
  }
};
// Lấy danh sách nhân viên
exports.getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: { $in: ["employee", "shipper"] } });
    res.json(employees);
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve employees" });
  }
};

// Cập nhật role nhân viên
exports.updateEmployeeRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = newRole;
    await user.save();
    res.json({ message: "Role updated successfully", user });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(500).json({ message: "Failed to update role" });
  }
};

// Xóa nhân viên
exports.deleteEmployee = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted successfully" });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(500).json({ message: "Failed to delete employee" });
  }
};

exports.addEmployee = async (req, res) => {
  const { name, email, password, role } = req.body;
  
  console.log("Received data:", { name, email, password, role }); // Log dữ liệu nhận được

  // Kiểm tra dữ liệu đầu vào
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Kiểm tra vai trò có hợp lệ hay không
  const validRoles = ["employee", "shipper"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  // Kiểm tra xem email đã tồn tại chưa
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    const newUser = new User({
      name,
      email,
      password,
      role,
    });

    await newUser.save();
    console.log("New employee added successfully:", newUser); // Log khi thêm thành công
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error in addEmployee:", error); // Log lỗi nếu có
    res.status(500).json({ message: "Error adding employee", error });
  }
};


// Đếm số lượng nhân viên
exports.countEmployees = async (req, res) => {
  try {
    const employeeCount = await User.countDocuments({ role: 'employee' }); // Đếm nhân viên có role 'employee'
    res.status(200).json({ count: employeeCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to count employees", error });
  }
};
// Đếm số lượng shipper
exports.countShippers = async (req, res) => {
  try {
    const shipperCount = await User.countDocuments({ role: 'shipper' }); // Đếm shipper có role 'shipper'
    res.status(200).json({ count: shipperCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to count shippers", error });
  }
};
