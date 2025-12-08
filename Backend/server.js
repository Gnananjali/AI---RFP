require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// ================================
//  SAFE FILE HELPERS
// ================================
function safeReadJSON(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  try {
    const data = fs.readFileSync(file, 'utf8').trim();
    return data ? JSON.parse(data) : fallback;
  } catch {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

// ================================
//  PERSISTENT STORAGE
// ================================
let vendors = safeReadJSON('vendors.json', []);
let proposals = safeReadJSON('proposals.json', []);
let rfps = [];

function saveVendors() {
  fs.writeFileSync('vendors.json', JSON.stringify(vendors, null, 2));
}

function saveProposals() {
  fs.writeFileSync('proposals.json', JSON.stringify(proposals, null, 2));
}

// ================================
//  EMAIL TRANSPORT
// ================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ================================
//  TEST ROUTE
// ================================
app.get('/', (req, res) => {
  res.send('✅ Backend is running');
});

// ================================
//  VENDORS API
// ================================
app.get('/api/vendors', (req, res) => {
  res.json(vendors);
});

app.post('/api/vendors', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name & Email required' });
  }

  const vendor = {
    _id: Date.now().toString(),
    name,
    email
  };

  vendors.push(vendor);
  saveVendors();

  console.log('✅ Vendor added:', vendor);
  res.json(vendor);
});

// ================================
//  RFP API
// ================================
app.post('/api/rfps', (req, res) => {
  const { nlText } = req.body;
  if (!nlText) return res.status(400).json({ error: 'RFP text required' });

  const text = nlText.toLowerCase();

  const items = [];
  if (text.includes('laptop')) items.push('Laptops');
  if (text.includes('monitor')) items.push('Monitors');
  if (text.includes('printer')) items.push('Printers');

  const budget = nlText.match(/\$[\d,]+/)?.[0] || null;
  const deliveryMatch = nlText.match(/(\d+)\s*days/);
  const delivery = deliveryMatch ? deliveryMatch[1] + ' days' : null;

  const paymentTerms =
    text.includes('net30') ? 'Net30' :
    text.includes('net45') ? 'Net45' :
    null;

  const rfp = {
    _id: Date.now().toString(),
    text: nlText,
    structured: { items, budget, delivery, paymentTerms }
  };

  rfps.push(rfp);
  console.log('✅ RFP CREATED:', rfp);
  res.json(rfp);
});

app.get('/api/rfps', (req, res) => {
  res.json(rfps);
});

// ================================
//  SEND RFP EMAIL
// ================================
app.post('/api/send-rfp', async (req, res) => {
  console.log("✅ SEND RFP BODY RECEIVED:", req.body);

  const { vendorIds, rfpText, rfpId } = req.body;

  if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
    return res.status(400).json({ error: 'No vendors selected' });
  }

  if (!rfpText || !rfpId) {
    return res.status(400).json({ error: 'Invalid RFP data' });
  }

  const selectedVendors = vendors.filter(v =>
    vendorIds.includes(v._id)
  );

  try {
    for (let vendor of selectedVendors) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: vendor.email,
        subject: `RFP REPLY | RFP ID: ${rfpId}`,
        text: `
RFP ID: ${rfpId}

${rfpText}

=========================
REPLY WITH:
Subject: RFP REPLY | RFP ID: ${rfpId}

Price:
Delivery:
=========================
`
      });
    }

    console.log('✅ RFP EMAILS SENT');
    res.json({ success: true });

  } catch (err) {
    console.error('❌ EMAIL ERROR:', err);
    res.status(500).json({ error: 'Email sending failed' });
  }
});

// ================================
//  PROPOSALS API
// ================================
app.get('/api/proposals', (req, res) => {
  proposals = safeReadJSON('proposals.json', []);
  res.json(proposals);
});

// ================================
//  AI BEST WINNER API
// ================================
app.get('/api/winner/:rfpId', (req, res) => {
  proposals = safeReadJSON('proposals.json', []);

  const rfpProposals = proposals.filter(
    p => p.rfpId === req.params.rfpId
  );

  if (rfpProposals.length === 0) return res.json(null);

  const scored = rfpProposals.map(p => {
    const price = parseInt((p.offer || '').replace(/\D/g, '')) || 999999;
    const delivery = parseInt((p.delivery || '').replace(/\D/g, '')) || 999999;
    return { ...p, score: price + delivery };
  });

  scored.sort((a, b) => a.score - b.score);
  res.json(scored[0]);
});

// ✅===============================
// ✅ AUTO IMAP EMAIL LISTENER (FREE MODE)
// ✅===============================
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

let lastUID = 0;

if (fs.existsSync('imap-state.json')) {
  try {
    lastUID = JSON.parse(fs.readFileSync('imap-state.json')).lastUID || 0;
  } catch {
    lastUID = 0;
  }
}

function saveLastUID(uid) {
  fs.writeFileSync('imap-state.json', JSON.stringify({ lastUID: uid }));
}

imap.once('ready', () => {
  console.log('✅ IMAP CONNECTED (FREE MODE)');

  imap.openBox('INBOX', true, () => {
    console.log('📥 Auto-listening for vendor replies...');
  });

  // ✅ Poll Gmail every 20 seconds (FREE SAFE METHOD)
  setInterval(fetchNewReplies, 20000);
});

function fetchNewReplies() {
  imap.search([['UID', `${lastUID + 1}:*`]], (err, results) => {
    if (err || !results.length) return;

    const fetch = imap.fetch(results, { bodies: '', markSeen: true });

    fetch.on('message', msg => {
      let uid;

      msg.on('attributes', attrs => {
        uid = attrs.uid;
      });

      msg.on('body', stream => {
        simpleParser(stream, (err, parsed) => {
          if (err) return;

          const subject = parsed.subject || '';
          const body = parsed.text || '';
          const from = parsed.from?.text || '';

          // ✅ ONLY ACCEPT RFP REPLIES
          if (!subject.includes('RFP REPLY')) return;

          const rfpMatch = subject.match(/RFP ID:\s*(\d+)/);
          const rfpId = rfpMatch ? rfpMatch[1] : null;

          const priceMatch = body.match(/Price:\s*\$?\d+/i);
          const deliveryMatch = body.match(/Delivery:\s*\d+\s*days/i);

          const proposal = {
            rfpId,
            vendor: from,
            offer: priceMatch ? priceMatch[0].replace('Price:', '').trim() : 'Not detected',
            delivery: deliveryMatch ? deliveryMatch[0].replace('Delivery:', '').trim() : 'Not detected'
          };

          proposals.push(proposal);
          fs.writeFileSync('proposals.json', JSON.stringify(proposals, null, 2));

          saveLastUID(uid);

          console.log('✅ LIVE VENDOR REPLY SAVED:', proposal);
        });
      });
    });
  });
}

imap.once('error', err => console.error('❌ IMAP ERROR:', err));
imap.connect();

app.delete("/api/clear-proposals", (req, res) => {
  proposals = [];
  fs.writeFileSync("proposals.json", JSON.stringify([], null, 2));
  res.json({ success: true, message: "✅ All proposals cleared" });
});

app.get("/api/clear-proposals", (req, res) => {
  proposals = [];
  fs.writeFileSync("proposals.json", JSON.stringify([], null, 2));
  res.json({ success: true, message: "✅ All proposals cleared (GET)" });
});

// ================================
app.listen(4000, () => {
  console.log('✅ Backend running on http://localhost:4000');
});
