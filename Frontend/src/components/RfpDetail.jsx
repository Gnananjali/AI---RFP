// frontend/src/components/RfpDetail.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config"; // make sure frontend/src/config.js exists and exports API_URL

/* Small SimulateReply included so this file is self-contained */
function SimulateReply({ rfpId, onDone, vendors = [] }) {
  const [vendorId, setVendorId] = useState(vendors[0]?._id || "");
  const [text, setText] = useState("");

  useEffect(() => {
    setVendorId(vendors[0]?._id || "");
  }, [vendors]);

  async function submit() {
    if (!rfpId) return alert("No RFP selected");
    if (!vendorId) return alert("Select vendor");
    if (!text) return alert("Enter reply text");

    try {
      await axios.post(`${API_URL}/api/rfps/${rfpId}/simulate-reply`, { vendorId, text });
      alert("Simulated reply saved");
      setText("");
      onDone?.();
    } catch (err) {
      console.error("Simulate reply error:", err);
      alert("Simulate failed: " + (err?.response?.data?.error || err.message));
    }
  }

  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Simulate Vendor Reply</h4>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <select value={vendorId || ""} onChange={(e) => setVendorId(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="">-- select vendor --</option>
          {vendors.map(v => <option key={v._id} value={v._1d || v._id}>{v.name} ({v.email})</option>)}
        </select>
        <button onClick={() => setText("We can supply 20 laptops at $1950 each (total $39,000); monitors 15 at $160 each (total $2,400). Delivery in 30 days. 2 years warranty. Net45.")}>Sample</button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8, boxSizing: "border-box", marginBottom: 8 }}
      />

      <div>
        <button onClick={submit}>Save simulated reply</button>
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */
export default function RfpDetail({ rfpId }) {
  const [data, setData] = useState(null); // { rfp, proposals }
  const [vendors, setVendors] = useState([]); // single source of truth for vendors
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [compare, setCompare] = useState(null);
  const [loading, setLoading] = useState(false);

  // vendor add form
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");

  useEffect(() => {
    loadVendors();
    if (rfpId) loadRfp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfpId]);

  /* ---------- API calls ---------- */
  async function loadVendors() {
    try {
      const r = await axios.get(`${API_URL}/api/vendors`);
      // Expect r.data to be an array
      setVendors(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      console.error("loadVendors error:", err);
      setVendors([]);
    }
  }

  async function addVendor() {
    if (!newVendorName || !newVendorEmail) return alert("Enter name and email");
    try {
      const r = await axios.post(`${API_URL}/api/vendors`, { name: newVendorName, email: newVendorEmail });
      // if API returns the created vendor, append it, otherwise reload
      if (r?.data) setVendors(prev => [...prev, r.data]);
      else await loadVendors();
      setNewVendorName("");
      setNewVendorEmail("");
    } catch (err) {
      console.error("addVendor error:", err);
      alert("Add vendor failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function loadRfp() {
    if (!rfpId) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/api/rfps/${rfpId}`);
      // r.data expected { rfp, proposals }
      setData(r.data || null);
      // ensure selectedVendorIds is string array
      const sel = (r.data?.rfp?.selectedVendors || []).map(v => String(v._id || v));
      setSelectedVendorIds(sel);
    } catch (err) {
      console.error("loadRfp error:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function sendSelected() {
    if (!rfpId) return alert("No RFP");
    try {
      await axios.post(`${API_URL}/api/rfps/${rfpId}/send`, { vendorIds: selectedVendorIds });
      alert("RFP sent (simulated)");
      loadRfp();
    } catch (err) {
      console.error("sendSelected error:", err);
      alert("Send failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function doCompare() {
    if (!rfpId) return;
    try {
      const r = await axios.get(`${API_URL}/api/rfps/${rfpId}/compare`);
      setCompare(r.data || null);
    } catch (err) {
      console.error("doCompare error:", err);
      alert("Compare failed: " + (err?.response?.data?.error || err.message));
    }
  }

  /* ---------- small render helpers ---------- */
  function RfpSummary({ rfp }) {
    if (!rfp) return <div style={{ color: "#6b7280" }}>No RFP selected</div>;

    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>RFP Summary</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Title</div>
            <div style={{ fontWeight: 700 }}>{rfp.title || rfp.description || "—"}</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Status</div>
            <div style={{ fontWeight: 700 }}>{rfp.status || "—"}</div>
          </div>

          <div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Budget</div>
            <div style={{ fontWeight: 700 }}>{rfp.budget != null ? `$${Number(rfp.budget).toLocaleString()}` : "—"}</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Deadline</div>
            <div style={{ fontWeight: 700 }}>{rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Description</div>
          <div style={{ marginTop: 8 }}>{rfp.description}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Items</div>
          <div style={{ marginTop: 8 }}>
            {Array.isArray(rfp.items) && rfp.items.length > 0 ? (
              <ul>{rfp.items.map((it, i) => <li key={i}><strong>{it.name}</strong> — qty: {it.qty ?? "—"}</li>)}</ul>
            ) : <div style={{ color: "#6b7280" }}>No items</div>}
          </div>
        </div>
      </div>
    );
  }

  function ProposalCard({ p }) {
    const parsed = p?.parsed || {};
    return (
      <div className="proposal-card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ maxWidth: "70%" }}>
            <div style={{ fontWeight: 700 }}>{p.vendorId?.name || p.vendorId?.email || "Vendor"}</div>
            <div style={{ color: "#6b7280", marginTop: 6 }}>{p.aiSummary || parsed.notes || p.rawText?.slice(0, 140)}</div>
            <div style={{ marginTop: 8 }}>
              <strong>Total:</strong> {parsed.totalPrice != null ? `${parsed.currency || "$"}${parsed.totalPrice}` : "—"} &nbsp;
              <strong>Delivery:</strong> {parsed.deliveryDays ? `${parsed.deliveryDays} days` : "—"}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="score-badge">Score {p.score ?? "—"}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(p, null, 2)); alert("Proposal JSON copied"); }}>Copy JSON</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- final render ---------- */
  return (
    <div>
      {/* LEFT: Created JSON / Create RFP card in your app may be elsewhere.
          Here we show RFP summary on top and vendors below. */}
      <div style={{ marginBottom: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>RFP Detail</h2>
          {loading ? <div>Loading...</div> : <RfpSummary rfp={data?.rfp} />}
        </div>
      </div>

      {/* VENDORS MANAGEMENT */}
      <div className="card" style={{ marginBottom: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Vendors</h3>

      

        {/* Simple list */}
        <ul style={{ marginTop: 8 }}>
          {vendors.map(v => <li key={v._id}>{v.name} — {v.email}</li>)}
        </ul>
      </div>

      {/* SELECT VENDORS TO SEND */}
      <div className="card" style={{ marginBottom: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Select vendors to send</h3>

        {/* IMPORTANT: use the same 'vendors' state for rendering these rows */}
        <div>
          {vendors.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No vendors yet</div>
          ) : (
            vendors.map(v => (
              <label key={v._id} className="vendor-row" style={{ display: "grid", gridTemplateColumns: "28px auto", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={selectedVendorIds.includes(String(v._id))}
                  onChange={(e) => {
                    const id = String(v._id);
                    setSelectedVendorIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
                  }}
                />
                <div>
                  <div className="vendor-name">{v.name}</div>
                  <div className="vendor-email">{v.email}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={sendSelected}>Send RFP to selected vendors (simulated)</button>
        </div>
      </div>

      {/* Simulate reply */}
      <div className="card" style={{ marginBottom: 12, padding: 16 }}>
        <SimulateReply rfpId={rfpId} onDone={loadRfp} vendors={vendors} />
      </div>

      {/* Proposals */}
      <div className="card" style={{ marginBottom: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Proposals</h3>
        {(!data || !data.proposals || data.proposals.length === 0) ? (
          <div style={{ color: "#6b7280" }}>No proposals yet</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {data.proposals.map(p => <ProposalCard key={p._id} p={p} />)}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button onClick={doCompare}>Show comparison</button>
        </div>

        {/* pretty compare area */}
        {compare && (
          <div style={{ marginTop: 12 }}>
            <h3>Comparison</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {(!compare.proposals || compare.proposals.length === 0) ? (
                <div style={{ color: "#6b7280" }}>No proposals</div>
              ) : (
                compare.proposals.map(p => (
                  <div key={p._id} style={{ display: "flex", justifyContent: "space-between", padding: 12, border: "1px solid #eef2ff", borderRadius: 8 }}>
                    <div style={{ maxWidth: "72%" }}>
                      <div style={{ fontWeight: 700 }}>{p.vendorId?.name || "Vendor"}</div>
                      <div style={{ color: "#6b7280", marginTop: 6 }}>{p.aiSummary || p.parsed?.notes || p.rawText?.slice(0,150)}</div>
                      <div style={{ marginTop: 8 }}>
                        <strong>Total:</strong> {p.parsed?.totalPrice != null ? `${p.parsed.currency || "$"}${p.parsed.totalPrice}` : "—"} &nbsp;
                        <strong>Delivery:</strong> {p.parsed?.deliveryDays ? `${p.parsed.deliveryDays} days` : "—"} &nbsp;
                        <strong>Warranty:</strong> {p.parsed?.warranty || "—"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#374151" }}>Score</div>
                      <div style={{ marginTop: 6, fontWeight: 800, fontSize: 20 }}>{p.score ?? "—"}</div>
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(p, null, 2)); alert("Proposal JSON copied"); }}>Copy JSON</button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div>
                <h4>Best proposal</h4>
                {compare.best ? (
                  <div className="best-proposal-card" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 800 }}>{compare.best.vendorId?.name || "Vendor"}</div>
                    <div style={{ marginTop: 8 }}>{compare.best.aiSummary || compare.best.parsed?.notes}</div>
                    <div style={{ marginTop: 8 }}>
                      <strong>Score:</strong> {compare.best.score ?? "—"} &nbsp;
                      <strong>Total:</strong> {compare.best.parsed?.totalPrice != null ? `${compare.best.parsed.currency || "$"}${compare.best.parsed.totalPrice}` : "—"} &nbsp;
                      <strong>Delivery:</strong> {compare.best.parsed?.deliveryDays ? `${compare.best.parsed.deliveryDays} days` : "—"}
                    </div>
                  </div>
                ) : <div style={{ color: "#6b7280" }}>No best proposal yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
