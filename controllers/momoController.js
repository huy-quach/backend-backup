const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/order');
const { updateInventoryAfterPurchase, updateFurnitureQuantityAfterPurchase } = require('./orderController');
const { restoreInventoryAfterCancellation, restoreFurnitureQuantityAfterCancellation } = require('./orderController');
const { clearUserCart } = require('./cartController'); // Xóa giỏ hàng sau thanh toán

const momoConfig = {
  accessKey: 'F8BBA842ECF85',
  secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  partnerCode: 'MOMO',
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
  queryEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/query',
  callbackUrl: 'https://73d7-113-176-87-53.ngrok-free.app/api/momo/callback',
};

// Create a payment with MoMo
exports.createPayment = async (req, res) => {
  const { amount, items = [], userId, shippingAddress, redirectUrl } = req.body;
  const orderId = momoConfig.partnerCode + Date.now();
  const requestId = orderId;

  const orderInfo = `Payment for order #${orderId}`;
  const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=&ipnUrl=${momoConfig.callbackUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${redirectUrl || 'http://localhost:5001/'}&requestId=${requestId}&requestType=captureWallet`;
  const signature = crypto.createHmac('sha256', momoConfig.secretKey).update(rawSignature).digest('hex');

  const requestBody = {
    partnerCode: momoConfig.partnerCode,
    partnerName: 'MoMo',
    storeId: 'MomoTestStore',
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl || 'http://localhost:5001/',
    ipnUrl: momoConfig.callbackUrl,
    lang: 'vi',
    requestType: 'captureWallet',
    autoCapture: true,
    extraData: '',
    signature: signature,
  };

  try {
    const response = await axios.post(momoConfig.endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Lưu đơn hàng vào cơ sở dữ liệu
    const newOrder = new Order({
      orderId,
      products: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        image: item.image,
      })),
      totalAmount: amount,
      shippingAddress: shippingAddress,
      paymentMethod: 'momo',
      paymentDetails: {
        paymentStatus: 'Pending',
      },
      user: userId,
    });
    await newOrder.save();

    res.status(200).json({ payUrl: response.data.payUrl || response.data.order_url });
  } catch (error) {
    console.error('Error creating MoMo payment:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create MoMo payment' });
  }
};

// Handle callback from MoMo
exports.handleCallback = async (req, res) => {
  console.log('Received MoMo callback:', req.body);

  const { orderId, resultCode, transId } = req.body;

  try {
    const order = await Order.findOne({ orderId });

    if (!order) {
      console.error('Order not found:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    let paymentStatus = 'Failed';
    let paymentDate = null;

    if (resultCode === 0) {
      paymentStatus = 'Completed';
      paymentDate = new Date();
    }

    await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          'paymentDetails.transactionId': transId,
          'paymentDetails.paymentStatus': paymentStatus,
          'paymentDetails.paymentDate': paymentDate,
        },
      },
      { new: true }
    );

    // Nếu thanh toán thành công
    if (paymentStatus === 'Completed') {
      try {
        await updateInventoryAfterPurchase(order.products);
        await updateFurnitureQuantityAfterPurchase(order.products);
        await clearUserCart(order.user);
        console.log('Inventory, furniture quantities updated, and cart cleared.');
      } catch (error) {
        console.error('Error updating inventory or clearing cart:', error.message);
      }
    }

    res.json({ return_code: 1, return_message: 'Success' });
  } catch (error) {
    console.error('Error handling MoMo callback:', error.message);
    res.status(500).json({ return_code: 0, return_message: 'Failed to process callback' });
  }
};

// Check payment status with MoMo
exports.checkPaymentStatus = async (req, res) => {
  const { orderId } = req.body;

  const rawSignature = `accessKey=${momoConfig.accessKey}&orderId=${orderId}&partnerCode=${momoConfig.partnerCode}&requestId=${orderId}`;
  const signature = crypto.createHmac('sha256', momoConfig.secretKey).update(rawSignature).digest('hex');

  const requestBody = {
    partnerCode: momoConfig.partnerCode,
    requestId: orderId,
    orderId: orderId,
    signature: signature,
    lang: 'vi',
  };

  try {
    const response = await axios.post(momoConfig.queryEndpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    const { resultCode } = response.data;

    if (resultCode === 0) {
      res.status(200).json({ paymentStatus: 'Completed' });
    } else {
      res.status(200).json({ paymentStatus: 'Failed' });
    }
  } catch (error) {
    console.error('Error checking payment status:', error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
};
