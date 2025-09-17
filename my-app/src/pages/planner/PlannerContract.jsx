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
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef();
  const prevPosition = useRef(null);

  // Start drawing
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    prevPosition.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Draw continuous line
  const handleSign = (e) => {
    if (!isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext("2d");
    const currentPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(prevPosition.current.x, prevPosition.current.y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.stroke();

    prevPosition.current = currentPosition;
  };

  // Stop drawing
  const stopDrawing = () => {
    setIsDrawing(false);
    prevPosition.current = null;
  };

  // Clear signature
  const clearSignature = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSignature("");
  };

  // Send contract with signature
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
            onMouseDown={startDrawing}
            onMouseMove={handleSign}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
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
