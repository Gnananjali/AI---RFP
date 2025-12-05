// frontend/src/components/RfpCreate.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function RfpCreate({ onCreated }) {
  const [nl, setNl] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  async function createRfp() {
    if (!nl.trim()) return alert("Please enter RFP text");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/rfps`, { nlText: nl });
      setCreated(res.data);
      if (onCreated) onCreated(res.data);
    } catch (err) {
      console.error("createRfp error:", err);
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  }

  return (
    <div className="card">
      <h2>Create RFP (natural language)</h2>
      <textarea
        value={nl}
        onChange={e=>setNl(e.target.value)}
        rows={6}
        style={{ width: '100%' }}
        placeholder='e.g. "We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Budget $50,000. Delivery within 30 days. Net30 payment."'
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={createRfp} disabled={loading}>{loading ? 'Creating...' : 'Create RFP'}</button>
      </div>

      {created && (
        <div style={{ marginTop: 12, background: '#f5f5f5', padding: 10 }}>
          <h3>Created</h3>
          <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(created, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
