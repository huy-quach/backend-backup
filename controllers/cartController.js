const User = require("../models/user"); // Model user được sử dụng để lưu giỏ hàng
const Furniture = require("../models/furniture");

// Lưu giỏ hàng vào cơ sở dữ liệu
const saveCart = async (req, res) => {
  try {
    const { cart } = req.body;

    console.log("Saving cart:", cart); // Kiểm tra log dữ liệu cart trước khi lưu
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { cart }, // Đảm bảo rằng cart bao gồm cả 'description'
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.cart); // Trả về giỏ hàng đã lưu
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy giỏ hàng từ cơ sở dữ liệu
const getCart = async (req, res) => {
  try {
    // Lấy thông tin người dùng
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Lấy danh sách ID sản phẩm trong giỏ hàng
    const productIds = user.cart.map((cartItem) => cartItem._id);

    // Truy vấn tất cả sản phẩm từ bảng Furniture
    const products = await Furniture.find({ _id: { $in: productIds } }).select(
      "_id salePrice price material image"
    );

    // Tạo một Map để tra cứu sản phẩm nhanh hơn
    const productMap = products.reduce((map, product) => {
      map[product._id.toString()] = product;
      return map;
    }, {});

    // Cập nhật thông tin giỏ hàng
    const cartWithUpdatedPrices = user.cart.map((cartItem) => {
      const product = productMap[cartItem._id.toString()];

      // Nếu sản phẩm không tồn tại, bỏ qua hoặc xử lý lỗi
      if (!product) {
        return {
          ...cartItem,
          error: "Product not found",
        };
      }

      return {
        ...cartItem,
        price: product.salePrice || product.price, // Cập nhật giá từ Furniture
        material: product.material, // Đồng bộ material
        image: product.image || cartItem.image, // Cập nhật hình ảnh nếu có
      };
    });

    // Trả về giỏ hàng đã cập nhật giá
    res.json(cartWithUpdatedPrices);
  } catch (error) {
    console.error("Error in getCart:", error);
    res.status(500).json({ message: error.message });
  }
};

const clearUserCart = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { cart: [] });
    console.log("Cart cleared successfully for user:", userId);
  } catch (error) {
    console.error("Error clearing cart:", error);
  }
};
// Xóa giỏ hàng sau khi thanh toán
const clearCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { cart: [] }, // Làm trống giỏ hàng của người dùng trong database
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Cart cleared successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveCart, getCart, clearCart, clearUserCart };
