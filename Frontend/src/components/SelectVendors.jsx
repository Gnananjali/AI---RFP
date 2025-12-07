import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SelectVendors({ selectedRfpId }) {
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState([]);

  // ✅ Load vendors
  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await axios.get(`${API_URL}/api/vendors`);
        setVendors(res.data);
      } catch (err) {
        console.error('Failed to load vendors', err);
      }
    }
    loadVendors();
  }, []);

  function toggleVendor(id) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  }

  // ✅ ✅ ✅ REAL EMAIL SENDING FUNCTION
async function sendRfp() {
  try {
    if (!selectedRfpId) {
      alert("❌ Create an RFP first");
      return;
    }

    if (selected.length === 0) {
      alert("❌ Select at least one vendor");
      return;
    }

    const rfpRes = await axios.get(`${API_URL}/api/rfps`);
    const activeRfp = rfpRes.data.find(r => r._id === selectedRfpId);

    if (!activeRfp) {
      alert("❌ RFP not found");
      return;
    }

    const payload = {
      vendorIds: selected,
      rfpText: activeRfp.text,
      rfpId: selectedRfpId
    };

    console.log("✅ Sending payload:", payload);

    await axios.post(`${API_URL}/api/send-rfp`, payload);

    alert("✅ RFP sent successfully!");

  } catch (err) {
    console.error("❌ SEND RFP FAILED:", err.response?.data || err.message);
    alert("❌ Send RFP Failed");
  }
}



  return (
    <div>
      <h3>Select vendors to send</h3>

      {vendors.length === 0 && <p>No vendors yet</p>}

      {vendors.map(v => (
        <label key={v._id} style={{ display: 'block', marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={selected.includes(v._id)}
            onChange={() => toggleVendor(v._id)}
          />
          {' '}
          {v.name} — {v.email}
        </label>
      ))}

      <button
        onClick={sendRfp}
        style={{ marginTop: 10 }}
      >
        Send RFP to selected vendors
      </button>
    </div>
  );
}
