import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Upload, User, FileText, Mail, Calendar, Clock, Search, Eye, X } from "lucide-react";
import { auth, storage, db } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, collection, setDoc, updateDoc, getDocs } from "firebase/firestore";
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
          contractsData.push({ id: doc.id, ...doc.data() });
        });
      }

      setAllContracts(contractsData);
    } catch (error) {
      console.error("Error loading contracts:", error);
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
        email: booking.clientEmail || "No email provided",
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

  const createOrUpdateContractEntry = useCallback(async (eventId, contractUrl, fileName, fileSize, clientInfo, isUpdate = false) => {
    const vendorId = auth.currentUser?.uid || '';
    const currentTime = { seconds: Math.floor(Date.now() / 1000) };

    try {
      if (isUpdate) {
        const existingContract = allContracts.find(c => c.eventId === eventId);
        if (existingContract) {
          const updatedContract = {
            ...existingContract,
            contractUrl,
            googleApisUrl: contractUrl,
            fileName,
            fileSize,
            lastedited: currentTime,
            uploadHistory: [
              ...(existingContract.uploadHistory || []),
              { uploadDate: currentTime, fileName, fileSize, action: "contract_update" }
            ]
          };

          const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", existingContract.id);
          await updateDoc(contractRef, updatedContract);
          setAllContracts(prev => 
            prev.map(contract => contract.eventId === eventId ? updatedContract : contract)
          );
        }
      } else {
        const contractId = uuidv4();
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
          firstuploaded: currentTime,
          lastedited: currentTime,
          uploadHistory: [{ uploadDate: currentTime, fileName, fileSize, action: "initial_upload" }],
          createdAt: currentTime,
          updatedAt: currentTime
        };

        const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
        await setDoc(contractRef, newContract);
        setAllContracts(prev => {
          const existingIndex = prev.findIndex(c => c.eventId === eventId);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...newContract, firstuploaded: updated[existingIndex].firstuploaded };
            return updated;
          }
          return [...prev, newContract];
        });
      }
    } catch (error) {
      console.error("Error in contract management:", error);
    }
  }, [allContracts]);

  const handleFileUpload = useCallback(async (eventId, file) => {
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
      const isUpdate = clientInfo?.contractUrl ? true : false;
      const fileName = `Contracts/${eventId}/${vendorId}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await createOrUpdateContractEntry(eventId, downloadUrl, file.name, file.size, clientInfo, isUpdate);
      setClients(prev =>
        prev.map(c => c.eventId === eventId ? { 
          ...c, 
          contractUrl: downloadUrl,
          lastedited: { seconds: Date.now() / 1000 },
          ...(isUpdate ? {} : { firstuploaded: { seconds: Date.now() / 1000 } })
        } : c)
      );
      alert(isUpdate ? "Contract updated successfully!" : "Contract uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to ${clients.find(c => c.eventId === eventId)?.contractUrl ? 'update' : 'upload'} contract: ${err.message}`);
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

  const uploadedClients = useMemo(() => filteredClients.filter(client => client.contractUrl), [filteredClients]);
  const pendingClients = useMemo(() => filteredClients.filter(client => !client.contractUrl), [filteredClients]);

  const getContractInfo = useCallback((eventId) => allContracts.find(contract => contract.eventId === eventId), [allContracts]);

  const viewContractDetails = useCallback((contract) => {
    setSelectedContract(contract);
    setShowContractModal(true);
    if (contract.fileName.toLowerCase().endsWith('.pdf')) {
      setIframeSrc(`${contract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`);
    }
  }, []);

  const ClientCard = React.memo(({ client, isUploaded }) => {
    const contractInfo = getContractInfo(client.eventId);
    
    return (
      <div className={`client-card ${isUploaded ? 'uploaded' : 'pending'}`}>
        <div className="client-info">
          <p><User size={16} /> {client.name}</p>
          <p><Mail size={16} /> {client.email}</p>
          <p><FileText size={16} /> {client.event}</p>
          {contractInfo && (
            <div className="contract-details">
              {contractInfo.firstuploaded && (
                <p className="contract-info">
                  <Calendar size={14} /> First uploaded: {new Date(contractInfo.firstuploaded.seconds * 1000).toLocaleDateString()}
                </p>
              )}
              {contractInfo.lastedited && contractInfo.firstuploaded && 
               contractInfo.lastedited.seconds !== contractInfo.firstuploaded.seconds && (
                <p className="contract-info">
                  <Clock size={14} /> Last updated: {new Date(contractInfo.lastedited.seconds * 1000).toLocaleDateString()}
                </p>
              )}
              <p className="contract-info">
                File: 
                <button 
                  className="file-name-btn"
                  onClick={() => viewContractDetails(contractInfo)}
                  title="Click to view contract details"
                >
                  {contractInfo.fileName}
                </button>
                ({(contractInfo.fileSize / (1024 * 1024)).toFixed(2)} MB)
              </p>
              <p className="contract-info">
                Status: <span className={`status-${contractInfo.status}`}>{contractInfo.status}</span>
              </p>
            </div>
          )}
        </div>
        <div className="contract-section">
          {client.contractUrl ? (
            <div className="contract-actions">
              <button
                onClick={() => viewContractDetails(getContractInfo(client.eventId))}
                className="contract-link"
              >
                View Contract
              </button>
              <label className="upload-btn secondary">
                <Upload size={16} />
                {uploading === client.eventId ? "Uploading..." : "Update Contract"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  disabled={uploading === client.eventId}
                  onChange={e => e.target.files[0] && handleFileUpload(client.eventId, e.target.files[0])}
                />
              </label>
            </div>
          ) : (
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
        <div className="stats-summary">
          <div className="stat-item">
            <FileText size={20} />
            <span>Total Contracts: {allContracts.length}</span>
          </div>
          <div className="stat-item uploaded-stat">
            <span>Uploaded: {uploadedClients.length}</span>
          </div>
          <div className="stat-item pending-stat">
            <span>Pending: {pendingClients.length}</span>
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
            Uploaded Contracts ({uploadedClients.length})
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
            Pending Contracts ({pendingClients.length})
          </h2>
          <div className="clients-list">
            {pendingClients.map(client => (
              <ClientCard key={client.id} client={client} isUploaded={false} />
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
                      href={selectedContract.contractUrl}
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
                href={selectedContract.contractUrl}
                download={selectedContract.fileName}
                className="download-btn"
              >
                Download Contract
              </a>
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