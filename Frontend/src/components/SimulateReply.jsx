import React, { useState } from 'react';
import axios from 'axios';

export default function SimulateReply({ rfpId, vendors = [], onDone }) {
  const [vendorId, setVendorId] = useState(vendors[0]?._id || '');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // refresh vendor list when vendors prop changes
  React.useEffect(()=> { if (vendors[0]) setVendorId(vendors[0]._id); }, [vendors]);

  async function sendReply() {
    if (!vendorId || !text) return alert('choose vendor and paste reply text');
    setLoading(true);
    try {
      await axios.post(`/api/rfps/${rfpId}/simulate-reply`, { vendorId, text });
      alert('Simulated reply parsed and stored');
      setText('');
      if (onDone) onDone();
    } catch (err) { alert('Error: '+err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Simulate Vendor Reply</h3>
      <select value={vendorId} onChange={e=>setVendorId(e.target.value)}>
        {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
      </select>
      <textarea rows={6} value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the vendor's reply here (e.g. 'We can supply 20 laptops at $2000 each...')." style={{ width: '100%', marginTop: 8 }} />
      <button onClick={sendReply} disabled={loading}>{loading ? 'Parsing...' : 'Simulate Reply'}</button>
    </div>
  );
}
