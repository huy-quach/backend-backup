const Inventory = require("../models/inventory");
const Furniture = require("../models/furniture");
const ImportHistory = require("../models/importhistory"); // Import model lịch sử nhập hàng
const { syncFurnitureStock } = require("./furnitureController"); // Import hàm đồng bộ hóa
const mongoose = require("mongoose");

exports.importProducts = async (req, res) => {
  try {
    const { productName, description, category, material, quantity, originalPrice, price, supplier } = req.body;
    const uploadedImage = req.file ? req.file.filename : null;

    if (!productName || !quantity || !originalPrice || !price || !supplier) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    const costPrice = parseFloat(originalPrice);
    const salePrice = parseFloat(price);
    const quantityParsed = parseInt(quantity);

    if (isNaN(costPrice) || isNaN(salePrice)) {
      return res.status(400).json({ message: "Giá nhập và giá bán phải là số hợp lệ!" });
    }

    let product = await Furniture.findOne({ name: productName });

    if (!product) {
      product = new Furniture({
        name: productName,
        description,
        category,
        material,
        image: uploadedImage,
        totalStock: quantityParsed,
        costPrice,
        salePrice,
      });
      await product.save();
    } else {
      product.description = description;
      product.category = category;
      product.material = material;
      if (uploadedImage) {
        product.image = uploadedImage;
      }
      await product.save();
    }

    const inventory = await Inventory.findOne({ product: product._id });

    if (inventory) {
      inventory.quantity += quantityParsed;
      inventory.remainingQuantity += quantityParsed;
      inventory.costPrice = costPrice;
      inventory.salePrice = salePrice;
      inventory.supplier = supplier;
      inventory.entryDate = new Date();
      await inventory.save();
    } else {
      const newInventory = new Inventory({
        product: product._id,
        quantity: quantityParsed,
        remainingQuantity: quantityParsed,
        costPrice,
        salePrice,
        supplier,
        entryDate: new Date(),
      });
      await newInventory.save();
    }

    const totalStock = await Inventory.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, total: { $sum: "$remainingQuantity" } } },
    ]);

    product.totalStock = totalStock[0]?.total || 0;
    product.costPrice = costPrice; // Cập nhật giá gốc từ lần nhập gần nhất
    product.salePrice = salePrice; // Cập nhật giá bán từ lần nhập gần nhất
    await product.save();

    const newImportHistory = new ImportHistory({
      product: product._id,
      quantity: quantityParsed,
      costPrice,
      salePrice,
      supplier,
      entryDate: new Date(),
    });
    await newImportHistory.save();

    res.status(201).json({ message: "Nhập hàng thành công!", product });
  } catch (error) {
    console.error("Lỗi trong importProducts:", error);
    res.status(500).json({ message: "Lỗi khi nhập hàng", error: error.message });
  }
};


