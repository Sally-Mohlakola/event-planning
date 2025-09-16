import React, { useEffect, useState } from "react";
import { Upload, User, FileText, Mail, Calendar, Clock } from "lucide-react";
import { auth, storage, db } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, collection, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import "./VendorContract.css";

const VendorContract = ({ setActivePage }) => {
  const [clients, setClients] = useState([]);
  const [allContracts, setAllContracts] = useState([]); // Frontend-only contracts array
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load contracts from Firebase subcollection
  const loadContractsFromFirestore = async () => {
    if (!auth.currentUser) return;

    try {
      const vendorId = auth.currentUser.uid;
      // Need to get eventId first - you'll need to modify this based on your data structure
      // For now, we'll load contracts from all events this vendor is part of
      const contractsData = [];
      
      // If you have a specific eventId, use: 
      // const contractsRef = collection(db, "Event", eventId, "Vendors", vendorId, "Contracts");
      
      // For multiple events, you'd need to iterate through events
      // This is a placeholder - you'll need to adapt based on your actual Event structure
      for (const client of clients) {
        if (client.eventId) {
          try {
            const contractsRef = collection(db, "Event", client.eventId, "Vendors", vendorId, "Contracts");
            const contractsSnapshot = await getDocs(contractsRef);
            
            contractsSnapshot.docs.forEach(doc => {
              contractsData.push({
                id: doc.id,
                ...doc.data()
              });
            });
          } catch (eventError) {
            console.log(`No contracts found for event ${client.eventId}:`, eventError.message);
          }
        }
      }
      
      console.log("Loaded contracts from Firestore:", contractsData.length);
      setAllContracts(contractsData);
    } catch (error) {
      console.error("Error loading contracts from Firestore:", error);
      // Don't fail silently - continue with local-only mode
      console.log("Continuing with local-only contract management");
    }
  };

  // Initialize contracts from existing client data or Firestore
  useEffect(() => {
    const initializeContracts = async () => {
      if (auth.currentUser) {
        // First load from Firestore
        await loadContractsFromFirestore();
        
        // Then check if we need to add any contracts from client data that aren't in Firestore
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
              googleApisUrl: client.contractUrl, // Same URL for Google APIs access
              fileName: client.contractUrl ? client.contractUrl.split('/').pop().split('?')[0] : 'unknown.pdf',
              fileSize: 0, // Unknown for existing contracts
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
          
          // Only add contracts that don't already exist in Firestore
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
  }, [clients]);

  const fetchClients = async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const url = "https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        const errorText = contentType?.includes("application/json")
          ? (await res.json()).message
          : await res.text();
        throw new Error(`Failed to fetch clients: ${errorText} (HTTP ${res.status})`);
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
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  // Refresh data when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (auth.currentUser) {
        fetchClients();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Create or update contract entry in AllContracts array and Firestore
  const createOrUpdateContractEntry = async (eventId, contractUrl, fileName, fileSize, clientInfo, isUpdate = false) => {
    const vendorId = auth.currentUser?.uid || '';
    const currentTime = { seconds: Math.floor(Date.now() / 1000) };

    try {
      if (isUpdate) {
        // Update existing contract in Firestore and local state
        const existingContract = allContracts.find(c => c.eventId === eventId);
        if (existingContract) {
          const updatedContract = {
            ...existingContract,
            contractUrl: contractUrl,
            googleApisUrl: contractUrl,
            fileName: fileName,
            fileSize: fileSize,
            lastedited: currentTime,
            uploadHistory: [
              ...(existingContract.uploadHistory || []),
              {
                uploadDate: currentTime,
                fileName: fileName,
                fileSize: fileSize,
                action: "contract_update"
              }
            ]
          };

          try {
            // Try to update in Firestore - using Event > Vendors > Contracts structure
            const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", existingContract.id);
            await updateDoc(contractRef, updatedContract);
            console.log("Contract updated in Firestore:", eventId);
          } catch (firestoreError) {
            console.warn("Failed to update in Firestore, continuing with local-only:", firestoreError.message);
          }

          // Update local state regardless
          setAllContracts(prev => 
            prev.map(contract => 
              contract.eventId === eventId ? updatedContract : contract
            )
          );
        }
      } else {
        // Create new contract entry
        const contractId = uuidv4();
        const newContract = {
          id: contractId,
          eventId: eventId,
          vendorId: vendorId,
          clientName: clientInfo.name,
          clientEmail: clientInfo.email,
          eventName: clientInfo.event,
          contractUrl: contractUrl,
          googleApisUrl: contractUrl, // Same URL for Google APIs access
          fileName: fileName,
          fileSize: fileSize,
          status: "active",
          firstuploaded: currentTime,
          lastedited: currentTime,
          uploadHistory: [{
            uploadDate: currentTime,
            fileName: fileName,
            fileSize: fileSize,
            action: "initial_upload"
          }],
          createdAt: currentTime,
          updatedAt: currentTime
        };

        try {
          // Try to save to Firestore subcollection - using Event > Vendors > Contracts structure
          const contractRef = doc(db, "Event", eventId, "Vendors", vendorId, "Contracts", contractId);
          await setDoc(contractRef, newContract);
          console.log("New contract saved to Firestore subcollection:", contractId);
        } catch (firestoreError) {
          console.warn("Failed to save to Firestore, continuing with local-only:", firestoreError.message);
        }

        // Update local state regardless
        setAllContracts(prev => {
          // Check if contract already exists, if so update it, otherwise add new
          const existingIndex = prev.findIndex(c => c.eventId === eventId);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...newContract, firstuploaded: updated[existingIndex].firstuploaded };
            return updated;
          }
          return [...prev, newContract];
        });
      }

      console.log("Contract entry created/updated in AllContracts array:", { eventId, fileName, isUpdate });
    } catch (error) {
      console.error("Error in contract management:", error);
      // Don't throw the error - continue with local-only mode
    }
  };

  const handleFileUpload = async (eventId, file) => {
    if (!auth.currentUser) return alert("User not authenticated");
    if (!file) return alert("No file selected");

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return alert("Invalid file type. Please upload PDF, DOC, or DOCX files only.");
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return alert("File size too large. Please upload files smaller than 10MB.");
    }

    setUploading(eventId);
    try {
      const vendorId = auth.currentUser.uid;
      const clientInfo = clients.find(c => c.eventId === eventId);
      const isUpdate = clientInfo?.contractUrl ? true : false;
      
      // Upload file to Firebase Storage
      const fileName = `Contracts/${eventId}/${vendorId}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      
      console.log("Uploading file to:", fileName);
      const snapshot = await uploadBytes(storageRef, file);
      console.log("File uploaded successfully");
      
      // Get download URL (this will be your Google APIs compatible URL)
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", downloadUrl);

      // Note: Database update removed - handling everything frontend-only
      console.log("Contract uploaded to Firebase Storage:", {
        downloadUrl,
        fileName: file.name,
        fileSize: file.size,
        isUpdate
      });

      // Create/Update entry in AllContracts array and save to Firestore subcollection
      await createOrUpdateContractEntry(
        eventId, 
        downloadUrl, 
        file.name, 
        file.size, 
        clientInfo,
        isUpdate
      );

      // Update local clients state immediately
      setClients(prev =>
        prev.map(c => c.eventId === eventId ? { 
          ...c, 
          contractUrl: downloadUrl,
          lastedited: { seconds: Date.now() / 1000 },
          ...(isUpdate ? {} : { firstuploaded: { seconds: Date.now() / 1000 } })
        } : c)
      );
      
      // Refresh the full data after successful upload (optional since we're not using the API)
      // await fetchClients();
      
      alert(isUpdate ? "Contract updated successfully!" : "Contract uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to ${clients.find(c => c.eventId === eventId)?.contractUrl ? 'update' : 'upload'} contract: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  // Helper function to get contract info from AllContracts
  const getContractInfo = (eventId) => {
    return allContracts.find(contract => contract.eventId === eventId);
  };

  // Helper function to get all contracts as exportable data
  const getAllContractsData = () => {
    return allContracts.map(contract => ({
      ...contract,
      // Convert Google APIs URL for easy copying
      googleApisAccessUrl: contract.googleApisUrl,
      // Add formatted dates
      firstUploadedFormatted: contract.firstuploaded ? 
        new Date(contract.firstuploaded.seconds * 1000).toISOString() : null,
      lastEditedFormatted: contract.lastedited ? 
        new Date(contract.lastedited.seconds * 1000).toISOString() : null,
    }));
  };

  // Debug function to log all contracts
  const logAllContracts = () => {
    console.log("=== ALL CONTRACTS DATA ===");
    console.log(JSON.stringify(getAllContractsData(), null, 2));
    console.log("=== CONTRACTS COUNT ===", allContracts.length);
  };

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
        <h1>My Clients</h1>
        <p>View your clients and upload contracts for their events.</p>
        {allContracts.length > 0 && (
          <div className="contracts-summary">
            <p><FileText size={16} /> Total Contracts: {allContracts.length}</p>
            <button 
              onClick={logAllContracts}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Log All Contracts (Console)
            </button>
          </div>
        )}
      </header>

      <div className="clients-list">
        {clients.map(client => {
          const contractInfo = getContractInfo(client.eventId);
          
          return (
            <div key={client.id} className="client-card">
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
                      File: {contractInfo.fileName} ({(contractInfo.fileSize / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                    <p className="contract-info">
                      <strong>Google APIs URL:</strong>
                    </p>
                    <code className="google-apis-url">{contractInfo.googleApisUrl}</code>
                    <p className="contract-info">
                      Status: <span className={`status-${contractInfo.status}`}>{contractInfo.status}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="contract-section">
                {client.contractUrl ? (
                  <div className="contract-actions">
                    <a
                      href={client.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contract-link"
                    >
                      View Contract
                    </a>
                    <label className="upload-btn secondary">
                      <Upload size={16} />{" "}
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
                    <Upload size={16} />{" "}
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
        })}
      </div>

      {/* AllContracts Summary Section */}
      {allContracts.length > 0 && (
        <div className="all-contracts-section" style={{marginTop: '2rem'}}>
          <h2>All Contracts Summary</h2>
          <div className="contracts-grid">
            {allContracts.map(contract => (
              <div key={contract.id} className="contract-summary-card" style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem',
                margin: '0.5rem',
                backgroundColor: '#f9f9f9'
              }}>
                <h4>{contract.eventName}</h4>
                <p><strong>Client:</strong> {contract.clientName}</p>
                <p><strong>File:</strong> {contract.fileName}</p>
                <p><strong>Size:</strong> {(contract.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                {contract.firstuploaded && (
                  <p><strong>Uploaded:</strong> {new Date(contract.firstuploaded.seconds * 1000).toLocaleDateString()}</p>
                )}
                <p><strong>Google APIs URL:</strong></p>
                <code style={{
                  display: 'block',
                  padding: '0.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all',
                  marginTop: '0.25rem'
                }}>
                  {contract.googleApisUrl}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug section - remove in production */}
      {process.env.NODE_ENV === 'development' && allContracts.length > 0 && (
        <div className="debug-section" style={{marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px'}}>
          <h3>AllContracts Debug Info</h3>
          <pre style={{fontSize: '12px', overflow: 'auto', maxHeight: '300px'}}>
            {JSON.stringify(getAllContractsData(), null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};

export default VendorContract;