import React from "react";
import { useNavigate } from "react-router-dom";

export default function VendorWaiting() {
  const navigate = useNavigate();

  return (
    <section style={{ padding: 50, textAlign: "center" }}>
      <h1>Your application is in progress</h1>
      <p>Please wait while we review your vendor application. You will be notified once it is approved or rejected.</p>
      <button onClick={() => navigate("/home")}>Back to Home</button>
    </section>
  );
}
