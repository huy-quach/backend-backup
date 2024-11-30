const Furniture = require("../models/furniture");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

exports.upload = multer({ storage });

// Get furniture by category
exports.getFurnitureByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const furniture = await Furniture.find({ category, active: true }); // Only active furniture
    res.json(furniture);
  } catch (error) {
    console.error("Error fetching furniture by category:", error);
    res.status(500).json({ message: "Failed to fetch furniture by category" });
  }
};

// Get all furniture or filtered by category
exports.getAllFurniture = async (req, res) => {
  const { category } = req.query;
  const filter = { active: true }; // Filter by active products

  if (category) {
    filter.category = category;
  }

  try {
    const furniture = await Furniture.find(filter);
    res.json(furniture);
  } catch (error) {
    console.error("Error fetching all furniture:", error);
    res.status(500).json({ message: "Failed to fetch furniture" });
  }
};

// Get furniture by ID
exports.getFurnitureById = async (req, res) => {
  try {
    const furniture = await Furniture.findById(req.params.id);
    if (!furniture) {
      return res.status(404).json({ message: "Furniture not found" });
    }
    res.json(furniture);
  } catch (error) {
    console.error("Error fetching furniture by ID:", error);
    res.status(500).json({ message: "Failed to fetch furniture" });
  }
};

// Update furniture details
exports.updateFurniture = async (req, res) => {
  try {
    const { name, description, category, material } = req.body;
    const furniture = await Furniture.findById(req.params.id);

    if (!furniture) {
      return res.status(404).json({ message: "Furniture not found" });
    }

    const updatedData = {
      name: name || furniture.name,
      description: description || furniture.description,
      category: category || furniture.category,
      material: material || furniture.material,
      image: req.file ? req.file.filename : furniture.image,
    };

    Object.assign(furniture, updatedData);
    await furniture.save();

    res.status(200).json({ message: "Furniture updated successfully", furniture });
  } catch (error) {
    console.error("Error updating furniture:", error);
    res.status(500).json({ message: "Failed to update furniture" });
  }
};

// Hide furniture
exports.hideFurniture = async (req, res) => {
  try {
    const furniture = await Furniture.findByIdAndUpdate(
      req.params.productId,
      { active: false },
      { new: true }
    );

    if (!furniture) {
      return res.status(404).json({ message: "Furniture not found" });
    }

    res.json({ message: "Furniture hidden successfully", furniture });
  } catch (error) {
    console.error("Error hiding furniture:", error);
    res.status(500).json({ message: "Failed to hide furniture" });
  }
};

// Unhide furniture
exports.unhideFurniture = async (req, res) => {
  try {
    const furniture = await Furniture.findByIdAndUpdate(
      req.params.productId,
      { active: true },
      { new: true }
    );

    if (!furniture) {
      return res.status(404).json({ message: "Furniture not found" });
    }

    res.json({ message: "Furniture unhidden successfully", furniture });
  } catch (error) {
    console.error("Error unhiding furniture:", error);
    res.status(500).json({ message: "Failed to unhide furniture" });
  }
};

// Get hidden furniture
exports.getHiddenFurniture = async (req, res) => {
  try {
    const hiddenFurniture = await Furniture.find({ active: false });
    res.json(hiddenFurniture);
  } catch (error) {
    console.error("Error fetching hidden furniture:", error);
    res.status(500).json({ message: "Failed to fetch hidden furniture" });
  }
};

// Buy furniture and update stock
exports.buyFurniture = async (req, res) => {
  try {
    const { quantity } = req.body;
    const furniture = await Furniture.findById(req.params.id);

    if (!furniture) {
      return res.status(404).json({ message: "Furniture not found" });
    }

    // Lấy tồn kho từ Inventory
    const inventories = await Inventory.find({
      product: furniture._id,
      remainingQuantity: { $gt: 0 },
    }).sort({ entryDate: 1 }); // FIFO: nhập trước xuất trước

    let remainingQuantityToDeduct = quantity;

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

    // Cập nhật totalStock trong Furniture
    const totalStock = await Inventory.aggregate([
      { $match: { product: furniture._id } },
      { $group: { _id: null, total: { $sum: "$remainingQuantity" } } },
    ]);
    furniture.totalStock = totalStock[0]?.total || 0;
    await furniture.save();

    res.status(200).json({ message: "Purchase successful", furniture });
  } catch (error) {
    console.error("Error processing purchase:", error);
    res.status(500).json({ message: "Failed to process purchase" });
  }
};

// Delete furniture
exports.deleteFurniture = async (req, res) => {
  try {
    const furniture = await Furniture.findByIdAndDelete(req.params.id);

    if (!furniture) {
      return res.status(404).json({ message: "Furniture not found" });
    }

    res.status(200).json({ message: "Furniture deleted successfully", furniture });
  } catch (error) {
    console.error("Error deleting furniture:", error);
    res.status(500).json({ message: "Failed to delete furniture" });
  }
};

// Search furniture by name
exports.searchFurniture = async (req, res) => {
  try {
    const query = req.query.query || "";
    if (!query) {
      return res.status(200).json([]);
    }

    const results = await Furniture.find({
      name: { $regex: `^${query}`, $options: "i" },
      active: true,
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Error searching furniture:", error);
    res.status(500).json({ message: "Failed to search furniture" });
  }
};

// Count active furniture
exports.countFurniture = async (req, res) => {
  try {
    const count = await Furniture.countDocuments({ active: true });
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error counting furniture:", error);
    res.status(500).json({ message: "Failed to count furniture" });
  }
};