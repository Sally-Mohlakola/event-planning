import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Upload, User, FileText, Mail, Calendar, Clock, Search, Eye, X, Trash2 } from "lucide-react";
import { auth, storage, db } from "../../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, collection, setDoc, updateDoc, getDocs, onSnapshot, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import "./VendorContract.css";

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const VendorContract = ({ setActivePage }) => {
  const [clients, setClients] = useState([]);
  const [allContracts, setAllContracts] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(null);
  const [notification, setNotification] = useState("");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const cacheKey = `vendorClients_${auth.currentUser?.uid}`;
  const cacheTTL = 5 * 60 * 1000;

  const loadContractsFromFirestore = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const vendorId = auth.currentUser.uid;
      const contractsData = [];
      const contractsRef = collection(db, "Event");
      const snapshot = await getDocs(contractsRef);

      for (const eventDoc of snapshot.docs) {
        const vendorContractsRef = collection(db, "Event", eventDoc.id, "Vendors", vendorId, "Contracts");
        const vendorContractsSnapshot = await getDocs(vendorContractsRef);
        vendorContractsSnapshot.forEach(doc => {
          const data = doc.data();
          contractsData.push({ id: doc.id, ...data });
        });
      }

      setAllContracts(contractsData);
    } catch (error) {
      console.error("Error loading contracts:", error);
      setError("Failed to load contracts: " + error.message);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTTL) {
        setClients(data);
        setLoading(false);
        return;
      }
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const url = "https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch clients: ${res.status}`);
      }

      const data = await res.json();
      const formattedClients = (data.bookings || []).map(booking => ({
        id: booking.eventId,
        eventId: booking.eventId,
        name: booking.client || "Unknown Client",
        email: booking.email || "No email provided",
        event: booking.eventName || "Unnamed Event",
        contractUrl: booking.contractUrl || null,
        firstuploaded: booking.firstuploaded || null,
        lastedited: booking.lastedited || null,
        status: booking.status || "pending",
      }));

      setClients(formattedClients);
      localStorage.setItem(cacheKey, JSON.stringify({ data: formattedClients, timestamp: Date.now() }));
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for real-time updates to contracts
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const vendorId = auth.currentUser.uid;
    const unsubscribeFunctions = [];

    const eventsRef = collection(db, "Event");
    getDocs(eventsRef).then(snapshot => {
      snapshot.forEach(eventDoc => {
        const vendorContractsRef = collection(db, "Event", eventDoc.id, "Vendors", vendorId, "Contracts");
        const unsubscribe = onSnapshot(vendorContractsRef, (vendorContractsSnapshot) => {
          const updatedContracts = [];
          vendorContractsSnapshot.forEach(doc => {
            const data = doc.data();
            updatedContracts.push({ id: doc.id, ...data });
            if (data.signatureWorkflow?.workflowStatus === "completed" && 
                data.signedAt && 
                (Date.now() - new Date(data.signedAt).getTime()) < 5 * 60 * 1000) {
              setNotification(`Contract "${data.fileName}" for event "${data.eventName}" has been signed!`);
              setTimeout(() => setNotification(""), 5000);
            }
          });

          setAllContracts(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newContracts = updatedContracts.filter(c => !existingIds.has(c.id));
            const updatedExisting = prev.map(existing => {
              const updatedContract = updatedContracts.find(c => c.id === existing.id);
              return updatedContract || existing;
            });
            return [...updatedExisting, ...newContracts];
          });
        });
        unsubscribeFunctions.push(unsubscribe);
      });
    });

    return () => unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  }, [auth.currentUser]);

  useEffect(() => {
    const initializeContracts = async () => {
      if (auth.currentUser) {
        await loadContractsFromFirestore();
        if (clients.length > 0) {
          const existingContracts = clients
            .filter(client => client.contractUrl)
            .map(client => ({
              id: uuidv4(),
              eventId: client.eventId,
              vendorId: auth.currentUser?.uid || '',
              clientName: client.name,
              clientEmail: client.email,
              eventName: client.event,
              contractUrl: client.contractUrl,
              googleApisUrl: client.contractUrl,
              fileName: client.contractUrl ? client.contractUrl.split('/').pop().split('?')[0] : 'unknown.pdf',
              fileSize: 0,
              status: "active",
              firstuploaded: client.firstuploaded || null,
              lastedited: client.lastedited || null,
              uploadHistory: client.firstuploaded ? [{
                uploadDate: client.firstuploaded,
                fileName: 'existing_contract',
                fileSize: 0,
                action: "existing_contract"
              }] : []
            }));
          
          setAllContracts(prev => {
            const existingEventIds = prev.map(contract => contract.eventId);
            const newContracts = existingContracts.filter(contract => 
              !existingEventIds.includes(contract.eventId)
            );
            return [...prev, ...newContracts];
          });
        }
      }
    };

    if (clients.length > 0) {
      initializeContracts();
    }
  }, [clients, loadContractsFromFirestore]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      await fetchClients();
    });

    return () => unsubscribe();
  }, [fetchClients]);

  // Define groupedContracts before getContractInfo
  const groupedContracts = useMemo(() => {
    const groups = {};
    allContracts.forEach(contract => {
      if (!groups[contract.eventId]) {
        groups[contract.eventId] = [];
      }
      groups[contract.eventId].push(contract);
    });
    return groups;
  }, [allContracts]);

  const clientsWithContracts = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return clients.filter(client => eventIdsWithContracts.has(client.eventId));
  }, [clients, allContracts]);

  const uploadedCount = clientsWithContracts.length;
  const pendingCount = clients.length - uploadedCount;
  const signedCount = allContracts.filter(c => c.signatureWorkflow?.workflowStatus === "completed").length;

  const getContractInfo = useCallback((eventId) => groupedContracts[eventId] || [], [groupedContracts]);

  const deleteContract = useCallback(async (eventId, contractId, contractUrl, signedDocumentUrl = null) => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this contract? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const vendorId = auth.currentUser.uid;
      const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);

      // Delete the contract document from Firestore
      await deleteDoc(contractRef);

      // Delete the contract file from Firebase Storage
      const storageRef = ref(storage, contractUrl);
      await deleteObject(storageRef).catch(err => {
        console.warn("Failed to delete contract file from storage:", err);
      });

      // Delete the signed document if it exists
      if (signedDocumentUrl) {
        const signedStorageRef = ref(storage, signedDocumentUrl);
        await deleteObject(signedStorageRef).catch(err => {
          console.warn("Failed to delete signed contract file from storage:", err);
        });
      }

      // Update local state
      setAllContracts(prev => prev.filter(contract => contract.id !== contractId));
      setClients(prev =>
        prev.map(client =>
          client.eventId === eventId
            ? {
                ...client,
                contractUrl: null,
                firstuploaded: null,
                lastedited: null,
              }
            : client
        )
      );

      // Log deletion in audit collection
      await setDoc(doc(collection(db, "ContractAudit")), {
        contractId,
        eventId,
        vendorId,
        action: "contract_deleted",
        performedBy: vendorId,
        performedAt: new Date().toISOString(),
        details: {
          fileName: contractUrl.split('/').pop().split('?')[0],
          deletedAt: new Date().toISOString(),
        },
      });

      setNotification("Contract deleted successfully!");
      setTimeout(() => setNotification(""), 5000);
    } catch (error) {
      console.error("Error deleting contract:", error);
      setError("Failed to delete contract: " + error.message);
      setNotification("Failed to delete contract");
      setTimeout(() => setNotification(""), 5000);
    }
  }, []);

  const createOrUpdateContractEntry = useCallback(async (eventId, contractUrl, fileName, fileSize, clientInfo, isUpdate = false, replacingContractId = null) => {
    const vendorId = auth.currentUser?.uid || '';
    const currentTime = { seconds: Math.floor(Date.now() / 1000) };

    try {
      const contractId = isUpdate && replacingContractId ? replacingContractId : uuidv4();
      const newContract = {
        id: contractId,
        eventId,
        vendorId,
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        eventName: clientInfo.event,
        contractUrl,
        googleApisUrl: contractUrl,
        fileName,
        fileSize,
        status: "active",
        firstuploaded: isUpdate ? clientInfo.firstuploaded || currentTime : currentTime,
        lastedited: currentTime,
        uploadHistory: [{
          uploadDate: currentTime,
          fileName,
          fileSize,
          action: replacingContractId ? `replacement for ${replacingContractId}` : "initial_upload"
        }],
        createdAt: isUpdate ? clientInfo.createdAt || currentTime : currentTime,
        updatedAt: currentTime
      };

      if (isUpdate && replacingContractId) {
        newContract.uploadHistory = [
          ...(clientInfo.uploadHistory || []),
          ...newContract.uploadHistory
        ];
      }

      const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
      await setDoc(contractRef, newContract);
      
      setAllContracts(prev => {
        if (isUpdate && replacingContractId) {
          return prev.map(c => c.id === replacingContractId ? newContract : c);
        }
        return [...prev, newContract];
      });

      setClients(prev =>
        prev.map(c => c.eventId === eventId ? { 
          ...c, 
          contractUrl: contractUrl,
          lastedited: currentTime,
          firstuploaded: c.firstuploaded || currentTime
        } : c)
      );

      console.log(`${isUpdate ? 'Updated' : 'New'} contract saved to Firestore:`, contractId);
    } catch (error) {
      console.error("Error in contract management:", error);
      setError("Failed to save contract: " + error.message);
    }
  }, []);

  const handleFileUpload = useCallback(async (eventId, file, replacingContractId = null) => {
    if (!auth.currentUser || !file) return;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload PDF, DOC, or DOCX files only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large. Please upload files smaller than 10MB.");
      return;
    }

    setUploading(eventId);
    try {
      const vendorId = auth.currentUser.uid;
      const clientInfo = clients.find(c => c.eventId === eventId);
      const isUpdate = replacingContractId !== null;
      const fileName = `Contracts/${eventId}/${vendorId}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await createOrUpdateContractEntry(eventId, downloadUrl, file.name, file.size, clientInfo, isUpdate, replacingContractId);
      
      alert(isUpdate ? "Contract updated successfully!" : "Contract uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to ${replacingContractId ? 'update' : 'upload'} contract: ${err.message}`);
    } finally {
      setUploading(null);
    }
  }, [clients, createOrUpdateContractEntry]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      client.event.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [clients, debouncedSearchTerm]);

  const uploadedClients = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return filteredClients.filter(client => eventIdsWithContracts.has(client.eventId));
  }, [filteredClients, allContracts]);

  const pendingClients = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return filteredClients.filter(client => !eventIdsWithContracts.has(client.eventId));
  }, [filteredClients, allContracts]);

  const signedContracts = useMemo(() => {
    return allContracts.filter(contract => contract.signatureWorkflow?.workflowStatus === "completed");
  }, [allContracts]);

  const viewContractDetails = useCallback((contract) => {
    setSelectedContract(contract);
    setShowContractModal(true);
    if (contract.signedDocumentUrl && contract.signatureWorkflow?.workflowStatus === "completed") {
      setIframeSrc(`${contract.signedDocumentUrl}#toolbar=1&navpanes=0&scrollbar=1`);
    } else if (contract.fileName.toLowerCase().endsWith('.pdf')) {
      setIframeSrc(`${contract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`);
    }
  }, []);

  const ClientCard = React.memo(({ client, isUploaded }) => {
    const eventContracts = getContractInfo(client.eventId);
    
    return (
      <div className={`client-card ${isUploaded ? 'uploaded' : 'pending'}`}>
        <div className="client-info">
          <p><User size={16} /> {client.name}</p>
          <p><Mail size={16} /> {client.email}</p>
          <p><FileText size={16} /> {client.event}</p>
        </div>
        <div className="contract-section">
          {eventContracts.length === 0 ? (
            <label className="upload-btn">
              <Upload size={16} />
              {uploading === client.eventId ? "Uploading..." : "Upload Contract"}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                hidden
                disabled={uploading === client.eventId}
                onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0])}
              />
            </label>
          ) : (
            <div className="contract-actions">
              <label className="upload-btn secondary">
                <Upload size={16} />
                {uploading === client.eventId ? "Uploading..." : "Add Contract"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  disabled={uploading === client.eventId}
                  onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0])}
                />
              </label>
              <div className="contracts-list">
                {eventContracts.map((contract) => (
                  <div key={contract.id} className="contract-row">
                    <div className="contract-info">
                      <p className="file-name">
                        <button 
                          className="file-name-btn"
                          onClick={() => viewContractDetails(contract)}
                          title="Click to view contract details"
                        >
                          {contract.fileName}
                          {contract.signatureWorkflow?.workflowStatus === "completed" && " (Signed)"}
                        </button>
                        <span>({new Date(contract.lastedited.seconds * 1000).toLocaleDateString()})</span>
                      </p>
                      <span className={`status-${contract.status}`}>{contract.status}</span>
                      {contract.signatureWorkflow?.workflowStatus && (
                        <span className={`status-badge ${contract.signatureWorkflow.workflowStatus}`}>
                          {contract.signatureWorkflow.workflowStatus.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <div className="contract-buttons">
                      <label className="upload-btn secondary small">
                        <Upload size={12} />
                        Edit
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          hidden
                          disabled={uploading === client.eventId}
                          onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0], contract.id)}
                        />
                      </label>
                      <button
                        className="delete-btn small"
                        onClick={() => deleteContract(contract.eventId, contract.id, contract.contractUrl, contract.signedDocumentUrl)}
                        title="Delete contract"
                        disabled={uploading === client.eventId}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading your clients...</p>
    </div>
  );
  
  if (error) return <p className="error">{error}</p>;
  if (!clients.length) return <p className="no-clients">No clients found.</p>;

  return (
    <section className="clients-page">
      <header>
        <h1>Contract Management</h1>
        <p>Manage contracts for your events and clients.</p>
        {notification && (
          <div className="notification success">
            {notification}
          </div>
        )}
        <div className="stats-summary">
          <div className="stat-item">
            <FileText size={20} />
            <span>Total Contracts: {allContracts.length}</span>
          </div>
          <div className="stat-item uploaded-stat">
            <span>Uploaded Clients: {uploadedCount}</span>
          </div>
          <div className="stat-item pending-stat">
            <span>Pending Clients: {pendingCount}</span>
          </div>
          <div className="stat-item signed-stat">
            <span>Signed Contracts: {signedCount}</span>
          </div>
        </div>
        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by client name, event name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
      </header>
      {uploadedClients.length > 0 && (
        <div className="contracts-section">
          <h2 className="section-title uploaded-title">
            <FileText size={20} />
            Clients with Contracts ({uploadedClients.length})
          </h2>
          <div className="clients-list">
            {uploadedClients.map(client => (
              <ClientCard key={client.id} client={client} isUploaded={true} />
            ))}
          </div>
        </div>
      )}
      {pendingClients.length > 0 && (
        <div className="contracts-section">
          <h2 className="section-title pending-title">
            <Upload size={20} />
            Clients Pending Contracts ({pendingClients.length})
          </h2>
          <div className="clients-list">
            {pendingClients.map(client => (
              <ClientCard key={client.id} client={client} isUploaded={false} />
            ))}
          </div>
        </div>
      )}
      {signedContracts.length > 0 && (
        <div className="contracts-section">
          <h2 className="section-title signed-title">
            <Calendar size={20} />
            Signed Contracts ({signedContracts.length})
          </h2>
          <div className="clients-list">
            {signedContracts.map(contract => (
              <div key={contract.id} className="client-card signed">
                <div className="client-info">
                  <p><User size={16} /> {contract.clientName}</p>
                  <p><Mail size={16} /> {contract.clientEmail}</p>
                  <p><FileText size={16} /> {contract.eventName}</p>
                </div>
                <div className="contract-actions">
                  <button 
                    className="file-name-btn"
                    onClick={() => viewContractDetails(contract)}
                    title="Click to view signed contract details"
                  >
                    {contract.fileName}
                    {contract.signatureWorkflow?.workflowStatus === "completed" && " (Signed)"}
                  </button>
                  <span>({new Date(contract.lastedited.seconds * 1000).toLocaleDateString()})</span>
                  <button
                    className="delete-btn small"
                    onClick={() => deleteContract(contract.eventId, contract.id, contract.contractUrl, contract.signedDocumentUrl)}
                    title="Delete contract"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {debouncedSearchTerm && filteredClients.length === 0 && (
        <div className="no-results">
          <p>No contracts found matching "{debouncedSearchTerm}"</p>
        </div>
      )}
      {showContractModal && selectedContract && (
        <div className="modal-overlay" role="dialog" aria-labelledby="modal-title" onClick={() => { setShowContractModal(false); setIframeSrc(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">Contract Details</h3>
              <button onClick={() => { setShowContractModal(false); setIframeSrc(null); }} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <h4>{selectedContract.eventName}</h4>
              <p><strong>Client:</strong> {selectedContract.clientName}</p>
              <p><strong>Email:</strong> {selectedContract.clientEmail}</p>
              <p><strong>File:</strong> {selectedContract.fileName}</p>
              <p><strong>Size:</strong> {(selectedContract.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
              {selectedContract.firstuploaded && (
                <p><strong>First Uploaded:</strong> {new Date(selectedContract.firstuploaded.seconds * 1000).toLocaleString()}</p>
              )}
              {selectedContract.lastedited && (
                <p><strong>Last Updated:</strong> {new Date(selectedContract.lastedited.seconds * 1000).toLocaleString()}</p>
              )}
              {selectedContract.signedAt && (
                <p><strong>Signed At:</strong> {new Date(selectedContract.signedAt).toLocaleString()}</p>
              )}
              <div className="google-apis-section">
                <p><strong>Google APIs URL:</strong></p>
                <code className="google-apis-url">{selectedContract.googleApisUrl}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedContract.googleApisUrl)}
                  className="copy-btn"
                >
                  Copy URL
                </button>
              </div>
              {selectedContract.uploadHistory && selectedContract.uploadHistory.length > 1 && (
                <div className="upload-history">
                  <p><strong>Upload History:</strong></p>
                  <ul>
                    {selectedContract.uploadHistory.map((entry, index) => (
                      <li key={index}>
                        {new Date(entry.uploadDate.seconds * 1000).toLocaleString()} - {entry.action} ({entry.fileName})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedContract.signatureFields && (
                <div className="signature-details">
                  <p><strong>Signatures:</strong></p>
                  <ul>
                    {selectedContract.signatureFields
                      .filter(field => field.signed)
                      .map((field, index) => (
                        <li key={index}>
                          {field.label}: 
                          <img 
                            src={field.signatureData} 
                            alt={`${field.label} signature`} 
                            style={{ maxWidth: '200px', maxHeight: '100px', marginLeft: '10px' }} 
                          /> 
                          (Signed at: {new Date(field.signedAt).toLocaleString()})
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <div className="contract-viewer">
                {selectedContract.fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={iframeSrc}
                    title={selectedContract.fileName}
                    className="contract-iframe"
                    frameBorder="0"
                  />
                ) : (
                  <div className="unsupported-file">
                    <p>Preview not available for {selectedContract.fileName}. Please download to view.</p>
                    <a
                      href={selectedContract.signedDocumentUrl || selectedContract.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-btn"
                    >
                      <Eye size={16} />
                      Download Contract
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <a
                href={selectedContract.signedDocumentUrl || selectedContract.contractUrl}
                download={selectedContract.signedDocumentUrl ? `signed_${selectedContract.fileName}` : selectedContract.fileName}
                className="download-btn"
              >
                Download {selectedContract.signedDocumentUrl ? 'Signed' : ''} Contract
              </a>
              <button
                className="delete-btn"
                onClick={() => {
                  deleteContract(selectedContract.eventId, selectedContract.id, selectedContract.contractUrl, selectedContract.signedDocumentUrl);
                  setShowContractModal(false);
                  setIframeSrc(null);
                }}
              >
                <Trash2 size={16} />
                Delete Contract
              </button>
            </div>
          </div>
        </div>
      )}
      {process.env.NODE_ENV === 'development' && allContracts.length > 0 && (
        <div className="debug-section" style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h3>AllContracts Debug Info</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(allContracts, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};

export default VendorContract;