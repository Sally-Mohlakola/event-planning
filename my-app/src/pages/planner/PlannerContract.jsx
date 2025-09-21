import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Calendar, User, FileText, Search, X, Send, Edit3, Download, Save, RefreshCw, FileCheck } from "lucide-react";
import { auth, db, storage } from "../../firebase";
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isCreatingSignedDoc, setIsCreatingSignedDoc] = useState(false);
  const canvasRefs = useRef({});
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchEventsAndContracts = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
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
      const formattedEvents = (eventsData.events || []).map(event => ({
        ...event,
        date: event.date?._seconds
          ? new Date(event.date._seconds * 1000).toISOString().split("T")[0]
          : event.date || "No date",
      }));
      setEvents(formattedEvents);

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
                isElectronic: true,
                workflowStatus: "sent",
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

  // Function to create a signed PDF document with embedded signatures
  const createSignedPDF = async (originalPdfUrl, signatureData, signatureFields, contractId, eventId) => {
    try {
      setIsCreatingSignedDoc(true);
      setSaveStatus("Creating signed document...");

      // Import PDF-lib dynamically (would need to be added as dependency)
      const { PDFDocument, rgb } = await import('pdf-lib');
      
      // Fetch the original PDF
      const existingPdfBytes = await fetch(originalPdfUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Get the first page (assuming single page for simplicity, can be enhanced for multi-page)
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Add signatures to the PDF
      for (const field of signatureFields) {
        if (field.signerRole === "client" && signatureData[field.id]) {
          // Convert signature data URL to image bytes
          const signatureImageBytes = await fetch(signatureData[field.id]).then(res => res.arrayBuffer());
          const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
          
          // Calculate position and size based on field position
          // Note: PDF coordinates start from bottom-left, HTML from top-left
          const x = field.position.x;
          const y = height - field.position.y - field.position.height;
          const signatureWidth = field.position.width;
          const signatureHeight = field.position.height;
          
          // Draw the signature on the PDF
          firstPage.drawImage(signatureImage, {
            x: x,
            y: y,
            width: signatureWidth,
            height: signatureHeight,
            opacity: 1,
          });
          
          // Add signature metadata as invisible text
          firstPage.drawText(`Signed by: ${auth.currentUser.email} at ${new Date().toISOString()}`, {
            x: x,
            y: y - 10,
            size: 1, // Very small, nearly invisible
            color: rgb(1, 1, 1), // White text (invisible on white background)
          });
        }
      }
      
      // Add signature page/footer with signing information
      const signatureInfo = `\nDocument signed electronically on ${new Date().toLocaleString()}\nSigned by: ${auth.currentUser.email}\nContract ID: ${contractId}`;
      firstPage.drawText(signatureInfo, {
        x: 50,
        y: 50,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      
      // Upload the signed PDF to Firebase Storage
      const signedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const signedPdfRef = ref(
        storage,
        `SignedContracts/${eventId}/${contractId}/signed_contract_${timestamp}.pdf`
      );
      
      await uploadBytes(signedPdfRef, signedPdfBlob);
      const signedPdfUrl = await getDownloadURL(signedPdfRef);
      
      setSaveStatus("Signed document created successfully!");
      return signedPdfUrl;
      
    } catch (error) {
      console.error('Error creating signed PDF:', error);
      setSaveStatus("Failed to create signed document");
      throw error;
    } finally {
      setIsCreatingSignedDoc(false);
    }
  };

  // Alternative function using PDF-lib web worker or server-side processing
  const createSignedPDFServerSide = async (originalPdfUrl, signatureData, signatureFields, contractId, eventId) => {
    try {
      setIsCreatingSignedDoc(true);
      setSaveStatus("Processing signed document...");

      const token = await auth.currentUser.getIdToken();
      
      // Prepare signature data for server processing
      const signaturePayload = {
        originalPdfUrl,
        signatures: Object.entries(signatureData).map(([fieldId, dataUrl]) => {
          const field = signatureFields.find(f => f.id === fieldId);
          return {
            fieldId,
            dataUrl,
            position: field.position,
            label: field.label,
            signerInfo: {
              id: auth.currentUser.uid,
              email: auth.currentUser.email,
              signedAt: new Date().toISOString(),
            }
          };
        }),
        contractId,
        eventId,
        signerInfo: {
          id: auth.currentUser.uid,
          email: auth.currentUser.email,
          name: auth.currentUser.displayName || 'Unknown User',
          signedAt: new Date().toISOString(),
        }
      };

      // Call server function to create signed PDF
      const response = await fetch(
        'https://us-central1-planit-sdp.cloudfunctions.net/api/contracts/create-signed-pdf',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signaturePayload),
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      setSaveStatus("Signed document created successfully!");
      return result.signedPdfUrl;

    } catch (error) {
      console.error('Error creating signed PDF via server:', error);
      setSaveStatus("Failed to create signed document");
      throw error;
    } finally {
      setIsCreatingSignedDoc(false);
    }
  };
  const saveSignatureToStorage = async (fieldId, signatureDataUrl, contractId, eventId) => {
    try {
      const plannerId = auth.currentUser.uid;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Convert data URL to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      
      // Create storage reference with organized path
      const storageRef = ref(
        storage,
        `Signatures/${eventId}/${contractId}/${fieldId}_${plannerId}_${timestamp}.png`
      );
      
      // Upload to Firebase Storage
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Create signature metadata
      const signatureMetadata = {
        fieldId,
        signerId: plannerId,
        signerRole: 'client',
        contractId,
        eventId,
        signatureUrl: downloadURL,
        signedAt: new Date().toISOString(),
        signatureData: signatureDataUrl, // Keep original data URL for immediate use
        ipAddress: null, // Could be added if needed
        userAgent: navigator.userAgent,
        timestamp: new Date(),
      };
      
      // Save signature metadata to Firestore
      await addDoc(collection(db, 'SignatureAudit'), signatureMetadata);
      
      return {
        url: downloadURL,
        metadata: signatureMetadata
      };
    } catch (error) {
      console.error('Error saving signature to storage:', error);
      throw error;
    }
  };

  // Enhanced draft saving functionality
  const saveDraftSignature = useCallback(async () => {
    if (!selectedContract || Object.keys(signatureData).length === 0) {
      setSaveStatus("No signatures to save");
      return;
    }

    setIsSaving(true);
    setSaveStatus("Saving draft...");

    try {
      const plannerId = auth.currentUser.uid;
      const draftSignatures = {};
      
      // Save each signature as draft
      for (const [fieldId, dataUrl] of Object.entries(signatureData)) {
        const savedSignature = await saveSignatureToStorage(
          fieldId, 
          dataUrl, 
          selectedContract.id, 
          selectedContract.eventId
        );
        draftSignatures[fieldId] = savedSignature;
      }

      // Update contract with draft signature data
      const contractRef = doc(
        db, 
        `Event/${selectedContract.eventId}/Vendors/${selectedContract.vendorId}/Contracts`, 
        selectedContract.id
      );

      const updatedFields = selectedContract.signatureFields.map(field => {
        if (draftSignatures[field.id]) {
          return {
            ...field,
            draftSignature: draftSignatures[field.id].url,
            draftSignatureData: draftSignatures[field.id].metadata,
            lastDraftSaved: new Date().toISOString(),
          };
        }
        return field;
      });

      await updateDoc(contractRef, {
        signatureFields: updatedFields,
        draftSignatures: draftSignatures,
        lastDraftSaved: new Date().toISOString(),
        lastedited: { seconds: Math.floor(Date.now() / 1000) },
      });

      setSaveStatus("Draft saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
      
    } catch (error) {
      console.error('Error saving draft signature:', error);
      setSaveStatus("Failed to save draft");
      setTimeout(() => setSaveStatus(""), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [selectedContract, signatureData]);

  // Enhanced final signature submission with document modification
  const sendSignedContract = async () => {
    if (!selectedContract) return;
    
    const requiredFields = selectedContract.signatureFields.filter(f => f.signerRole === "client" && f.required);
    const signedFieldIds = Object.keys(signatureData);
    const missingRequired = requiredFields.filter(f => !signedFieldIds.includes(f.id));
    
    if (missingRequired.length > 0) {
      alert(`Please sign all required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    const confirmSign = window.confirm(
      "Are you sure you want to finalize and submit these signatures? This will create a signed version of the contract document. This action cannot be undone."
    );
    if (!confirmSign) return;

    setIsSaving(true);
    setSaveStatus("Finalizing signatures...");

    try {
      const plannerId = auth.currentUser.uid;
      const finalSignatures = {};
      let signedPdfUrl = null;
      
      // Save all signatures with final status
      for (const [fieldId, dataUrl] of Object.entries(signatureData)) {
        const savedSignature = await saveSignatureToStorage(
          fieldId, 
          dataUrl, 
          selectedContract.id, 
          selectedContract.eventId
        );
        finalSignatures[fieldId] = savedSignature;
      }

      // Create signed PDF document with embedded signatures
      try {
        // Try client-side PDF creation first (requires pdf-lib to be installed)
        signedPdfUrl = await createSignedPDF(
          selectedContract.contractUrl,
          signatureData,
          selectedContract.signatureFields,
          selectedContract.id,
          selectedContract.eventId
        );
      } catch (pdfError) {
        console.warn('Client-side PDF creation failed, trying server-side:', pdfError);
        try {
          // Fallback to server-side PDF processing
          signedPdfUrl = await createSignedPDFServerSide(
            selectedContract.contractUrl,
            signatureData,
            selectedContract.signatureFields,
            selectedContract.id,
            selectedContract.eventId
          );
        } catch (serverError) {
          console.warn('Server-side PDF creation failed:', serverError);
          setSaveStatus("Signatures saved, but signed document creation failed. Contact support if needed.");
        }
      }

      // Update signature fields with final signature data
      const updatedFields = selectedContract.signatureFields.map(field => {
        if (finalSignatures[field.id]) {
          return {
            ...field,
            signed: true,
            signedAt: new Date().toISOString(),
            signerId: plannerId,
            signatureData: finalSignatures[field.id].url,
            signatureMetadata: finalSignatures[field.id].metadata,
            finalizedAt: new Date().toISOString(),
          };
        }
        return field;
      });

      const allSigned = updatedFields.every(field => !field.required || field.signed);
      
      // Update contract document
      const contractRef = doc(
        db, 
        `Event/${selectedContract.eventId}/Vendors/${selectedContract.vendorId}/Contracts`, 
        selectedContract.id
      );
      
      const updateData = {
        signatureFields: updatedFields,
        finalSignatures: finalSignatures,
        signatureWorkflow: {
          ...selectedContract.signatureWorkflow,
          workflowStatus: allSigned ? "completed" : "partially_signed",
          completedAt: allSigned ? new Date().toISOString() : null,
          completedBy: plannerId,
        },
        status: "signed",
        signedAt: new Date().toISOString(),
        signedBy: plannerId,
        lastedited: { seconds: Math.floor(Date.now() / 1000) },
      };

      // Add signed document URL if created successfully
      if (signedPdfUrl) {
        updateData.signedDocumentUrl = signedPdfUrl;
        updateData.originalDocumentUrl = selectedContract.contractUrl;
        updateData.documentHistory = [
          ...(selectedContract.documentHistory || []),
          {
            action: 'document_signed',
            timestamp: new Date().toISOString(),
            originalUrl: selectedContract.contractUrl,
            signedUrl: signedPdfUrl,
            signedBy: plannerId,
          }
        ];
      }
      
      await updateDoc(contractRef, updateData);

      // Create completion audit log
      await addDoc(collection(db, 'ContractAudit'), {
        contractId: selectedContract.id,
        eventId: selectedContract.eventId,
        vendorId: selectedContract.vendorId,
        action: 'contract_signed',
        performedBy: plannerId,
        performedAt: new Date().toISOString(),
        details: {
          signedFields: updatedFields.filter(f => f.signed).length,
          totalFields: updatedFields.length,
          allRequiredSigned: allSigned,
          signedDocumentCreated: !!signedPdfUrl,
          signedDocumentUrl: signedPdfUrl,
        },
      });

      setShowSignModal(false);
      setSelectedContract(null);
      setSignatureData({});
      setSaveStatus("");
      
      const successMessage = signedPdfUrl 
        ? "Contract signed successfully! A new signed version of the document has been created and saved."
        : "Contract signatures saved successfully! Document creation encountered an issue but your signatures are secure.";
      
      alert(successMessage);
      await fetchEventsAndContracts();
      
    } catch (err) {
      console.error("Error finalizing signed contract:", err);
      alert("Failed to finalize signed contract: " + err.message);
      setSaveStatus("Failed to finalize signatures");
    } finally {
      setIsSaving(false);
    }
  };

  // Load existing draft signatures when opening modal
  const loadDraftSignatures = useCallback((contract) => {
    if (contract.signatureFields) {
      const draftData = {};
      contract.signatureFields.forEach(field => {
        if (field.draftSignature && !field.signed) {
          // Load draft signature data if available
          draftData[field.id] = field.draftSignature;
        }
      });
      setSignatureData(draftData);
    }
  }, []);

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
                          loadDraftSignatures(contract);
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
                        loadDraftSignatures(contract);
                        setShowSignModal(true);
                      }}
                      title="Sign contract"
                      disabled={contract.signatureWorkflow?.workflowStatus === "completed"}
                    >
                      <Edit3 size={12} />
                      {contract.signatureWorkflow?.workflowStatus === "completed" ? "Signed" : "Sign"}
                    </button>
                    <button
                      className="download-btn small"
                      onClick={() => handleDownloadContract(
                        contract.signedDocumentUrl || contract.contractUrl, 
                        contract.signedDocumentUrl ? `signed_${contract.fileName}` : contract.fileName
                      )}
                      title={contract.signedDocumentUrl ? "Download signed contract" : "Download original contract"}
                    >
                      <Download size={12} />
                      {contract.signedDocumentUrl ? "Signed" : "Original"}
                    </button>
                    {contract.signedDocumentUrl && contract.contractUrl !== contract.signedDocumentUrl && (
                      <button
                        className="download-btn small secondary"
                        onClick={() => handleDownloadContract(contract.contractUrl, `original_${contract.fileName}`)}
                        title="Download original contract"
                      >
                        <FileText size={12} />
                        Original
                      </button>
                    )}
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
              <h3 id="modal-title">
                {selectedContract.signatureWorkflow?.workflowStatus === "completed" ? "View Signed Contract: " : "Sign Contract: "}
                {selectedContract.fileName}
              </h3>
              <div className="document-version-info">
                {selectedContract.signedDocumentUrl ? (
                  <span className="signed-doc-indicator">
                    <FileCheck size={16} />
                    Viewing signed version
                  </span>
                ) : (
                  <span className="original-doc-indicator">
                    <FileText size={16} />
                    Original document
                  </span>
                )}
              </div>
              <div className="modal-status">
                {saveStatus && (
                  <span className={`save-status ${saveStatus.includes('Failed') ? 'error' : 'success'}`}>
                    {saveStatus}
                  </span>
                )}
                {(isSaving || isCreatingSignedDoc) && (
                  <span className="processing-indicator">
                    <RefreshCw size={16} className="spinning" />
                    {isCreatingSignedDoc ? "Creating signed document..." : "Processing..."}
                  </span>
                )}
              </div>
              <button onClick={() => setShowSignModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="contract-viewer">
              <iframe
                src={`${selectedContract.signedDocumentUrl || selectedContract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`}
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
                      border: field.signed ? "2px solid #10b981" : "2px dashed #2563eb",
                      backgroundColor: field.signed 
                        ? "rgba(16, 185, 129, 0.1)" 
                        : "rgba(37, 99, 235, 0.1)",
                      zIndex: 10,
                    }}
                  >
                    {field.signed ? (
                      <div className="signed-indicator">
                        <img 
                          src={field.signatureData} 
                          alt="Signed" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
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
                    )}
                    <div
                      className="signature-field-label"
                      style={{ 
                        position: "absolute", 
                        top: "-24px", 
                        color: field.signed ? "#10b981" : "#2563eb",
                        fontWeight: field.signed ? "bold" : "normal"
                      }}
                    >
                      {field.label} {field.required && "*"} {field.signed && "✓"}
                    </div>
                    {!field.signed && (
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
                    )}
                  </div>
                ))}
            </div>
            <div className="signature-actions">
              {selectedContract.signatureWorkflow?.workflowStatus !== "completed" && (
                <>
                  <button 
                    className="save-draft-btn" 
                    onClick={saveDraftSignature}
                    disabled={isSaving || isCreatingSignedDoc || Object.keys(signatureData).length === 0}
                  >
                    {isSaving ? <RefreshCw size={16} className="spinning" /> : <Save size={16} />}
                    Save Draft
                  </button>
                  <button 
                    className="sign-btn" 
                    onClick={sendSignedContract}
                    disabled={isSaving || isCreatingSignedDoc}
                  >
                    {(isSaving || isCreatingSignedDoc) ? <RefreshCw size={16} className="spinning" /> : <Send size={16} />}
                    {isCreatingSignedDoc ? "Creating Document..." : "Finalize & Create Signed Document"}
                  </button>
                </>
              )}
              {selectedContract.signatureWorkflow?.workflowStatus === "completed" && (
                <div className="signed-contract-info">
                  <span className="completion-status">
                    <FileCheck size={16} />
                    Contract completed and signed on {new Date(selectedContract.signedAt).toLocaleDateString()}
                  </span>
                  {selectedContract.signedDocumentUrl && (
                    <button
                      className="download-btn"
                      onClick={() => handleDownloadContract(
                        selectedContract.signedDocumentUrl, 
                        `signed_${selectedContract.fileName}`
                      )}
                    >
                      <Download size={16} />
                      Download Signed Document
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlannerContract;