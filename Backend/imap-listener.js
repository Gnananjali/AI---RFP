require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');

// ===============================
//  SAFE HELPERS
// ===============================
function safeReadJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    const data = fs.readFileSync(file, 'utf8').trim();
    return data ? JSON.parse(data) : fallback;
  } catch {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

// ===============================
//  LOAD PROPOSALS & STATE
// ===============================
let proposals = safeReadJSON('proposals.json', []);
let state = safeReadJSON('imap-state.json', { lastUID: 0 });

let lastUID = state.lastUID || 0;

function saveProposals() {
  fs.writeFileSync('proposals.json', JSON.stringify(proposals, null, 2));
}

function saveLastUID(uid) {
  lastUID = uid;
  fs.writeFileSync(
    'imap-state.json',
    JSON.stringify({ lastUID: uid }, null, 2)
  );
}

// ===============================
const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

// ===============================
imap.once('ready', () => {
  console.log('✅ IMAP CONNECTED');

  imap.openBox('INBOX', true, () => {
    console.log('📥 Waiting for NEW vendor replies...');
    fetchNewReplies();          // first scan
    imap.on('mail', fetchNewReplies); // only on NEW mail
  });
});

// ===============================
//  FETCH ONLY NEVER-SEEN EMAILS
// ===============================
function fetchNewReplies() {
  imap.search([['UID', `${lastUID + 1}:*`]], (err, results) => {
    if (err || !results || results.length === 0) return;

    const fetch = imap.fetch(results, { bodies: '', markSeen: true });

    fetch.on('message', msg => {
      let uid = null;

      msg.on('attributes', attrs => {
        uid = attrs.uid;
      });

      msg.on('body', stream => {
        simpleParser(stream, (err, parsed) => {
          if (err) return;

          const subject = parsed.subject || '';
          const body = parsed.text || '';
          const from = parsed.from?.text || '';

          //  HARD BLOCK: ONLY REAL VENDOR REPLIES
          if (!subject.includes('RFP REPLY')) {
            console.log('⏭️ Skipped non-RFP email:', subject);
            if (uid) saveLastUID(uid);
            return;
          }

          // EXTRACT RFP ID (MANDATORY)
          const subjectMatch = subject.match(/RFP ID:\s*(\d+)/);
          const bodyMatch = body.match(/RFP ID:\s*(\d+)/);
          const rfpId = subjectMatch?.[1] || bodyMatch?.[1];

          if (!rfpId) {
            console.log('❌ Skipped email without RFP ID');
            if (uid) saveLastUID(uid);
            return;
          }

          const priceMatch = body.match(/Price:\s*\$?\d+/i);
          const deliveryMatch = body.match(/Delivery:\s*\d+\s*days/i);

          const offer = priceMatch
            ? priceMatch[0].replace('Price:', '').trim()
            : 'Not detected';

          const delivery = deliveryMatch
            ? deliveryMatch[0].replace('Delivery:', '').trim()
            : 'Not detected';

          // ✅ DUPLICATE BLOCK (CRITICAL FIX)
          const alreadyExists = proposals.some(
            p =>
              p.rfpId === rfpId &&
              p.vendor === from &&
              p.offer === offer &&
              p.delivery === delivery
          );

          if (alreadyExists) {
            console.log('⚠️ Duplicate proposal ignored');
            if (uid) saveLastUID(uid);
            return;
          }

          const proposal = {
            rfpId,
            vendor: from,
            offer,
            delivery
          };

          proposals.push(proposal);
          saveProposals();
          saveLastUID(uid);

          console.log('✅ NEW VENDOR PROPOSAL SAVED:', proposal);
        });
      });
    });
  });
}

// ===============================
imap.once('error', err => console.error('❌ IMAP ERROR:', err));
imap.connect();
