const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  name: String,
  qty: Number,
  specs: Schema.Types.Mixed
});

const RfpSchema = new Schema({
  title: String,
  description: String,
  budget: Number,
  deadline: Date,
  items: [ItemSchema],
  selectedVendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rfp', RfpSchema);
