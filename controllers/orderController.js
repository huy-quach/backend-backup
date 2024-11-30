const Order = require("../models/order");
const Furniture = require("../models/furniture");
const Inventory = require("../models/inventory");

// Hàm để cập nhật số lượng trong Inventory sau khi mua hàng
exports.updateInventoryAfterPurchase = async (products) => {
  for (const item of products) {
    const inventoryItem = await Inventory.findOne({ product: item.product });

    if (inventoryItem) {
      inventoryItem.quantity -= item.quantity; // Trừ số lượng trong kho
      if (inventoryItem.quantity < 0) {
        inventoryItem.quantity = 0; // Đảm bảo số lượng không âm
      }
      await inventoryItem.save(); // Lưu lại thay đổi vào database
    }
  }
};
exports.updateFurnitureQuantityAfterPurchase = async (products) => {
  for (const item of products) {
    const furnitureItem = await Furniture.findById(item.product);

    if (furnitureItem) {
      furnitureItem.quantity -= item.quantity; // Trừ số lượng trong bảng furniture
      if (furnitureItem.quantity < 0) {
        furnitureItem.quantity = 0; // Đảm bảo số lượng không âm
      }
      await furnitureItem.save(); // Lưu lại thay đổi vào database
    }
  }
};
// Hàm để khôi phục số lượng trong Inventory khi hủy đơn hàng
exports.restoreInventoryAfterCancellation = async (products) => {
  for (const item of products) {
    const inventoryItem = await Inventory.findOne({ product: item.product });

    if (inventoryItem) {
      inventoryItem.quantity += item.quantity; // Hoàn lại số lượng trong kho
      await inventoryItem.save(); // Lưu lại thay đổi vào database
    }
  }
};
exports.restoreFurnitureQuantityAfterCancellation = async (products) => {
  for (const item of products) {
    const furnitureItem = await Furniture.findById(item.product);

    if (furnitureItem) {
      furnitureItem.quantity += item.quantity; // Hoàn lại số lượng trong bảng furniture
      await furnitureItem.save(); // Lưu lại thay đổi vào database
    }
  }
};
exports.createOrder = async (req, res) => {
  try {
    console.log("Received order data:", req.body);

    const { products, totalAmount, shippingAddress, paymentMethod, paymentDetails } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one product" });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: "Total amount must be greater than zero" });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phoneNumber) {
      return res.status(400).json({ error: "Shipping address must contain fullName and phoneNumber" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    const orderId = `ORD-${Date.now()}`;
    const newOrder = new Order({
      orderId,
      products,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      user: req.user._id,
    });

    const savedOrder = await newOrder.save();
    
    // Trừ số lượng sản phẩm trong Inventory và Furniture
    await exports.updateInventoryAfterPurchase(products);
    await exports.updateFurnitureQuantityAfterPurchase(products);

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};





// Lấy danh sách đơn hàng của người dùng
exports.getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate(
      "products.product", // Tham chiếu tới sản phẩm
      "name price image" // Bao gồm trường image cùng với name và price
    );
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to retrieve orders" });
  }
};
exports.updateOrderStatus = async (req, res) => {
  const { orderStatus } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  order.orderStatus = orderStatus;
  await order.save();
  res.json(order);
};
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("products.product", "name price image")
      .populate("user", "name email");
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to retrieve orders" });
  }
};

