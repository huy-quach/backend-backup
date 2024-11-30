const ImportHistory = require("../models/importhistory");
const Furniture = require("../models/furniture");

exports.addImport = async (req, res) => {
  try {
    const { productId, quantity, costPrice, salePrice, supplier } = req.body;

    const product = await Furniture.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Tạo một bản ghi riêng cho mỗi lần nhập
    const newImport = new ImportHistory({
      product: productId,
      quantity, // Số lượng nhập riêng cho lần này
      costPrice,
      salePrice,
      supplier,
      entryDate: new Date(),
    });

    await newImport.save();

    res.status(201).json({ message: "Import history recorded successfully!", newImport });
  } catch (error) {
    console.error("Error adding import history:", error);
    res.status(500).json({ message: "Failed to add import history" });
  }
};


exports.getImportHistory = async (req, res) => {
  try {
    const history = await ImportHistory.find()
      .populate("product", "name")
      .sort({ entryDate: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching import history:", error);
    res.status(500).json({ message: "Failed to fetch import history" });
  }
};

exports.filterImportHistory = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter = {};

    if (dateFrom) filter.entryDate = { $gte: new Date(dateFrom) };
    if (dateTo) filter.entryDate = { ...filter.entryDate, $lte: new Date(dateTo) };

    const history = await ImportHistory.find(filter)
      .populate("product", "name")
      .sort({ entryDate: -1 });

    res.status(200).json(history);
  } catch (error) {
    console.error("Error filtering import history:", error);
    res.status(500).json({ message: "Failed to filter import history" });
  }
};
