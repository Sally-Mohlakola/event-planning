import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { Edit, Plus, X, Trash2, Phone, Mail, MapPin, Calendar, Award, Users, Star } from "lucide-react";
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
    <div className="vendor-profile-container">
      {/* Elegant Header Section */}
      <div className="elegant-header">
        <div className="header-main">
          <div className="header-left">
            <h1 className="main-title">Vendor Profile</h1>
            <div className="business-display">
              <div className="business-name-card">
                {vendor.businessName || "Unnamed Business"}
              </div>
              <div className="category-tag">
                {vendor.category || "Uncategorized"}
              </div>
            </div>
          </div>
          <button className="elegant-edit-btn" onClick={navProfileEdit}>
            <Edit size={18} /> Edit Profile
          </button>
        </div>
        <div className="header-subtitle">
          <div className="subtitle-line"></div>
          <h2>Manage your business profile and services</h2>
          <div className="subtitle-line"></div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="elegant-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Calendar className="stat-icon" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Bookings</span>
            <span className="stat-value">{vendor.bookings || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Award className="stat-icon" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Services</span>
            <span className="stat-value">{services.length || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Users className="stat-icon" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Reviews</span>
            <span className="stat-value">{vendor.totalReviews || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Star className="stat-icon" size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Rating</span>
            <span className="stat-value">{vendor.avgRating || 0}<span className="star">★</span></span>
          </div>
        </div>
      </div>

      {/* Enhanced Business Description Section */}
      <div className="description-showcase">
        <div className="description-content">
          <div className="description-header">
            <div className="description-title-section">
              <h3>Business Overview</h3>
              <div className="title-decoration">
                <div className="decoration-dot"></div>
                <div className="decoration-line"></div>
                <div className="decoration-dot"></div>
              </div>
            </div>
            <p className="description-subtitle">Tell your story and showcase what makes your business unique</p>
          </div>
          <div className="description-text">
            <p>{vendor.description || "No description provided. Add a compelling description of your business to attract more customers. Share your mission, values, and what sets you apart from competitors."}</p>
          </div>
          <div className="description-features">
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Professional Service</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Quality Guaranteed</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <span>Customer Focused</span>
            </div>
          </div>
        </div>
        <div className="profile-showcase">
          <div className="profile-frame">
            <div className="profile-image-container">
              <img
                src={
                  vendor.profilePic
                    ? `${vendor.profilePic}?v=${imageVersion}`
                    : "/default-avatar.png"
                }
                alt="Vendor Profile"
                className="profile-image"
              />
              <div className="profile-glow"></div>
            </div>
            <div className="profile-badge">
              <div className="status-dot"></div>
              Verified Vendor
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information and Services Section */}
      <div className="main-content-section">
        <div className="contact-card">
          <div className="section-header">
            <h3>Contact Information</h3>
            <div className="accent-line"></div>
          </div>
          <div className="contact-list">
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <MapPin className="contact-icon" size={20} />
              </div>
              <div className="contact-details">
                <span className="contact-label">Address</span>
                <span className="contact-value">{vendor.address || "No address provided"}</span>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <Phone className="contact-icon" size={20} />
              </div>
              <div className="contact-details">
                <span className="contact-label">Phone</span>
                <span className="contact-value">{vendor.phone || "No phone provided"}</span>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon-wrapper">
                <Mail className="contact-icon" size={20} />
              </div>
              <div className="contact-details">
                <span className="contact-label">Email</span>
                <span className="contact-value">{vendor.email || "No email provided"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services Table Section */}
        <div className="services-section">
          <div className="services-header">
            <div className="section-header">
              <h3>Services & Pricing</h3>
              <div className="accent-line"></div>
            </div>
            <button className="add-service-btn" onClick={() => setShowServiceForm(true)}>
              <Plus size={18} /> Add New Service
            </button>
          </div>
          
          <div className="services-table-container">
            {services.length > 0 ? (
              <table className="services-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Base Cost</th>
                    <th>Additional Pricing</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, index) => (
                    <tr key={service.id || `service-${index}`} className="service-row">
                      <td>
                        <div className="service-name-section">
                          <strong>{service.serviceName || "Unnamed Service"}</strong>
                          {service.extraNotes && (
                            <div className="service-notes">{service.extraNotes}</div>
                          )}
                        </div>
                      </td>
                      <td className="price-cell">
                        <span className="base-price">R{service.cost || "N/A"}</span>
                      </td>
                      <td>
                        <div className="pricing-details">
                          {service.chargeByHour && (
                            <span className="pricing-tag">Hourly: R{service.chargeByHour}</span>
                          )}
                          {service.chargePerPerson && (
                            <span className="pricing-tag">Per Person: R{service.chargePerPerson}</span>
                          )}
                          {service.chargePerSquareMeter && (
                            <span className="pricing-tag">Per m²: R{service.chargePerSquareMeter}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="service-actions">
                          <button
                            className="edit-service-btn"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="delete-service-btn"
                            onClick={() => handleDeleteService(service.id)}
                            disabled={deleting === service.id || !service.id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-services-placeholder">
                <Award size={48} className="placeholder-icon" />
                <h4>No Services Added Yet</h4>
                <p>Start by adding your first service to showcase your offerings</p>
                <button className="add-first-service-btn" onClick={() => setShowServiceForm(true)}>
                  <Plus size={18} /> Add Your First Service
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="gallery-section">
        <div className="section-header">
          <h3>Gallery & Portfolio</h3>
          <div className="accent-line"></div>
        </div>
        <div className="gallery-grid">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="gallery-item">
              <div className="gallery-image-placeholder">
                <Plus size={32} />
                <span>Add Image</span>
              </div>
              <div className="gallery-info">
                <span>Project {item}</span>
                <button className="upload-gallery-btn">Upload</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {showServiceForm && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingService ? "Edit Service" : "Add New Service"}</h3>
              <button className="close-btn" onClick={() => setShowServiceForm(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  name="serviceName"
                  value={formData.serviceName}
                  onChange={handleChange}
                  placeholder="Enter service name"
                />
              </div>
              <div className="form-group">
                <label>Base Cost (R) *</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="Enter base cost"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Hourly Rate (optional)</label>
                  <input
                    type="number"
                    name="chargeByHour"
                    value={formData.chargeByHour}
                    onChange={handleChange}
                    placeholder="R per hour"
                  />
                </div>
                <div className="form-group">
                  <label>Per Person (optional)</label>
                  <input
                    type="number"
                    name="chargePerPerson"
                    value={formData.chargePerPerson}
                    onChange={handleChange}
                    placeholder="R per person"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Per Square Meter (optional)</label>
                <input
                  type="number"
                  name="chargePerSquareMeter"
                  value={formData.chargePerSquareMeter}
                  onChange={handleChange}
                  placeholder="R per m²"
                />
              </div>
              <div className="form-group">
                <label>Description & Notes</label>
                <textarea
                  name="extraNotes"
                  value={formData.extraNotes}
                  onChange={handleChange}
                  placeholder="Additional details about this service..."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowServiceForm(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveService}>
                {editingService ? "Update Service" : "Create Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProfile;
