import React, { useEffect, useState } from "react";
import { Upload, User, FileText, Mail } from "lucide-react";
import { auth, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import "./VendorContract.css";

const VendorContract = ({ setActivePage }) => {
  const [clients, setClients] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      
      // Upload file to Firebase Storage
      const fileName = `Contracts/${eventId}/${vendorId}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      
      console.log("Uploading file to:", fileName);
      const snapshot = await uploadBytes(storageRef, file);
      console.log("File uploaded successfully");
      
      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", downloadUrl);

      // Update Firestore via API
      const token = await auth.currentUser.getIdToken();
      const updateRes = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/${eventId}/contract-url`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contractUrl: downloadUrl }),
        }
      );

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.message || "Failed to update contract URL in database");
      }

      // Update local state immediately
      setClients(prev =>
        prev.map(c => c.eventId === eventId ? { 
          ...c, 
          contractUrl: downloadUrl,
          lastedited: { seconds: Date.now() / 1000 }
        } : c)
      );
      
      // Refresh the full data after successful upload
      await fetchClients();
      
      alert("Contract uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to upload contract: ${err.message}`);
    } finally {
      setUploading(null);
    }
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
      </header>

      <div className="clients-list">
        {clients.map(client => (
          <div key={client.id} className="client-card">
            <div className="client-info">
              <p><User size={16} /> {client.name}</p>
              <p><Mail size={16} /> {client.email}</p>
              <p><FileText size={16} /> {client.event}</p>
              {client.firstuploaded && (
                <p className="contract-info">
                  First uploaded: {new Date(client.firstuploaded.seconds * 1000).toLocaleDateString()}
                </p>
              )}
              {client.lastedited && client.firstuploaded && client.lastedited.seconds !== client.firstuploaded.seconds && (
                <p className="contract-info">
                  Last updated: {new Date(client.lastedited.seconds * 1000).toLocaleDateString()}
                </p>
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
        ))}
      </div>
    </section>
  );
};

export default VendorContract;