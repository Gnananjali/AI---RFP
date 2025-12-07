// frontend/src/components/RfpDetail.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config"; // keep your config file

/* ----------------- Small helper components ----------------- */

/* SendRfpButton: calls the backend /api/send-rfp endpoint */
function SendRfpButton({ rfpId, selectedVendorIds = [], onSent }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSend() {
    if (!rfpId) return alert("No RFP selected");
    if (!selectedVendorIds || selectedVendorIds.length === 0) return alert("Select at least one vendor");

    setError(null);
    setLoading(true);
    try {
      // call the centralized endpoint: POST /api/send-rfp
      const res = await axios.post(`${API_URL}/api/send-rfp`, {
        rfpId,
        vendorIds: selectedVendorIds
      });
      setResult(res.data);
      setLoading(false);
      alert("RFP sent. Check vendor inboxes.");
      if (onSent) onSent(res.data);
    } catch (err) {
      console.error("sendRfp error:", err);
      setError(err?.response?.data?.error || err.message || "Send failed");
      setLoading(false);
      alert("Send failed: " + (err?.response?.data?.error || err.message));
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={handleSend}
        disabled={loading || !selectedVendorIds?.length}
        style={{
          background: "#2563eb",
          color: "white",
          padding: "8px 14px",
          borderRadius: 6,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Sending..." : "Send RFP to selected vendors"}
      </button>

      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 8, background: "#f3f4f6", padding: 8, borderRadius: 6 }}>
          <strong>Send result:</strong>
          <pre style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/* Small SimulateReply included so this file stays self-contained.
   This will call your simulate endpoint (dev only). */
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
      <h4 style={{ marginTop: 0 }}>Simulate Vendor Reply (dev only)</h4>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <select
          value={vendorId || ""}
          onChange={(e) => setVendorId(e.target.value)}
          style={{ padding: 8, borderRadius: 8 }}
        >
          <option value="">-- select vendor --</option>
          {vendors.map(v => (
            <option key={v._id} value={v._id}>
              {v.name} ({v.email})
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            setText(
              "We can supply 20 laptops at $1950 each (total $39,000); monitors 15 at $160 each (total $2,400). Delivery in 30 days. 2 years warranty. Net45."
            )
          }
        >
          Sample
        </button>
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

/* ----------------- Main component ----------------- */
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
      setData(r.data || null);
      // If the RFP has preselected vendor IDs (optional), set them:
      const sel = (r.data?.rfp?.selectedVendors || []).map(v => String(v._id || v));
      setSelectedVendorIds(sel);
    } catch (err) {
      console.error("loadRfp error:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Sending (real) ---------- */
  async function sendSelected() {
    if (!rfpId) return alert("No RFP");
    if (!selectedVendorIds || selectedVendorIds.length === 0) return alert("Select at least one vendor");

    try {
      // Primary: call central endpoint
      const res = await axios.post(`${API_URL}/api/send-rfp`, {
        rfpId,
        vendorIds: selectedVendorIds
      });
      // backend returns info about sends
      console.log("send-rfp response", res.data);
      alert("RFP emails sent. Check vendor inboxes.");
      // refresh RFP/proposals
      await loadRfp();
    } catch (err) {
      console.error("sendSelected error:", err);

      // Fallback: if your backend uses a different endpoint, try the per-rfp send
      try {
        const fallback = await axios.post(`${API_URL}/api/rfps/${rfpId}/send`, { vendorIds: selectedVendorIds });
        console.log("fallback send response", fallback.data);
        alert("RFP emails sent (fallback).");
        await loadRfp();
      } catch (err2) {
        console.error("fallback send failed", err2);
        alert("Send failed: " + (err2?.response?.data?.error || err2?.message || "unknown"));
      }
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
    const parsed = p?.parsed || p?.parsedJson || {};
    return (
      <div className="proposal-card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ maxWidth: "70%" }}>
            <div style={{ fontWeight: 700 }}>{p.vendorId?.name || p.vendorId?.email || "Vendor"}</div>
            <div style={{ color: "#6b7280", marginTop: 6 }}>{p.aiSummary || parsed.notes || p.rawText?.slice(0, 140) || p.rawBody?.slice(0,140)}</div>
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
      {/* RFP Summary */}
      <div style={{ marginBottom: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>RFP Detail</h2>
          {loading ? <div>Loading...</div> : <RfpSummary rfp={data?.rfp} />}
        </div>
      </div>

      {/* Vendors management */}
      <div className="card" style={{ marginBottom: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Vendors</h3>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} placeholder="Name" />
          <input value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)} placeholder="Email" />
          <button onClick={addVendor}>Add</button>
        </div>

        <ul style={{ marginTop: 8 }}>
          {vendors.map(v => <li key={v._id}>{v.name} — {v.email}</li>)}
        </ul>
      </div>

      {/* Select vendors to send */}
      <div className="card" style={{ marginBottom: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Select vendors to send</h3>

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
          {/* Use real sending button */}
          <SendRfpButton rfpId={rfpId} selectedVendorIds={selectedVendorIds} onSent={loadRfp} />

          {/* Optional: keep the old simulated button for dev only (commented out) */}
          {/* <button onClick={sendSelected}>Send RFP to selected vendors (simulated)</button> */}
        </div>
      </div>

      {/* Simulate reply (dev tool) */}
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
