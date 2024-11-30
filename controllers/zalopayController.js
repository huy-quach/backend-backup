const axios = require('axios');
const CryptoJS = require('crypto-js');
const moment = require('moment');
const qs = require('qs');
const Order = require('../models/order');
const { updateInventoryAfterPurchase, updateFurnitureQuantityAfterPurchase } = require('./orderController');
const { restoreInventoryAfterCancellation, restoreFurnitureQuantityAfterCancellation } = require('./orderController');
const { clearUserCart } = require('./cartController'); // Yêu cầu hàm clearUserCart

const config = {
  app_id: '2553',
  key1: 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
  key2: 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
  endpoint: 'https://sb-openapi.zalopay.vn/v2/create',
  query_endpoint: 'https://sb-openapi.zalopay.vn/v2/query',
};

// Create a payment with ZaloPay
exports.createPayment = async (req, res) => {
  const { amount, redirectUrl, items = [], userId, shippingAddress } = req.body;
  const transID = Math.floor(Math.random() * 1000000);
  const embed_data = { redirecturl: redirectUrl || 'http://localhost:5001/' };
  const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;
  console.log("Generated app_trans_id:", app_trans_id);

  const order = {
    app_id: config.app_id,
    app_trans_id: app_trans_id,
    app_user: userId || 'default_user',
    app_time: Date.now(),
    item: JSON.stringify(items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: `http://localhost:5000/uploads/${item.image}`,
    }))),
    embed_data: JSON.stringify(embed_data),
    amount: amount,
    callback_url: 'https://73d7-113-176-87-53.ngrok-free.app/api/zalopay/callback',
    description: `Payment for the order #${transID}`,
    bank_code: '',
  };

  const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    const result = await axios.post(config.endpoint, qs.stringify(order), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const newOrder = new Order({
      orderId: app_trans_id,
      products: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        image: item.image,
      })),
      totalAmount: amount,
      shippingAddress: shippingAddress,
      paymentMethod: 'zalopay',
      paymentDetails: {
        paymentStatus: 'Pending',
      },
      user: userId,
    });
    await newOrder.save();
    console.log("Order saved successfully:", newOrder);
    res.status(200).json({ payUrl: result.data.order_url });
  } catch (error) {
    console.error("Error saving order:", error);
    console.error("Error creating payment:", error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create ZaloPay payment' });
  }
};

// Handle callback from ZaloPay
exports.handleCallback = async (req, res) => {
  console.log("Received callback data:", req.body);
  const key2 = config.key2;
  let result = {};

  try {
    const dataStr = req.body.data;
    const reqMac = req.body.mac;

    // Verify MAC
    const mac = CryptoJS.HmacSHA256(dataStr, key2).toString();
    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = 'Invalid MAC';
      console.log("MAC mismatch. Expected:", mac, "Received:", reqMac);
    } else {
      let dataJson;
      try {
        dataJson = JSON.parse(dataStr);
        console.log("Parsed callback JSON data:", dataJson);
      } catch (jsonError) {
        console.error("Error parsing callback JSON:", jsonError);
        result.return_code = 0;
        result.return_message = "JSON parse error";
        return res.json(result);
      }

      const { app_trans_id, zp_trans_id, status } = dataJson;

      let paymentStatus = "Failed";
      let paymentDate = null;

      // Kiểm tra trạng thái thanh toán
      if (status === undefined) {
        console.log("Status undefined, checking payment status...");
        const paymentCheckResponse = await exports.checkPaymentStatus(app_trans_id);
        if (paymentCheckResponse && paymentCheckResponse.paymentStatus === "Completed") {
          paymentStatus = "Completed";
          paymentDate = new Date();
        }
      } else {
        paymentStatus = (status === 1) ? "Completed" : "Failed";
        paymentDate = (status === 1) ? new Date() : null;
      }

      // Cập nhật `paymentDetails`, giữ nguyên `orderStatus`
      const updateResult = await Order.findOneAndUpdate(
        { orderId: String(app_trans_id) },
        {
          $set: {
            "paymentDetails.transactionId": zp_trans_id,
            "paymentDetails.paymentStatus": paymentStatus,
            "paymentDetails.paymentDate": paymentDate,
          },
        },
        { new: true }
      );

      if (updateResult) {
        console.log("Order updated successfully:", updateResult);

        // Nếu thanh toán hoàn thành, trừ số lượng sản phẩm trong `furniture` và `inventory`
        if (paymentStatus === "Completed") {
          try {
            await updateInventoryAfterPurchase(updateResult.products);
            await updateFurnitureQuantityAfterPurchase(updateResult.products);
            console.log("Inventory and furniture quantities updated successfully.");

            // Clear cart sau khi thanh toán hoàn thành
            await clearUserCart(updateResult.user); // 
            console.log("Cart cleared successfully after ZaloPay payment.");
          } catch (error) {
            console.error("Error updating inventory/furniture or clearing cart:", error);
          }
        }

        // Nếu đơn hàng bị hủy, hoàn lại số lượng
        if (updateResult.orderStatus === 'Hủy bỏ') {
          try {
            await restoreInventoryAfterCancellation(updateResult.products);
            await restoreFurnitureQuantityAfterCancellation(updateResult.products);
            console.log("Inventory and furniture quantities restored successfully after cancellation.");
          } catch (error) {
            console.error("Error restoring inventory and furniture quantities:", error);
          }
        }
      } else {
        console.log("Order not found with app_trans_id:", app_trans_id);
      }

      result.return_code = 1;
      result.return_message = 'Success';
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
    console.error("Error handling callback:", ex);
  }

  res.json(result);
};




// Check payment status with ZaloPay
exports.checkPaymentStatus = async (app_trans_id) => {
  const postData = {
    app_id: config.app_id,
    app_trans_id,
  };

  const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
  postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    const response = await axios.post(config.query_endpoint, qs.stringify(postData), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { return_code, zp_trans_id, server_time, sub_return_code } = response.data;

    if (return_code === 1 && sub_return_code === 1) {
      return {
        paymentStatus: "Completed",
        zp_trans_id: zp_trans_id,
        paymentDate: new Date(server_time),
      };
    } else {
      return { paymentStatus: "Failed" };
    }
  } catch (error) {
    console.error("Error checking payment status:", error.message);
    return { paymentStatus: "Failed" };
  }
};
