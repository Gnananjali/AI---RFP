// backend/routes/vendor.js
const express = require("express");
const router = express.Router();
const Vendor = require("../models/Vendor");

// Create vendor
router.post("/", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email required" });

    const vendor = new Vendor({ name, email });
    await vendor.save();

    res.json(vendor);
  } catch (err) {
    console.error("POST /api/vendors error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all vendors
router.get("/", async (req, res) => {
  try {
    const vendors = await Vendor.find().lean();
    res.json(vendors);
  } catch (err) {
    console.error("GET /api/vendors error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
