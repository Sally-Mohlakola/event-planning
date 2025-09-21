import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Upload, User, FileText, Mail, Calendar, Clock, Search, Eye, X, Trash2, Edit3, Settings, Download } from "lucide-react";
import { auth, storage, db } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, collection, setDoc, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import PDFSignatureEditor from "./PDFSignatureEditor";
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
  // E-signature states
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [editingContractForSignature, setEditingContractForSignature] = useState(null);
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
      setError("Failed to load contracts");
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
              signatureWorkflow: {
                isElectronic: false,
                workflowStatus: 'completed',
                createdAt: new Date().toISOString(),
                sentAt: null,
                completedAt: new Date().toISOString(),
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                reminderSettings: {
                  enabled: true,
                  frequency: 3,
                  maxReminders: 3,
                  lastReminderSent: null
                }
              },
              signatureFields: [],
              signers: [],
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

  // Group contracts by eventId for multiple contracts per client
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

  // Persistent counters based on Firestore data
  const clientsWithContracts = useMemo(() => {
    const eventIdsWithContracts = new Set(allContracts.map(c => c.eventId));
    return clients.filter(client => eventIdsWithContracts.has(client.eventId));
  }, [clients, allContracts]);

  const uploadedCount = clientsWithContracts.length;
  const pendingCount = clients.length - uploadedCount;
  const eSignatureCount = allContracts.filter(c => c.signatureWorkflow?.isElectronic).length;

  // Helper function to create signers from signature fields
  const createSignersFromFields = (signatureFields, clientInfo) => {
    const signers = new Map();
   
    signatureFields.forEach(field => {
      if (!signers.has(field.signerEmail)) {
        signers.set(field.signerEmail, {
          id: uuidv4(),
          role: field.signerRole,
          name: field.signerRole === 'client' ? clientInfo.name : 'Vendor Name',
          email: field.signerEmail,
          status: 'pending',
          accessToken: uuidv4(),
          accessCode: field.signerRole === 'client' ? generateAccessCode() : null,
          invitedAt: null,
          accessedAt: null,
          signedAt: null,
          ipAddress: null,
          userAgent: null,
          declineReason: null
        });
      }
    });
   
    return Array.from(signers.values());
  };

  // Generate random access code for additional security
  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createOrUpdateContractEntry = useCallback(async (eventId, contractUrl, fileName, fileSize, clientInfo, isUpdate = false, replacingContractId = null, signatureFields = []) => {
    const vendorId = auth.currentUser?.uid || '';
    const currentTime = { seconds: Math.floor(Date.now() / 1000) };
    try {
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
       
        // Enhanced signature workflow
        signatureWorkflow: {
          isElectronic: signatureFields.length > 0,
          workflowStatus: signatureFields.length > 0 ? 'draft' : 'completed',
          createdAt: new Date().toISOString(),
          sentAt: null,
          completedAt: signatureFields.length === 0 ? new Date().toISOString() : null,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          reminderSettings: {
            enabled: true,
            frequency: 3,
            maxReminders: 3,
            lastReminderSent: null
          }
        },
       
        signatureFields: signatureFields,
        signers: signatureFields.length > 0 ? createSignersFromFields(signatureFields, clientInfo) : [],
       
        auditTrail: [{
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'contract_created',
          actor: auth.currentUser?.email || 'vendor',
          actorRole: 'vendor',
          details: `Contract ${signatureFields.length > 0 ? 'created with e-signature fields' : 'uploaded as traditional contract'}`,
          ipAddress: 'system'
        }],
       
        documentVersions: [{
          version: 1,
          type: 'original',
          url: contractUrl,
          createdAt: new Date().toISOString(),
          description: 'Original contract document'
        }],
       
        firstuploaded: currentTime,
        lastedited: currentTime,
        createdAt: currentTime,
        updatedAt: currentTime,
        uploadHistory: [{
          uploadDate: currentTime,
          fileName,
          fileSize,
          action: replacingContractId ? `replacement for ${replacingContractId}` : "initial_upload"
        }]
      };
      const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
      await setDoc(contractRef, newContract);
     
      setAllContracts(prev => [...prev, newContract]);
      // Update client with latest contractUrl
      setClients(prev =>
        prev.map(c => c.eventId === eventId ? {
          ...c,
          contractUrl: contractUrl,
          lastedited: currentTime,
          firstuploaded: c.firstuploaded || currentTime,
          signatureStatus: signatureFields.length > 0 ? 'pending_signature' : 'completed'
        } : c)
      );
      console.log(`${replacingContractId ? 'Updated' : 'New'} contract saved with${signatureFields.length > 0 ? ' signature fields' : 'out signature fields'}:`, contractId);
      return contractId;
     
    } catch (error) {
      console.error("Error in contract management:", error);
      setError("Failed to save contract");
      return null;
    }
  }, []);

  const handleFileUpload = useCallback(async (eventId, file, replacingContractId = null, signatureFields = []) => {
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
      const contractId = await createOrUpdateContractEntry(eventId, downloadUrl, file.name, file.size, clientInfo, isUpdate, replacingContractId, signatureFields);
     
      if (signatureFields.length > 0) {
        alert("Contract uploaded successfully! You can now send it for electronic signature.");
      } else {
        alert(isUpdate ? "Contract updated successfully!" : "Contract uploaded successfully!");
      }
     
      return contractId;
     
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to ${replacingContractId ? 'update' : 'upload'} contract: ${err.message}`);
      return null;
    } finally {
      setUploading(null);
    }
  }, [clients, createOrUpdateContractEntry]);

  const handleDeleteContract = useCallback(async (eventId, contractId) => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }
    if (!confirm(`Are you sure you want to delete this contract?`)) {
      return;
    }
    try {
      const vendorId = auth.currentUser.uid;
      const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
      await deleteDoc(contractRef);
      setAllContracts(prev => {
        const updatedContracts = prev.filter(contract => contract.id !== contractId);
        return updatedContracts;
      });
      // Update client contractUrl if no contracts remain for the event
      setClients(prev =>
        prev.map(c => {
          if (c.eventId === eventId) {
            const remainingContracts = groupedContracts[eventId]?.filter(c => c.id !== contractId) || [];
            return {
              ...c,
              contractUrl: remainingContracts.length > 0 ? remainingContracts[remainingContracts.length - 1].contractUrl : null,
              firstuploaded: remainingContracts.length > 0 ? c.firstuploaded : null,
              lastedited: remainingContracts.length > 0 ? c.lastedited : null,
            };
          }
          return c;
        })
      );
      alert("Contract deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete contract: ${err.message}`);
    }
  }, [groupedContracts]);

  // Function to handle signature setup
  const handleSetupSignatures = (contract) => {
    setEditingContractForSignature(contract);
    setShowSignatureEditor(true);
  };

  // Function to save signature fields
  const handleSaveSignatureFields = async (signatureFields) => {
    if (!editingContractForSignature) return;
   
    try {
      const contractRef = doc(db, "Event", editingContractForSignature.eventId, "Vendors", auth.currentUser.uid, "Contracts", editingContractForSignature.id);
     
      const signers = createSignersFromFields(signatureFields, {
        name: editingContractForSignature.clientName,
        email: editingContractForSignature.clientEmail
      });
     
      await updateDoc(contractRef, {
        signatureFields: signatureFields,
        signers: signers,
        'signatureWorkflow.isElectronic': true,
        'signatureWorkflow.workflowStatus': 'draft',
        'auditTrail': [...(editingContractForSignature.auditTrail || []), {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'signature_fields_defined',
          actor: auth.currentUser?.email || 'vendor',
          actorRole: 'vendor',
          details: `${signatureFields.length} signature fields defined`,
          ipAddress: 'system'
        }],
        updatedAt: new Date().toISOString()
      });
     
      // Update local state
      setAllContracts(prev =>
        prev.map(contract =>
          contract.id === editingContractForSignature.id
            ? {
                ...contract,
                signatureFields,
                signers,
                signatureWorkflow: {
                  ...contract.signatureWorkflow,
                  isElectronic: true,
                  workflowStatus: 'draft'
                }
              }
            : contract
        )
      );
     
      setShowSignatureEditor(false);
      setEditingContractForSignature(null);
      alert('Signature fields saved successfully!');
     
    } catch (error) {
      console.error('Error saving signature fields:', error);
      alert('Failed to save signature fields');
    }
  };

  // Function to send contract for signature
  const handleSendForSignature = async (signatureFields) => {
    if (!editingContractForSignature) return;
   
    try {
      // First save the signature fields
      await handleSaveSignatureFields(signatureFields);
     
      // Update contract status to sent
      const contractRef = doc(db, "Event", editingContractForSignature.eventId, "Vendors", auth.currentUser.uid, "Contracts", editingContractForSignature.id);
      await updateDoc(contractRef, {
        'signatureWorkflow.workflowStatus': 'sent',
        'signatureWorkflow.sentAt': new Date().toISOString(),
        'auditTrail': [...(editingContractForSignature.auditTrail || []), {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          action: 'sent_for_signature',
          actor: auth.currentUser?.email || 'vendor',
          actorRole: 'vendor',
          details: 'Contract sent for electronic signature',
          ipAddress: 'system'
        }]
      });
     
      alert('Contract sent for signature successfully!');
      setShowSignatureEditor(false);
      setEditingContractForSignature(null);
     
      // Refresh contracts
      await loadContractsFromFirestore();
     
    } catch (error) {
      console.error('Error sending contract for signature:', error);
      alert('Failed to send contract for signature');
    }
  };

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

  const getContractInfo = useCallback((eventId) => groupedContracts[eventId] || [], [groupedContracts]);

  const viewContractDetails = useCallback((contract) => {
    setSelectedContract(contract);
    setShowContractModal(true);
    if (contract.fileName.toLowerCase().endsWith('.pdf')) {
      setIframeSrc(`${contract.contractUrl}#toolbar=1&navpanes=0&scrollbar=1`);
    }
  }, []);

  const ClientCard = React.memo(({ client, isUploaded }) => {
    const eventContracts = getContractInfo(client.eventId);

    const handleDownloadContract = (contractUrl, fileName) => {
      const link = document.createElement('a');
      link.href = contractUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

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
                        </button>
                        <span>({new Date(contract.lastedited.seconds * 1000).toLocaleDateString()})</span>
                      </p>
                      <span className={`status-${contract.status}`}>{contract.status}</span>
                      {contract.signatureWorkflow?.isElectronic && (
                        <span className={`status-badge ${contract.signatureWorkflow.workflowStatus}`}>
                          {contract.signatureWorkflow.workflowStatus.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="contract-actions">
                      <button
                        className="setup-signature-btn"
                        onClick={() => handleSetupSignatures(contract)}
                        title="Setup electronic signature"
                      >
                        <Edit3 size={12} />
                        E-Sign
                      </button>
                      <button
                        className="download-btn small"
                        onClick={() => handleDownloadContract(contract.contractUrl, contract.fileName)}
                        title="Download contract"
                      >
                        <Download size={12} />
                        Download
                      </button>
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
                        onClick={() => handleDeleteContract(client.eventId, contract.id)}
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
            <span>Uploaded Clients: {uploadedCount}</span>
          </div>
          <div className="stat-item pending-stat">
            <span>Pending Clients: {pendingCount}</span>
          </div>
          <div className="stat-item signature-stat">
            <Edit3 size={20} />
            <span>E-Signature Ready: {eSignatureCount}</span>
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
      {debouncedSearchTerm && filteredClients.length === 0 && (
        <div className="no-results">
          <p>No contracts found matching "{debouncedSearchTerm}"</p>
        </div>
      )}
      {/* Signature Editor Modal */}
      {showSignatureEditor && editingContractForSignature && (
        <div className="modal-overlay signature-editor-overlay" onClick={() => setShowSignatureEditor(false)}>
          <div className="modal-content signature-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Setup Electronic Signature - {editingContractForSignature.fileName}</h3>
              <button onClick={() => setShowSignatureEditor(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
           
            <PDFSignatureEditor
              contractUrl={editingContractForSignature.contractUrl}
              onSave={handleSaveSignatureFields}
              onSend={handleSendForSignature}
            />
          </div>
        </div>
      )}
      {/* Contract Details Modal */}
      {showContractModal && selectedContract && (
        <div className="modal-overlay" role="dialog" aria-labelledby="modal-title" onClick={() => { setShowContractModal(false); setIframeSrc(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">Contract Details</h3>
              <div className="modal-header-actions">
                <button
                  onClick={() => {
                    setShowContractModal(false);
                    handleSetupSignatures(selectedContract);
                  }}
                  className="setup-signature-btn small"
                >
                  <Edit3 size={14} />
                  Setup E-Signature
                </button>
                <button onClick={() => { setShowContractModal(false); setIframeSrc(null); }} className="close-btn">
                  <X size={20} />
                </button>
              </div>
            </div>
            {iframeSrc ? (
              <div className="contract-viewer">
                <iframe
                  src={iframeSrc}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Contract Preview"
                />
              </div>
            ) : (
              <p>Preview not available for this file type. Please download to view.</p>
            )}
            <div className="contract-details">
              <p><strong>File Name:</strong> {selectedContract.fileName}</p>
              <p><strong>Event:</strong> {selectedContract.eventName}</p>
              <p><strong>Client:</strong> {selectedContract.clientName}</p>
              <p><strong>Status:</strong> {selectedContract.status}</p>
              <p><strong>Last Edited:</strong> {new Date(selectedContract.lastedited.seconds * 1000).toLocaleDateString()}</p>
              {selectedContract.signatureWorkflow?.isElectronic && (
                <p><strong>Signature Status:</strong> {selectedContract.signatureWorkflow.workflowStatus.replace('_', ' ')}</p>
              )}
              <button
                className="download-btn"
                onClick={() => handleDownloadContract(selectedContract.contractUrl, selectedContract.fileName)}
              >
                <Download size={16} />
                Download Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default VendorContract;