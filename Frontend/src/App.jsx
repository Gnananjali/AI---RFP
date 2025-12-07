import { useState } from "react";
import Vendors from "./components/Vendors";
import RfpCreate from "./components/RfpCreate";
import SelectVendors from "./components/SelectVendors";
import Proposals from "./components/Proposals";
import RfpSummary from "./components/RfpSummary";

export default function App() {
  const [selectedRfp, setSelectedRfp] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>AI RFP System</h1>

      <RfpCreate onRfpCreated={setSelectedRfp} />

      <RfpSummary rfp={selectedRfp} />

      <Vendors />

      <SelectVendors selectedRfpId={selectedRfp?._id} />

      <Proposals selectedRfpId={selectedRfp?._id} />
    </div>
  );
}
