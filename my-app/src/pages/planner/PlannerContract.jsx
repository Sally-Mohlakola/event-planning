import React, { useState, useRef } from "react";
import "./PlannerContract.css";

const contractsMock = [
  { id: 1, vendor: "Elegant Catering", date: "2025-09-01", status: "Pending" },
  { id: 2, vendor: "Floral Designs", date: "2025-09-05", status: "Pending" },
];

export default function PlannerContract({ setActivePage }) {
  const [selectedContract, setSelectedContract] = useState(null);
  const [signature, setSignature] = useState("");
  const [sent, setSent] = useState(false);
  const canvasRef = useRef();

  // Draw signature on canvas
  const handleSign = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(
      e.clientX - rect.left,
      e.clientY - rect.top,
      2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  const clearSignature = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignature("");
  };

  const sendContract = () => {
    const dataUrl = canvasRef.current.toDataURL();
    setSignature(dataUrl);
    // Simulate sending to vendor...
    setSent(true);
  };

  if (sent) {
    return (
      <div className="confirmation-screen">
        <h2>Contract Sent!</h2>
        <p>You have successfully signed and sent the contract to {selectedContract.vendor}.</p>
        <button onClick={() => { setSent(false); setSelectedContract(null); }}>Back to Contracts</button>
      </div>
    );
  }

  if (selectedContract) {
    return (
      <div className="contract-screen">
        <h2>Review Contract: {selectedContract.vendor}</h2>
        <div className="contract-viewer">
          <p>[Contract content goes here...]</p>
        </div>
        <div className="signature-section">
          <p>Draw your signature below:</p>
          <canvas
            ref={canvasRef}
            width={500}
            height={150}
            onMouseDown={(e) => {
              const moveHandler = (ev) => handleSign(ev);
              window.addEventListener("mousemove", moveHandler);
              window.addEventListener("mouseup", () => {
                window.removeEventListener("mousemove", moveHandler);
              }, { once: true });
            }}
          />
          <div className="signature-buttons">
            <button onClick={clearSignature}>Clear</button>
            <button onClick={sendContract}>Sign & Send</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contracts-list">
      <h2>Select a Contract to Review</h2>
      <div className="contract-tiles">
        {contractsMock.map((c) => (
          <div key={c.id} className="contract-tile">
            <h3>{c.vendor}</h3>
            <p>Date: {c.date}</p>
            <p>Status: {c.status}</p>
            <button onClick={() => setSelectedContract(c)}>View / Sign</button>
          </div>
        ))}
      </div>
    </div>
  );
}
