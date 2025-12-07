import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function Proposals() {
  const [proposals, setProposals] = useState([]);

  async function load() {
    try {
      const res = await axios.get(`${API_URL}/api/proposals`);

      // ✅ AI LOGIC: find best automatically
      const scored = res.data.map(p => {
        const price = parseInt(p.offer.replace(/\D/g, "")) || 999999;
        const delivery = parseInt(p.delivery.replace(/\D/g, "")) || 999999;
        return { ...p, score: price + delivery };
      });

      scored.sort((a, b) => a.score - b.score);

      // ✅ Mark best
      const best = scored.length > 0 ? scored[0] : null;
      const final = scored.map(p => ({
        ...p,
        isBest: best && p.offer === best.offer && p.delivery === best.delivery
      }));

      setProposals(final);
    } catch (err) {
      console.error("❌ Failed to load proposals");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h2>Replies & Comparison</h2>

      {proposals.length === 0 && <p>No replies yet</p>}

      {proposals.map((p, i) => (
        <div
          key={i}
          style={{
            border: "2px solid",
            borderColor: p.isBest ? "green" : "#ccc",
            padding: 10,
            marginBottom: 10,
            borderRadius: 6,
            background: p.isBest ? "#eaffea" : "#fff"
          }}
        >
          <b>{p.vendor}</b>
          <p>Offer: {p.offer}</p>
          <p>Delivery: {p.delivery}</p>

          {p.isBest && <b style={{ color: "green" }}>✅ AI BEST</b>}
        </div>
      ))}
    </div>
  );
}
