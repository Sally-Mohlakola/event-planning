import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Calendar, User, FileText, Search, X, Send, Edit3, Download } from "lucide-react";
import { auth, db, storage } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import "./PlannerContract.css";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const PlannerContract = ({ setActivePage }) => {
  const [events, setEvents] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState({});
  const canvasRefs = useRef({});
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const confirmRelevantServices = async(eventId, vendorId) => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
    }


    try{
      const token = await auth.currentUser.getIdToken();

      const res = await fetch(
        `http://127.0.0.1:5001/planit-sdp/us-central1/api/planner/${eventId}/${vendorId}/confirm-services`, 
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if(!res.ok) alert("Failed to confirm services");
      return res;
    }catch(err){
      console.error(err);
    }
  }

  const fetchEventsAndContracts = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      // Fetch planner's events
      const eventsResponse = await fetch(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!eventsResponse.ok) {
        throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
      }
      const eventsData = await eventsResponse.json();
      // Convert event.date Timestamp to string
      const formattedEvents = (eventsData.events || []).map(event => ({
        ...event,
        date: event.date?._seconds
          ? new Date(event.date._seconds * 1000).toISOString().split("T")[0]
          : event.date || "No date",
      }));
      setEvents(formattedEvents);

      // Fetch vendors and contracts for each event
      const contractsData = [];
      for (const event of formattedEvents) {
        const vendorsResponse = await fetch(
          `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${event.id}/vendors`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!vendorsResponse.ok) {
          console.warn(`No vendors found for event ${event.id}`);
          continue;
        }
        const vendorsData = await vendorsResponse.json();
        for (const vendor of vendorsData.vendors || []) {
          // Fetch contracts from the Contracts subcollection
          const contractsSnapshot = await getDocs(
            collection(db, `Event/${event.id}/Vendors/${vendor.id}/Contracts`)
          );
          contractsSnapshot.forEach(doc => {
            const contract = doc.data();
            contractsData.push({
              id: doc.id,
              eventId: event.id,
              eventName: event.name,
              vendorId: vendor.id,
              vendorName: vendor.businessName || "Unknown Vendor",
              contractUrl: contract.contractUrl,
              fileName:
                contract.fileName || contract.contractUrl?.split("/").pop().split("?")[0] || "unknown.pdf",
              signatureFields: contract.signatureFields || [],
              signatureWorkflow: contract.signatureWorkflow || {
                isElectronic: false,
                workflowStatus: "completed",
              },
              status: contract.status || "active",
              lastedited: contract.lastedited?._seconds
                ? { seconds: contract.lastedited._seconds }
                : contract.lastedited || { seconds: Math.floor(Date.now() / 1000) },
            });
          });
        }
      }
      setContracts(contractsData);
    } catch (err) {
      console.error("Error fetching events and contracts:", err);
      setError("Failed to load events and contracts: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      await fetchEventsAndContracts();
    });
    return () => unsubscribe();
  }, [fetchEventsAndContracts]);

  const startDrawing = (fieldId, e) => {
    const canvas = canvasRefs.current[fieldId];
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    canvasRefs.current[`${fieldId}_isDrawing`] = true;
    canvasRefs.current[`${fieldId}_prevPosition`] = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleSign = (fieldId, e) => {
    if (!canvasRefs.current[`${fieldId}_isDrawing`]) return;
    const canvas = canvasRefs.current[fieldId];
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const currentPosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(canvasRefs.current[`${fieldId}_prevPosition`].x, canvasRefs.current[`${fieldId}_prevPosition`].y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.stroke();

    canvasRefs.current[`${fieldId}_prevPosition`] = currentPosition;
  };

  const stopDrawing = (fieldId) => {
    canvasRefs.current[`${fieldId}_isDrawing`] = false;
    canvasRefs.current[`${fieldId}_prevPosition`] = null;
    const canvas = canvasRefs.current[fieldId];
    setSignatureData(prev => ({
      ...prev,
      [fieldId]: canvas.toDataURL(),
    }));
  };

  const clearSignature = (fieldId) => {
    const canvas = canvasRefs.current[fieldId];
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(prev => {
      const newData = { ...prev };
      delete newData[fieldId];
      return newData;
    });
  };

  const sendSignedContract = async () => {
    if (!selectedContract) return;
    const requiredFields = selectedContract.signatureFields.filter(f => f.signerRole === "client" && f.required);
    if (Object.keys(signatureData).length !== requiredFields.length) {
      alert("Please sign all required fields.");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const signatureUrls = {};
      for (const fieldId in signatureData) {
        const blob = await (await fetch(signatureData[fieldId])).blob();
        const storageRef = ref(
          storage,
          `Signatures/${selectedContract.eventId}/${selectedContract.id}/${fieldId}.png`
        );
        await uploadBytes(storageRef, blob);
        signatureUrls[fieldId] = await getDownloadURL(storageRef);
      }

      const updatedFields = selectedContract.signatureFields.map(field => {
        if (field.signerRole === "client" && signatureUrls[field.id]) {
          return {
            ...field,
            signed: true,
            signedAt: new Date().toISOString(),
            signatureData: signatureUrls[field.id],
          };
        }
        return field;
      });

      const allSigned = updatedFields.every(field => !field.required || field.signed);
      const response = await fetch(
        `http://127.0.0.1:5001/planit-sdp/us-central1/api/contracts/${selectedContract.id}/signature-fields`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: selectedContract.eventId,
            signatureFields: updatedFields,
            signers: selectedContract.signers || [],
            vendorId: selectedContract.vendorId
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update contract");
      }

      const res = await confirmRelevantServices(selectedContract.eventId, selectedContract.vendorId);
      if(res.ok){
        alert("Services confirmed successfully!");
      }

      setShowSignModal(false);
      setSelectedContract(null);
      setSignatureData({});
      alert("Contract signed and sent back to the vendor successfully!");
      await fetchEventsAndContracts();
    } catch (err) {
      console.error("Error sending signed contract:", err);
      alert("Failed to send signed contract: " + err.message);
    }
  };

  const groupedContracts = useMemo(() => {
    const groups = {};
    contracts.forEach(contract => {
      if (!groups[contract.eventId]) {
        groups[contract.eventId] = [];
      }
      groups[contract.eventId].push(contract);
    });
    return groups;
  }, [contracts]);

  const filteredEvents = useMemo(() => {
    return events.filter(
      event =>
        event.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.clientName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.clientEmail?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [events, debouncedSearchTerm]);

  const totalContracts = contracts.length;
  const pendingContracts = contracts.filter(c => c.signatureWorkflow?.workflowStatus === "sent").length;
  const signedContracts = contracts.filter(c => c.signatureWorkflow?.workflowStatus === "completed").length;

  const handleDownloadContract = (contractUrl, fileName) => {
    const link = document.createElement("a");
    link.href = contractUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const EventCard = React.memo(({ event }) => {
    const eventContracts = groupedContracts[event.id] || [];

    return (
      <div className="event-card">
        <div className="event-info">
          <p>
            <Calendar size={16} /> {event.name}
          </p>
          <p>
            <User size={16} /> {event.clientName || "Unknown Client"}
          </p>
          <p>
            <FileText size={16} /> Date: {event.date}
          </p>
          <p>Status: {event.status}</p>
        </div>
        <div className="contract-section">
          {eventContracts.length === 0 ? (
            <p>No contracts received for this event.</p>
          ) : (
            <div className="contracts-list">
              {eventContracts.map(contract => (
                <div key={contract.id} className="contract-row">
                  <div className="contract-info">
                    <p className="file-name">
                      <button
                        className="file-name-btn"
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowSignModal(true);
                        }}
                        title="View and sign contract"
                      >
                        {contract.fileName}
                      </button>
                      <span>
                        (
                        {contract.lastedited?.seconds
                          ? new Date(contract.lastedited.seconds * 1000).toLocaleDateString()
                          : "Unknown date"}
                        )
                      </span>
                    </p>
                    <span className={`status-${contract.status}`}>{contract.status}</span>
                    {contract.signatureWorkflow?.isElectronic && (
                      <span className={`status-badge ${contract.signatureWorkflow.workflowStatus}`}>
                        {contract.signatureWorkflow.workflowStatus.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div className="contract-actions">
                    <button
                      className="sign-btn"
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowSignModal(true);
                      }}
                      title="Sign contract"
                    >
                      <Edit3 size={12} />
                      Sign
                    </button>
                    <button
                      className="download-btn small"
                      onClick={() => handleDownloadContract(contract.contractUrl, contract.fileName)}
                      title="Download contract"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your events...</p>
      </div>
    );
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!events.length) {
    return <p className="no-events">No events found.</p>;
  }

  return (
    <section className="events-page">
      <header>
        <h1>Contract Management</h1>
        <p>Manage vendor contracts for your events.</p>
        <div className="stats-summary">
          <div className="stat-item">
            <FileText size={20} />
            <span>Total Contracts: {totalContracts}</span>
          </div>
          <div className="stat-item pending-stat">
            <span>Pending Contracts: {pendingContracts}</span>
          </div>
          <div className="stat-item signed-stat">
            <span>Signed Contracts: {signedContracts}</span>
          </div>
        </div>
        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by event name, client name, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
      </header>
      <div className="events-section">
        <h2 className="section-title">
          <Calendar size={20} />
          Your Events ({filteredEvents.length})
        </h2>
        <div className="events-list">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
      {debouncedSearchTerm && filteredEvents.length === 0 && (
        <div className="no-results">
          <p>No events found matching "{debouncedSearchTerm}"</p>
        </div>
      )}
      {showSignModal && selectedContract && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-labelledby="modal-title"
          onClick={() => setShowSignModal(false)}
        >
          <div className="modal-content sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">Sign Contract: {selectedContract.fileName}</h3>
              <button onClick={() => setShowSignModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="contract-viewer">
              <iframe
                src={`${selectedContract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                style={{ width: "100%", height: "500px", border: "none" }}
                title="Contract Preview"
              />
              {selectedContract.signatureFields
                .filter(field => field.signerRole === "client")
                .map(field => (
                  <div
                    key={field.id}
                    className="signature-field-overlay"
                    style={{
                      position: "absolute",
                      left: field.position.x,
                      top: field.position.y,
                      width: field.position.width,
                      height: field.position.height,
                      border: "2px dashed #2563eb",
                      backgroundColor: "rgba(37, 99, 235, 0.1)",
                      zIndex: 10,
                    }}
                  >
                    <canvas
                      ref={el => (canvasRefs.current[field.id] = el)}
                      width={field.position.width}
                      height={field.position.height}
                      onMouseDown={e => startDrawing(field.id, e)}
                      onMouseMove={e => handleSign(field.id, e)}
                      onMouseUp={() => stopDrawing(field.id)}
                      onMouseLeave={() => stopDrawing(field.id)}
                      style={{ border: "1px solid #ccc", borderRadius: "4px" }}
                    />
                    <div
                      className="signature-field-label"
                      style={{ position: "absolute", top: "-24px", color: "#2563eb" }}
                    >
                      {field.label} {field.required && "*"}
                    </div>
                    <button
                      className="clear-signature-btn"
                      onClick={() => clearSignature(field.id)}
                      style={{
                        position: "absolute",
                        top: "-10px",
                        right: "-10px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
            </div>
            <div className="signature-actions">
              <button className="sign-btn" onClick={sendSignedContract}>
                <Send size={16} />
                Sign & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlannerContract;