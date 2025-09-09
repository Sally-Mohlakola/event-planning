import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./VendorWaiting.css";

export default function VendorWaiting() {
  const navigate = useNavigate();

  // Lock scroll at top while component is mounted
  useEffect(() => {
    // Jump to top
    window.scrollTo(0, 0);
    // Lock scrolling
    document.body.style.overflow = "hidden";

    // Cleanup: unlock scrolling when component unmounts
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <section className="vendor-waiting-section">
      <h1>Your application is in progress</h1>
      <p>Please wait while we review your vendor application. You will be notified once it is approved or rejected.</p>
      <button onClick={() => navigate("/home")}>Back to Home</button>
    </section>
  );
}
