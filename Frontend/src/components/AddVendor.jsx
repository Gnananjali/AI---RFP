import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function AddVendor({ onAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function submit() {
    const res = await axios.post(`${API_URL}/api/vendors`, {
      name,
      email,
    });

    onAdded(res.data); // ✅ THIS is what updates UI live
    setName("");
    setEmail("");
  }

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={submit}>Add Vendor</button>
    </div>
  );
}
