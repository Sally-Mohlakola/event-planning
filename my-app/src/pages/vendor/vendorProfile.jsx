import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { Edit, Plus, X, Trash2 } from "lucide-react";
import "./vendorProfile.css";

const VendorProfile = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [formData, setFormData] = useState({
    serviceName: "",
    cost: "",
    chargeByHour: "",
    chargePerPerson: "",
    chargePerSquareMeter: "",
    extraNotes: "",
  });

  const navProfileEdit = useCallback(() => navigate("/vendor/vendor-edit-profile"), [navigate]);

  const fetchVendor = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch vendor profile: ${res.statusText}`);
      const data = await res.json();
      setVendor(data);
      setImageVersion(Date.now());
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch vendor profile:", err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;
      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`Failed to fetch services: ${res.statusText}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch services:", err);
    }
  }, []);

  const handleSaveService = useCallback(async () => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      return;
    }
    if (!formData.serviceName) {
      setError("Service name is required");
      return;
    }
    if (!formData.cost) {
      setError("Base cost is required");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            editingService ? { ...formData, serviceId: editingService.id } : formData
          ),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (editingService) {
          setServices((prev) =>
            prev.map((s) => (s.id === editingService.id ? { ...s, ...formData } : s))
          );
        } else {
          setServices((prev) => [...prev, { id: data.serviceId, ...formData }]);
        }

        setShowServiceForm(false);
        setEditingService(null);
        setFormData({
          serviceName: "",
          cost: "",
          chargeByHour: "",
          chargePerPerson: "",
          chargePerSquareMeter: "",
          extraNotes: "",
        });
        setError("");
      } else {
        const errorData = await response.json();
        setError(`Failed to save service: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError("Error saving service");
      console.error("Error saving service:", error);
    }
  }, [editingService, formData]);

  const handleEditService = useCallback((service) => {
    setEditingService(service);
    setFormData({
      serviceName: service.serviceName || "",
      cost: service.cost || "",
      chargeByHour: service.chargeByHour || "",
      chargePerPerson: service.chargePerPerson || "",
      chargePerSquareMeter: service.chargePerSquareMeter || "",
      extraNotes: service.extraNotes || "",
    });
    setShowServiceForm(true);
    setError("");
  }, []);

  const handleDeleteService = useCallback(async (serviceId) => {
    if (!auth.currentUser) {
      setError("User not authenticated");
      console.error("Delete failed: User not authenticated");
      return;
    }
    if (!serviceId) {
      setError("Cannot delete service: Missing service ID");
      console.error("Delete failed: serviceId not provided");
      return;
    }
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }

    setDeleting(serviceId);
    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services/${serviceId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delete API error:", errorData);
        let errorMessage = errorData.error || `Failed to delete service (Status: ${response.status})`;
        if (errorData.details && errorData.details.includes("not defined")) {
          errorMessage = "Server error: Firestore configuration issue. Contact support.";
        } else if (errorData.error.includes("Permission denied")) {
          errorMessage = "Permission denied: You are not authorized to delete this service.";
        }
        throw new Error(errorMessage);
      }

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      setError("");
      await fetchServices();
    } catch (error) {
      setError(`Failed to delete service: ${error.message}`);
      console.error("Error deleting service:", error);
    } finally {
      setDeleting(null);
    }
  }, [fetchServices]);

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      await Promise.all([fetchVendor(), fetchServices()]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchVendor, fetchServices]);

  useEffect(() => {
    const handleFocus = () => {
      if (auth.currentUser) {
        Promise.all([fetchVendor(), fetchServices()]);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchVendor, fetchServices]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your profile and services...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!vendor) {
    return <p id="no-profile-found">No vendor profile found.</p>;
  }

  return (
    <div className="vendor-profile">
      {/* Header */}
      <div className="profile-header">
        <div>
          <h1 className="profile-title">Vendor Profile</h1>
          <p className="profile-subtitle">Manage your business profile and services</p>
        </div>
        <button className="edit-profile-btn" onClick={navProfileEdit}>
          <Edit size={16} /> Edit Profile
        </button>
      </div>

      {/* Profile Image Circle */}
      <div className="profile-image-circle">
        <img
          src={
            vendor.profilePic
              ? `${vendor.profilePic}?v=${imageVersion}`
              : "/default-avatar.png"
          }
          alt="Vendor Profile"
        />
      </div>

      {/* Small Summary Cards */}
      <div className="profile-summary-cards">
        <div className="profile-summary-card">
          <p className="summary-label">Bookings</p>
          <p className="summary-value">{vendor.bookings || 0}</p>
        </div>
        <div className="profile-summary-card">
          <p className="summary-label">Active Services</p>
          <p className="summary-value">{services.length || 0}</p>
        </div>
        <div className="profile-summary-card">
          <p className="summary-label">Total Reviews</p>
          <p className="summary-value">{vendor.totalReviews || 0}</p>
        </div>
        <div className="profile-summary-card">
          <p className="summary-label">Avg. Rating</p>
          <p className="summary-value">{vendor.avgRating || 0}</p>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="profile-cards-grid">
        {/* Business Information */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Business Information</h2>
          </div>
          <div className="business-topline">
            <h3 className="business-name">{vendor.businessName || "Unnamed Business"}</h3>
            <span className="business-badge">{vendor.category || "Uncategorized"}</span>
          </div>
          <div className="business-description">
            <p>{vendor.description || "No description provided."}</p>
          </div>
          <div className="business-contact">
            <p className="contact-item">📍 {vendor.address || "No address provided"}</p>
            <p className="contact-item">📞 {vendor.phone || "No phone provided"}</p>
            <p className="contact-item">✉️ {vendor.email || "No email provided"}</p>
          </div>
        </div>

        {/* Services & Pricing */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2>Services & Pricing</h2>
            <button
              className="add-service-btn"
              onClick={() => setShowServiceForm(true)}
              aria-label="Add New Service"
            >
              <Plus size={16} /> Add Service
            </button>
          </div>
          <div className="services-list">
            {services.length > 0 ? (
              services.map((s, i) => (
                <div className="service-item" key={s.id || `service-${i}`}>
                  <div>
                    <h4>{s.serviceName || "Unnamed Service"}</h4>
                    <p>Cost: R{s.cost || "N/A"}</p>
                    {s.chargeByHour && <p>Per Hour: R{s.chargeByHour}</p>}
                    {s.chargePerPerson && <p>Per Person: R{s.chargePerPerson}</p>}
                    {s.chargePerSquareMeter && <p>Per m²: R{s.chargePerSquareMeter}</p>}
                    {s.extraNotes && <p className="service-notes">{s.extraNotes}</p>}
                  </div>
                  <div className="service-actions">
                    <button
                      className="edit-service-btn"
                      onClick={() => handleEditService(s)}
                      aria-label={`Edit ${s.serviceName || "service"}`}
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      className="delete-service-btn"
                      onClick={() => handleDeleteService(s.id)}
                      disabled={deleting === s.id || !s.id}
                      aria-label={`Delete ${s.serviceName || "service"}`}
                    >
                      <Trash2 size={14} /> {deleting === s.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No services added yet. Add your first service above.</p>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {showServiceForm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-labelledby="modal-title"
          onClick={() => {
            setShowServiceForm(false);
            setEditingService(null);
            setFormData({
              serviceName: "",
              cost: "",
              chargeByHour: "",
              chargePerPerson: "",
              chargePerSquareMeter: "",
              extraNotes: "",
            });
            setError("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">{editingService ? "Edit Service" : "Add New Service"}</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowServiceForm(false);
                  setEditingService(null);
                  setFormData({
                    serviceName: "",
                    cost: "",
                    chargeByHour: "",
                    chargePerPerson: "",
                    chargePerSquareMeter: "",
                    extraNotes: "",
                  });
                  setError("");
                }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {error && <div className="error modal-error">{error}</div>}
              <input
                type="text"
                name="serviceName"
                placeholder="Service Name *"
                value={formData.serviceName}
                onChange={handleChange}
                required
                aria-label="Service Name"
                aria-required="true"
              />
              <input
                type="number"
                name="cost"
                placeholder="Base Cost *"
                value={formData.cost}
                onChange={handleChange}
                required
                aria-label="Base Cost"
                aria-required="true"
              />
              <input
                type="number"
                name="chargeByHour"
                placeholder="Charge by Hour (optional)"
                value={formData.chargeByHour}
                onChange={handleChange}
                aria-label="Charge by Hour"
              />
              <input
                type="number"
                name="chargePerPerson"
                placeholder="Charge per Person (optional)"
                value={formData.chargePerPerson}
                onChange={handleChange}
                aria-label="Charge per Person"
              />
              <input
                type="number"
                name="chargePerSquareMeter"
                placeholder="Charge per Square Meter (optional)"
                value={formData.chargePerSquareMeter}
                onChange={handleChange}
                aria-label="Charge per Square Meter"
              />
              <textarea
                name="extraNotes"
                placeholder="Extra Notes (optional)"
                value={formData.extraNotes}
                onChange={handleChange}
                rows="3"
                aria-label="Extra Notes"
              />
            </div>
            <div className="modal-footer">
              <button className="upload-btn" onClick={handleSaveService}>
                {editingService ? "Update" : "Save"}
              </button>
              <button
                className="upload-btn secondary"
                onClick={() => {
                  setShowServiceForm(false);
                  setEditingService(null);
                  setFormData({
                    serviceName: "",
                    cost: "",
                    chargeByHour: "",
                    chargePerPerson: "",
                    chargePerSquareMeter: "",
                    extraNotes: "",
                  });
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProfile;
