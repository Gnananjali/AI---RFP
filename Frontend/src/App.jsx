// frontend/src/App.jsx
import React, { useState } from 'react';
import RfpCreate from './components/RfpCreate';
import Vendors from './components/Vendors';
import RfpDetail from './components/RfpDetail';
import './styles.css';

export default function App() {
  const [selectedRfp, setSelectedRfp] = useState(null);

  return (
    <div className="app-shell">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="logo">AR</div>
          <h1>AI RFP</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="muted">Single-user demo</div>
          <button className="secondary">Docs</button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid">
        {/* LEFT column */}
        <div>
          <div className="card" style={{ marginBottom: 18 }}>
            <RfpCreate onCreated={(rfp) => setSelectedRfp(rfp)} />
          </div>

          <div className="card">
            <Vendors />
          </div>
        </div>

        {/* RIGHT column */}
        <div>
          <div className="card">
            <RfpDetail rfpId={selectedRfp?._id} />
          </div>
        </div>
      </div>

      <div className="footer-space" />
    </div>
  );
}