exports.updateQuantityAfterPurchase = async (products) => {
  for (const item of products) {
    const furniture = await Furniture.findById(item.product);
    if (furniture) {
      // Trừ số lượng sản phẩm
      furniture.quantity -= item.quantity;
      await furniture.save(); // Lưu cập nhật vào database
    }
  }
};
exports.checkOrderStatus = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const order = await Order.findOne({ userId, "items.productId": productId });
    if (order) {
      res.status(200).json({ status: order.status });
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to check order status", error });
  }
};
// Đếm tổng số đơn hàng
exports.countOrders = async (req, res) => {
  try {
    const orderCount = await Order.countDocuments(); // Đếm tổng số đơn hàng
    res.status(200).json({ count: orderCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to count orders", error });
  }
};
// Tìm kiếm đơn hàng theo số điện thoại
exports.searchOrderByPhone = async (req, res) => {
  const { phoneNumber } = req.query;

  try {
    const orders = await Order.find({ "shippingAddress.phoneNumber": phoneNumber }).populate(
      "products.product",
      "name price image"
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm đơn hàng:", error);
    res.status(500).json({ message: "Lỗi khi tìm kiếm đơn hàng", error });
  }
};
// Tìm kiếm đơn hàng theo tên khách hàng
exports.searchOrdersByCustomerName = async (req, res) => {
  const { fullName } = req.query;

  try {
    if (!fullName) {
      return res.status(400).json({ message: "Vui lòng cung cấp tên khách hàng để tìm kiếm." });
    }

    // Sử dụng biểu thức chính quy để tìm kiếm tên gần đúng, không phân biệt chữ hoa chữ thường
    const orders = await Order.find({
      "shippingAddress.fullName": { $regex: fullName, $options: "i" }
    });

    if (orders.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng nào với tên khách hàng đã nhập." });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm đơn hàng theo tên khách hàng:", error);
    res.status(500).json({ message: "Lỗi khi tìm kiếm đơn hàng", error });
  }
};
exports.updateOrderStatusByAdmin = async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus === "Đang gửi" && (orderStatus === "Đang vận chuyển" || orderStatus === "Hủy bỏ")) {
      order.orderStatus = orderStatus;
      await order.save();
      return res.status(200).json({ message: `Order status updated to '${orderStatus}'`, order });
    } else {
      return res.status(400).json({ message: "Order status cannot be updated by Admin" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Cập nhật trạng thái đơn hàng dành cho Shipper
exports.updateOrderStatusByShipper = async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus === "Đang vận chuyển" && (orderStatus === "Hoàn thành" || orderStatus === "Hủy bỏ")) {
      order.orderStatus = orderStatus;
      await order.save();
      return res.status(200).json({ message: `Order status updated to '${orderStatus}'`, order });
    } else {
      return res.status(400).json({ message: "Order status cannot be updated by Shipper" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
// Cập nhật trạng thái đơn hàng để hủy bỏ và hoàn lại số lượng sản phẩm
exports.cancelOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Kiểm tra xem đơn hàng có thể hủy bỏ
    if (order.orderStatus === "Đang gửi" || order.orderStatus === "Đang vận chuyển") {
      order.orderStatus = "Hủy bỏ";

      // Lưu trạng thái đơn hàng trước khi thực hiện các thao tác khác
      await order.save();

      // Thực hiện khôi phục số lượng sản phẩm, nhưng không để ảnh hưởng đến việc hủy bỏ trạng thái
      try {
        await exports.restoreInventoryAfterCancellation(order.products);
        await exports.restoreFurnitureQuantityAfterCancellation(order.products);
      } catch (restoreError) {
        console.error("Error restoring inventory or furniture quantities:", restoreError);
      }

      return res
        .status(200)
        .json({ message: "Order has been canceled and inventory restored", order });
    } else {
      return res.status(400).json({ message: "Order cannot be canceled" });
    }
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Cập nhật trạng thái cho đơn hàng COD sau khi giao hàng thành công
exports.updateCODOrderStatus = async (req, res) => {
  const { id } = req.params;  // ID của đơn hàng từ request params

  try {
      const order = await Order.findById(id);

      // Kiểm tra xem đơn hàng có tồn tại và có phải là COD không
      if (!order || order.paymentMethod !== 'cash_on_delivery') {
          return res.status(404).json({ message: 'Order not found or is not COD' });
      }

      // Cập nhật trạng thái đơn hàng và trạng thái thanh toán
      order.orderStatus = 'Hoàn thành';
      order.paymentDetails.paymentStatus = 'Completed';

      await order.save();  // Lưu cập nhật vào cơ sở dữ liệu
      res.status(200).json({ message: 'Order status updated successfully for COD', order });
  } catch (error) {
      console.error('Error updating COD order status:', error);
      res.status(500).json({ message: 'Failed to update COD order status', error });
  }
};
