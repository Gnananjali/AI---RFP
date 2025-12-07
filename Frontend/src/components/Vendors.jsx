import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function Vendors() {
  const [vendors, setVendors] = useState([]); // ✅ ALWAYS ARRAY
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    try {
      const res = await axios.get(`${API_URL}/api/vendors`);
      setVendors(Array.isArray(res.data) ? res.data : []); // ✅ SAFETY
    } catch (err) {
      console.error("Failed to load vendors", err);
      setVendors([]); // ✅ fallback
    }
  }

  async function addVendor() {
    if (!name || !email) return alert("Enter name & email");

    await axios.post(`${API_URL}/api/vendors`, { name, email });

    setName("");
    setEmail("");
    loadVendors(); // ✅ AUTO REFRESH
  }

  return (
    <div>
      <h3>Vendors</h3>

      <input
        placeholder="Vendor Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <input
        placeholder="Vendor Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <button onClick={addVendor}>Add Vendor</button>

      <ul>
        {vendors.length === 0 && <li>No vendors yet</li>}

        {vendors.map(v => (
          <li key={v._id}>
            {v.name} — {v.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
