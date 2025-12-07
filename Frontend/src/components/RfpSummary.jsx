export default function RfpSummary({ rfp }) {
  if (!rfp) {
    return (
      <div>
        <h3>RFP Summary</h3>
        <p style={{ color: "red" }}>No RFP selected</p>
      </div>
    );
  }

  return (
    <div>
      <h3>RFP Summary</h3>

      <p><b>Original Description:</b></p>
      <p>{rfp.text}</p>

      <p><b>Parsed Summary:</b></p>
      <ul>
        <li>Items: {rfp.structured.items?.join(", ")}</li>
        <li>Budget: {rfp.structured.budget}</li>
        <li>Delivery: {rfp.structured.delivery}</li>
        <li>Payment Terms: {rfp.structured.paymentTerms}</li>
      </ul>
    </div>
  );
}
