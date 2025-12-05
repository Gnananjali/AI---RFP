const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProposalSchema = new Schema({
  rfpId: { type: Schema.Types.ObjectId, ref: 'Rfp' },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  rawText: String,
  parsed: Schema.Types.Mixed,
  aiSummary: String,
  score: Number,
  receivedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Proposal', ProposalSchema);
