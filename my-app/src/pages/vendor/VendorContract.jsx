import React, { useEffect, useState } from "react";
import { Upload, User, FileText, Mail } from "lucide-react";
import { auth } from "../../firebase";
import "./VendorContract.css";

const VendorContract = ({ setActivePage }) => {
  const [clients, setClients] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          contractUrl: booking.contract || null,
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

    fetchClients();
  }, []);

  const handleFileUpload = async (eventId, file) => {
    if (!auth.currentUser) return alert("User not authenticated");
    if (!file) return alert("No file selected");

    setUploading(eventId);
    try {
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append("contract", file);

      const url = `https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/${eventId}/contract`;

      const res = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server returned unexpected response (HTTP ${res.status}): ${text.substring(0, 100)}...`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to upload contract (HTTP ${res.status})`);

      setClients(prev =>
        prev.map(c => c.eventId === eventId ? { ...c, contractUrl: data.contract } : c)
      );
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
            </div>

            <div className="contract-section">
              {client.contract? (
                <a
                  href={client.contract}
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
                    disabled={uploading === client.id}
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
