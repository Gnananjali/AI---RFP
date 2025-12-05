// frontend/src/components/Vendors.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchVendors(); }, []);

  async function fetchVendors() {
    try {
      const res = await axios.get(`${API_URL}/api/vendors`);
      setVendors(res.data || []);
    } catch (err) {
      console.error("fetchVendors error:", err);
      setVendors([]);
    }
  }

  async function addVendor() {
    if (!name.trim() || !email.trim()) return alert("Enter name and email");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/vendors`, { name: name.trim(), email: email.trim() });
      setName(''); setEmail('');
      await fetchVendors();
    } catch (err) {
      console.error("addVendor error:", err);
      alert("Add vendor failed: " + (err?.response?.data?.error || err?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Vendors</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <button onClick={addVendor} disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
      </div>
      <ul>
        {vendors.map(v=> <li key={v._id}>{v.name} — {v.email}</li>)}
      </ul>
    </div>
  );
}
