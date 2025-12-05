// backend/routes/rfp.js
const express = require('express');
const router = express.Router();

const Rfp = require('../models/Rfp');
const Vendor = require('../models/Vendor');
const Proposal = require('../models/Proposal');

/* ---------- Helpers (improved) ---------- */

function normalizeBudgetToNumber(b) {
  if (b == null) return null;
  if (typeof b === 'number') return b;
  const s = String(b).replace(/[\$,]/g, '').trim().toLowerCase();
  if (/^[\d.]+k$/.test(s)) return Math.round(parseFloat(s) * 1000);
  if (/^[\d.]+m$/.test(s)) return Math.round(parseFloat(s) * 1000000);
  const m = s.match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return isNaN(n) ? null : Math.round(n);
}

// blacklist words that should not become items
const ITEM_BLACKLIST = new Set([
  'day','days','payment','delivery','budget','net30','net45','warranty','year','years','month','months'
]);

// extract items but skip "2 years", "30 days", etc.
function extractItemsFromText(text) {
  if (!text) return [];
  const regex = /(\d+)\s+([A-Za-z][A-Za-z0-9\-\s]{1,40}?)(?=[\s\.,;:\)]|$)/g;
  const found = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const qty = parseInt(m[1], 10);
    let name = (m[2] || '').trim();
    const short = name.split(/\s+/)[0].toLowerCase();
    // skip year/day/payment-like matches
    if (ITEM_BLACKLIST.has(short)) continue;
    // skip obviously numeric-only or tiny words
    if (short.length <= 2) continue;
    // remove trailing words like "with", "each", "per"
    name = name.replace(/\b(with|each|per|of|items?)$/i, '').trim();
    if (!name) continue;
    // Title-case the display name
    const display = name.replace(/\b\w/g, c => c.toUpperCase());
    if (qty > 0) found.push({ name: display, qty, specs: {} });
  }
  // dedupe and sum
  const map = {};
  found.forEach(it => {
    const key = it.name.toLowerCase();
    if (!map[key]) map[key] = { name: it.name, qty: 0, specs: {} };
    map[key].qty += it.qty;
  });
  return Object.values(map);
}

// prefer "total $39,000" or "total: $39,000" first, then fall back to other $ amounts
function extractBudgetFromText(text) {
  if (!text) return null;
  const totalMatch = text.match(/total[:\s]*\$?([\d,\.]+(?:k|m)?)/i);
  if (totalMatch) return normalizeBudgetToNumber(totalMatch[1]);
  // phrases like "budget $50,000"
  const budgetMatch = text.match(/budget[:\s]*\$?([\d,\.]+(?:k|m)?)/i);
  if (budgetMatch) return normalizeBudgetToNumber(budgetMatch[1]);
  // any $ number fallback
  const firstDollar = text.match(/\$[\d,\.]+(?:k|m)?/i);
  if (firstDollar) return normalizeBudgetToNumber(firstDollar[0]);
  return null;
}

// extract deadline from many phrasings (within X days, delivery in X days, by DATE, etc.)
function extractDeadlineFromText(text) {
  if (!text) return null;
  // "within 30 days"
  let m = text.match(/within\s+(\d{1,3})\s+days?/i);
  if (m) {
    const days = parseInt(m[1], 10);
    if (!isNaN(days)) {
      const d = new Date(Date.now() + days * 86400000);
      return d.toISOString();
    }
  }
  // "delivery in 30 days" or "delivery within 30 days" or "in 30 days"
  m = text.match(/\b(?:delivery|deliver|delivered)\s+(?:in|within)?\s*(\d{1,3})\s+days?/i) || text.match(/\bin\s+(\d{1,3})\s+days?\b/i);
  if (m) {
    const days = parseInt(m[1], 10);
    if (!isNaN(days)) {
      const d = new Date(Date.now() + days * 86400000);
      return d.toISOString();
    }
  }
  // ISO date: 2025-12-15
  m = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = new Date(m[1]);
    if (!isNaN(d)) return d.toISOString();
  }
  // DD/MM/YYYY
  m = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (m) {
    const d = new Date(m[1]);
    if (!isNaN(d)) return d.toISOString();
  }
  // by Jan 15, 2026 or by 15 Jan 2026
  m = text.match(/\bby\s+([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:,\s*\d{4})?)/i);
  if (m) {
    const d = new Date(m[1]);
    if (!isNaN(d)) return d.toISOString();
  }
  return null;
}