exports.getAllInventoryItems = async (req, res) => {
  try {
    // Nhóm các bản ghi Inventory theo sản phẩm
    const inventoryData = await Inventory.aggregate([
      {
        $group: {
          _id: "$product",
          totalQuantity: { $sum: "$remainingQuantity" }, // Tính tổng số lượng còn lại
          latestCostPrice: { $last: "$costPrice" }, // Lấy giá gốc từ lần nhập gần nhất
          latestSalePrice: { $last: "$salePrice" }, // Lấy giá bán từ lần nhập gần nhất
          latestSupplier: { $last: "$supplier" }, // Lấy nhà cung cấp từ lần nhập gần nhất
          latestEntryDate: { $last: "$entryDate" }, // Lấy ngày nhập gần nhất
        },
      },
      {
        $lookup: {
          from: "furnitures", // Kết nối với collection `Furniture`
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product", // Giải nén thông tin sản phẩm
      },
      {
        $project: {
          _id: 1,
          name: "$product.name",
          description: "$product.description",
          image: "$product.image",
          category: "$product.category",
          material: "$product.material",
          totalQuantity: 1,
          latestCostPrice: 1,
          latestSalePrice: 1,
          latestSupplier: 1,
          latestEntryDate: 1,
        },
      },
    ]);

    res.status(200).json(inventoryData); // Trả về dữ liệu nhóm
  } catch (error) {
    console.error("Failed to fetch inventory data:", error);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
};



// Hàm kiểm tra tồn kho
exports.getInventory = async (req, res) => {
  try {
    // Populating full product details from Furniture model, including all relevant fields
    const inventory = await Inventory.find().populate({
      path: "product",
      match: { active: true },
      select: "name description category material costPrice salePrice image",
    });
    

    // Lọc ra những bản ghi inventory mà sản phẩm đã bị ẩn (không có product)
    const filteredInventory = inventory.filter((item) => item.product !== null);

    res.json(filteredInventory); // Trả về dữ liệu inventory đã được lọc
  } catch (error) {
    console.error("Failed to fetch inventory data:", error);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
};
// Hàm kiểm tra tồn kho theo sản phẩm
exports.getProductInventory = async (req, res) => {
  try {
    const productId = req.params.productId;

    const inventories = await Inventory.find({ product: productId }).sort({ entryDate: -1 });
    if (!inventories || inventories.length === 0) {
      return res.status(404).json({ message: "No inventory found for this product" });
    }

    res.json(inventories);
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    res.status(500).json({ message: "Failed to fetch product inventory" });
  }
};

exports.updateInventoryAfterSale = async (req, res) => {
  try {
    const { productId, quantitySold } = req.body;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Lấy danh sách tồn kho theo FIFO
    const inventories = await Inventory.find({
      product: new mongoose.Types.ObjectId(productId), // Sử dụng `new` khi tạo ObjectId
      remainingQuantity: { $gt: 0 },
    }).sort({ entryDate: 1 });

    if (!inventories || inventories.length === 0) {
      return res.status(404).json({ message: "No inventory found for this product" });
    }

    let remainingQuantityToDeduct = quantitySold;

    for (const inventory of inventories) {
      if (remainingQuantityToDeduct <= 0) break;

      const deductable = Math.min(inventory.remainingQuantity, remainingQuantityToDeduct);
      inventory.remainingQuantity -= deductable;
      remainingQuantityToDeduct -= deductable;

      await inventory.save();
    }

    if (remainingQuantityToDeduct > 0) {
      return res.status(400).json({ message: "Not enough stock available" });
    }

    // Gọi hàm đồng bộ hóa dữ liệu Furniture
    await syncFurnitureStock(productId);

    res.status(200).json({ message: "Inventory updated after sale and furniture synced successfully" });
  } catch (error) {
    console.error("Error updating inventory after sale:", error);
    res.status(500).json({ message: "Failed to update inventory after sale" });
  }
};


exports.getTotalStock = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Kiểm tra xem `productId` có phải là ObjectId hợp lệ hay không
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Sử dụng `new` khi khởi tạo ObjectId
    const totalStock = await Inventory.aggregate([
      {
        $match: { product: new mongoose.Types.ObjectId(productId) }, // Sử dụng `new` để tạo ObjectId
      },
      {
        $group: {
          _id: null, // Không cần nhóm theo trường nào
          total: { $sum: "$remainingQuantity" }, // Tính tổng `remainingQuantity`
        },
      },
    ]);

    // Kiểm tra kết quả
    if (!totalStock || totalStock.length === 0) {
      return res.status(404).json({ message: "No inventory found for this product" });
    }

    res.status(200).json({
      productId,
      totalStock: totalStock[0].total,
    });
  } catch (error) {
    console.error("Error fetching total stock:", error);
    res.status(500).json({ message: "Failed to fetch total stock" });
  }
};


exports.updateLatestPrice = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Lấy lần nhập hàng gần nhất
    const latestInventory = await Inventory.findOne({ product: productId })
      .sort({ entryDate: -1 });

    if (!latestInventory) {
      return res.status(404).json({ message: "No inventory found for this product" });
    }

    // Cập nhật giá bán trong Furniture
    const product = await Furniture.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.price = latestInventory.salePrice;
    await product.save();

    res.status(200).json({ message: "Latest price updated successfully", product });
  } catch (error) {
    console.error("Error updating latest price:", error);
    res.status(500).json({ message: "Failed to update latest price" });
  }
};
