import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function RfpCreate({ onRfpCreated }) {
  const [text, setText] = useState("");

  async function createRfp() {
    if (!text.trim()) {
      alert("Enter RFP text");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/rfps`, {
        nlText: text
      });

      // ✅ THIS IS THE MOST IMPORTANT FIX
      onRfpCreated(res.data);

      setText("");
      alert("✅ RFP Created");

    } catch (err) {
      console.error(err);
      alert("❌ Failed to create RFP");
    }
  }

  return (
    <div>
      <h3>Create RFP (natural language)</h3>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        style={{ width: "100%" }}
      />

      <br />
      <button onClick={createRfp}>Create RFP</button>
    </div>
  );
}