// parse vendor reply heuristically
function parseProposalFromText(text) {
  if (!text) return {
    totalPrice: null, currency: null, deliveryDays: null, warranty: null, paymentTerms: null, lineItems: [], notes: null
  };

  const totalMatch = text.match(/total[:\s]*\$?([\d,\.]+(?:k|m)?)/i) || text.match(/\$[\d,\.]+(?:k|m)?/i);
  const totalPrice = totalMatch ? normalizeBudgetToNumber(totalMatch[1] || totalMatch[0]) : null;
  const currency = totalMatch && /\$/.test(totalMatch[0]) ? '$' : null;
  const deliveryMatch = text.match(/delivery.*?(\d{1,3})\s*days?/i) || text.match(/in\s+(\d{1,3})\s+days?/i);
  const deliveryDays = deliveryMatch ? parseInt(deliveryMatch[1], 10) : null;
  const warrantyMatch = text.match(/(\d{1,2}\s*(year|years|month|months))\s*warranty/i) || text.match(/warranty[:\s]*([^\.\n]+)/i);
  const warranty = warrantyMatch ? warrantyMatch[0] : null;
  const paymentMatch = text.match(/\b(net\s*\d{1,3}|payment\s*terms[:\s]*[^\.\n]+)/i);
  const paymentTerms = paymentMatch ? paymentMatch[0] : null;

  // line items like "20 laptops at $1950 each"
  const lineItems = [];
  const liRegex = /(\d+)\s+([A-Za-z][A-Za-z0-9\-\s]{1,40}?)\s*(?:at|@)?\s*\$?([\d,\.]+(?:k|m)?)/gi;
  let it;
  while ((it = liRegex.exec(text)) !== null) {
    const qty = parseInt(it[1], 10);
    const name = (it[2] || '').trim();
    const unitPrice = normalizeBudgetToNumber(it[3]);
    if (qty > 0 && name && !ITEM_BLACKLIST.has(name.split(/\s+/)[0].toLowerCase())) {
      lineItems.push({ name: name.replace(/\b\w/g, c => c.toUpperCase()), qty, unitPrice });
    }
  }

  return {
    totalPrice,
    currency,
    deliveryDays,
    warranty,
    paymentTerms,
    lineItems,
    notes: text.trim()
  };
}

/* ---------- Routes ---------- */

router.post('/', async (req, res) => {
  try {
    const { nlText, title } = req.body;
    if (!nlText) return res.status(400).json({ error: 'nlText required' });

    const budget = extractBudgetFromText ? extractBudgetFromText(nlText) : extractBudgetFromText(nlText);
    const items = extractItemsFromText(nlText);
    const deadline = extractDeadlineFromText(nlText);

    const parsed = {
      title: title || (nlText.length > 60 ? nlText.slice(0, 60) + '...' : nlText),
      description: nlText,
      budget: budget,
      deadline: deadline,
      items: items
    };

    const rfp = new Rfp(parsed);
    await rfp.save();
    return res.json(rfp);
  } catch (err) {
    console.error('POST /api/rfps error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rfp = await Rfp.findById(req.params.id).populate('selectedVendors').lean();
    if (!rfp) return res.status(404).json({ error: 'RFP not found' });
    const proposals = await Proposal.find({ rfpId: rfp._id }).populate('vendorId').lean();
    return res.json({ rfp, proposals });
  } catch (err) {
    console.error('GET /api/rfps/:id error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { vendorIds } = req.body;
    const rfp = await Rfp.findById(req.params.id);
    if (!rfp) return res.status(404).json({ error: 'RFP not found' });

    rfp.selectedVendors = Array.isArray(vendorIds) ? vendorIds : [];
    await rfp.save();

    const vendors = await Vendor.find({ _id: { $in: rfp.selectedVendors } }).lean();
    return res.json({ ok: true, message: `RFP assigned to ${vendors.length} vendors (simulated)`, vendors });
  } catch (err) {
    console.error('POST /api/rfps/:id/send error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/simulate-reply', async (req, res) => {
  try {
    const { vendorId, text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const rfp = await Rfp.findById(req.params.id);
    if (!rfp) return res.status(404).json({ error: 'RFP not found' });

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    let parsed;
    try {
      parsed = parseProposalFromText(text);
    } catch (err) {
      parsed = { totalPrice: null, currency: null, deliveryDays: null, warranty: null, paymentTerms: null, lineItems: [], notes: text };
    }

    // scoring heuristics
    let score = 50;
    if (parsed.totalPrice != null && rfp.budget != null) {
      const ratio = parsed.totalPrice / rfp.budget;
      score += ratio <= 1 ? Math.round((1 - ratio) * 30) : -Math.round((ratio - 1) * 30);
    }
    if (parsed.deliveryDays != null) {
      score += parsed.deliveryDays <= 15 ? 10 : (parsed.deliveryDays <= 30 ? 5 : -5);
    }
    if (parsed.warranty) score += 3;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const proposal = new Proposal({
      rfpId: rfp._id,
      vendorId: vendor._id,
      rawText: text,
      parsed,
      aiSummary: parsed.notes ? parsed.notes.slice(0, 120) : 'No summary',
      score
    });

    await proposal.save();
    const saved = await Proposal.findById(proposal._id).populate('vendorId').lean();
    return res.json({ ok: true, proposal: saved });
  } catch (err) {
    console.error('POST /api/rfps/:id/simulate-reply error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/compare', async (req, res) => {
  try {
    const rfp = await Rfp.findById(req.params.id).lean();
    if (!rfp) return res.status(404).json({ error: 'RFP not found' });
    const proposals = await Proposal.find({ rfpId: rfp._id }).populate('vendorId').lean();
    const best = proposals.reduce((acc, p) => (acc == null || (p.score || 0) > (acc.score || 0)) ? p : acc, null);
    return res.json({ rfp, proposals, best });
  } catch (err) {
    console.error('GET /api/rfps/:id/compare error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
