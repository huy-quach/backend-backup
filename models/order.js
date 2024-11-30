const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Added an index for more efficient querying by orderId
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Furniture",
          required: true,
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount must be positive'], // Ensures totalAmount is positive
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      street: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      note: { type: String },
    },
    orderStatus: {
      type: String,
      enum: ["Đang gửi", "Đang vận chuyển", "Hoàn thành", "Hủy bỏ"],
      default: "Đang gửi",
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "momo", "zalopay"],
      required: true,
    },
    paymentDetails: {
      transactionId: { type: String },
      paymentStatus: {
        type: String,
        enum: ["Pending", "Completed", "Failed"],
        default: "Pending",
      },
      paymentDate: { type: Date },
    },
    trackingNumber: { // Optional field for tracking the shipment
      type: String,
      required: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Additional indexes if necessary
orderSchema.index({ user: 1, orderStatus: 1, paymentMethod: 1 });

module.exports = mongoose.model("Order", orderSchema);
