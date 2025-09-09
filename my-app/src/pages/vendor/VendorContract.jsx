// src/vendor/VendorClients.jsx
import React, { useEffect, useState } from "react";
import { Upload, User, FileText, Mail } from "lucide-react";
import { auth } from "../../firebase"; 
import "./VendorContract.css";

const VendorContract= ({ setActivePage }) => {
  const [clients, setClients] = useState([]);
  const [uploading, setUploading] = useState(null);

 
  useEffect(() => {
    const fetchClients = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Example: Fetch events where vendorID = user.uid
      // Replace with your backend/API call
      const mockClients = [
        {
          id: "1",
          name: "Sarah M.",
          email: "sarah@example.com",
          event: "Wedding Reception",
          contractUrl: null,
        },
        {
          id: "2",
          name: "Mark T.",
          email: "mark@example.com",
          event: "Corporate Dinner",
          contractUrl: "https://example.com/contracts/mark.pdf",
        },
      ];
      setClients(mockClients);
    };

    fetchClients();
  }, []);

 
  const handleFileUpload = async (clientId, file) => {
    setUploading(clientId);
    try {
      // 🔹 Upload file to Firebase Storage (pseudo-code)
      // const storageRef = ref(storage, `contracts/${clientId}/${file.name}`);
      // await uploadBytes(storageRef, file);
      // const downloadURL = await getDownloadURL(storageRef);

      // 🔹 Update client contract URL in Firestore (pseudo-code)
      // await updateDoc(doc(db, "Event", eventId, "Vendors", vendorId), {
      //   contractUrl: downloadURL
      // });

      console.log(`Uploaded contract for client ${clientId}: ${file.name}`);
      alert("Contract uploaded successfully!");
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setUploading(null);
    }
  };

  return (
    <section className="clients-page">
      <header>
        <h1>My Clients</h1>
        <p>View your clients and upload contracts for their events.</p>
      </header>

      <div className="clients-list">
        {clients.map((client) => (
          <div key={client.id} className="client-card">
            <div className="client-info">
              <p><User size={16} /> {client.name}</p>
              <p><Mail size={16} /> {client.email}</p>
              <p><FileText size={16} /> {client.event}</p>
            </div>

            <div className="contract-section">
              {client.contractUrl ? (
                <a 
                  href={client.contractUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="contract-link"
                >
                  View Contract
                </a>
              ) : (
                <label className="upload-btn">
                  <Upload size={16} />{" "}
                  {uploading === client.id ? "Uploading..." : "Upload Contract"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    hidden
                    onChange={(e) => 
                      e.target.files[0] && handleFileUpload(client.id, e.target.files[0])
                    }
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
