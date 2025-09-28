
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Star,
  StarHalf,
  FileText,
  DollarSign,
  Eye,
  Plus,
  MapPin,
  CheckCircle,
  AlertCircle,
  Edit,
  X,
  Trash2,
} from "lucide-react";
import { auth } from "../../firebase";

import { onAuthStateChanged } from "firebase/auth";


import "./VendorDashboard.css";

const VendorDashboard = ({ setActivePage }) => {
  const [services, setServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [vendorId, setVendorId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [contractStats] = useState({
    total: 12,
    uploaded: 8,
    pending: 4,
  });
  const [formData, setFormData] = useState({
    serviceName: "",
    cost: "",
    chargeByHour: "",
    chargePerPerson: "",
    chargePerSquareMeter: "",
    extraNotes: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
 

  // Get vendor ID from auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setVendorId(user.uid);
        console.log("Vendor ID set:", user.uid);
      } else {
        setError("User not authenticated");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const recentBookings = [
    { id: 1, event: "Corporate Lunch", date: "Aug 20", status: "confirmed", amount: "R15,000" },
    { id: 2, event: "Wedding Reception", date: "Aug 25", status: "pending", amount: "R45,000" },
    { id: 3, event: "Birthday Party", date: "Aug 30", status: "confirmed", amount: "R8,500" },
  ];

  const recentReviews = [
    { id: 1, name: "Sarah M.", rating: 5, comment: "Exceptional service and delicious food!", date: "2 days ago" },
    { id: 2, name: "John D.", rating: 4, comment: "Great presentation and timely delivery.", date: "1 week ago" },
  ];

  // Fetch services
  const fetchServices = useCallback(async () => {
    if (!vendorId) {
      console.log("Skipping fetchServices: vendorId not set");
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/${vendorId}/services`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Services API response:", data);
        const servicesData = Array.isArray(data) ? data : data.services || [];
        const validServices = servicesData.filter(
          (s) => s.id && typeof s.id === "string"
        );
        if (servicesData.length !== validServices.length) {
          console.warn(
            "Some services missing valid IDs:",
            servicesData.filter((s) => !s.id || typeof s.id !== "string")
          );
          setError("Some services could not be loaded due to missing IDs");
        }
        setServices(validServices);
        console.log("Services state set:", validServices);
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch services: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError("Failed to fetch services");
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Fetch data when vendorId is available
  useEffect(() => {
    if (vendorId) {
      fetchServices();
    }
  }, [vendorId, fetchServices]);

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSaveService = useCallback(async () => {
    if (!vendorId) {
      setError("User not authenticated");
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
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
        alert(editingService ? "Service updated successfully!" : "Service added successfully!");
        await fetchServices();
      } else {
        const errorData = await response.json();
        setError(`Failed to save service: ${errorData.error}`);
      }
    } catch (error) {
      setError("Error saving service");
      console.error("Error saving service:", error);
    }
  }, [vendorId, editingService, formData, fetchServices]);

  const handleEdit = useCallback((service) => {
    if (!service.id) {
      setError("Cannot edit service: Missing service ID");
      console.error("Edit failed: Missing service ID", service);
      return;
    }
    setEditingService(service);
    setFormData(service);
    setShowServiceForm(true);
  }, []);

  const handleDeleteService = useCallback(async (serviceId) => {
    if (!vendorId || !auth.currentUser) {
      setError("User not authenticated");
      console.error("Delete failed: vendorId not set");
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

    console.log("Attempting to delete service:", { vendorId, serviceId });
    setDeleting(serviceId);
    console.log("Deleting state set to:", serviceId);
    try {
      const token = await auth.currentUser.getIdToken();
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
        throw new Error(errorData.error || "Failed to delete service on client side");
      }

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      alert("Service deleted successfully!");
      await fetchServices();
    } catch (error) {
      setError(`Failed to delete service: ${error.message}`);
      console.error("Error deleting service:", error);
    } finally {
      setDeleting(null);
      console.log("Deleting state cleared");
    }
  }, [vendorId, fetchServices]);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="vendor-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard Overview</h1>
          <p className="dashboard-subtitle">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-primary" onClick={() => setActivePage("bookings")}>
            <Plus size={16} />
            New Booking
          </button>
          <button className="btn-secondary">
            <Eye size={16} />
            Analytics
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card blue">
          <div className="summary-card-header">
            <div className="summary-icon blue">
              <Calendar size={24} />
            </div>
            <span className="summary-change">+12%</span>
          </div>
          <div>
            <h3 className="summary-label">Total Bookings</h3>
            <p className="summary-value">28</p>
            <p className="summary-subtext">This month</p>
          </div>
        </div>

        <div className="summary-card green">
          <div className="summary-card-header">
            <div className="summary-icon green">
              <DollarSign size={24} />
            </div>
            <span className="summary-change">+15%</span>
          </div>
          <div>
            <h3 className="summary-label">Revenue (MTD)</h3>
            <p className="summary-value">R85k</p>
            <p className="summary-subtext">Monthly target: R100k</p>
          </div>
        </div>

        <div className="summary-card yellow">
          <div className="summary-card-header">
            <div className="summary-icon yellow">
              <Star size={24} />
            </div>
            <span className="summary-change">+0.2</span>
          </div>
          <div>
            <h3 className="summary-label">Avg Rating</h3>
            <p className="summary-value">4.8</p>
            <p className="summary-subtext">120 reviews</p>
          </div>
        </div>

        <div className="summary-card purple">
          <div className="summary-card-header">
            <div className="summary-icon purple">
              <FileText size={24} />
            </div>
            <span className="summary-change">
              {contractStats.pending > 0 ? `${contractStats.pending} pending` : "All up to date"}
            </span>
          </div>
          <div>
            <h3 className="summary-label">Contract Status</h3>
            <p className="summary-value">
              {contractStats.uploaded}/{contractStats.total}
            </p>
            <p className="summary-subtext">Contracts uploaded</p>
          </div>
        </div>

        <div className="summary-card orange">
          <div className="summary-card-header">
            <div className="summary-icon orange">
              <FileText size={24} />
            </div>
            <span className="summary-change">{services.length} active</span>
          </div>
          <div>
            <h3 className="summary-label">Active Services</h3>
            <p className="summary-value">{services.length}</p>
            <p className="summary-subtext">Total services offered</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Recent Bookings */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Bookings</h3>
            <button onClick={() => setActivePage("bookings")} className="view-all-link">
              View All
            </button>
          </div>
          <div className="card-content">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="booking-item">
                <div className="booking-header">
                  <h4>{booking.event}</h4>
                  <span className={`status-badge ${booking.status}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="booking-footer">
                  <span>{booking.date}</span>
                  <span className="amount">{booking.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Reviews</h3>
            <button onClick={() => setActivePage("reviews")} className="view-all-link">
              View All
            </button>
          </div>
          <div className="card-content">
            {recentReviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-user">
                    <h4>{review.name}</h4>
                    <div className="rating">
                      {[1, 2, 3, 4, 5].map((i) => {
                        if (i <= Math.floor(review.rating)) {
                          return <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />;
                        } else if (i - review.rating <= 0.5) {
                          return <StarHalf key={i} size={14} fill="#fbbf24" color="#fbbf24" />;
                        } else {
                          return <Star key={i} size={14} color="#d1d5db" />;
                        }
                      })}
                    </div>
                  </div>
                  <span className="review-date">{review.date}</span>
                </div>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          {/* Contract Status Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Contract Management</h3>
              <button onClick={() => setActivePage("contracts")} className="view-all-link">
                Manage All
              </button>
            </div>
            <div className="card-content">
              <div className="contract-stats">
                <div className="stat-row">
                  <span className="stat-label">Total Contracts:</span>
                  <span className="stat-value">{contractStats.total}</span>
                </div>
                <div className="stat-row uploaded">
                  <span className="stat-label">Uploaded:</span>
                  <span className="stat-value">{contractStats.uploaded}</span>
                </div>
                <div className="stat-row pending">
                  <span className="stat-label">Pending:</span>
                  <span className="stat-value">{contractStats.pending}</span>
                </div>
              </div>
              {contractStats.pending > 0 && (
                <div className="contract-alert">
                  <AlertCircle size={16} color="#f59e0b" />
                  <span>You have {contractStats.pending} contracts pending upload</span>
                </div>
              )}
            </div>
          </div>

          {/* Venue Status */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Venue Status</h3>
              <button onClick={() => setActivePage("floorplan")} className="view-all-link">
                View Plan
              </button>
            </div>
            <div className="card-content">
              <div className="venue-item">
                <CheckCircle className="venue-icon available" size={20} />
                <div>
                  <p className="venue-name">Main Hall</p>
                  <p className="venue-details">Available - 200 capacity</p>
                </div>
              </div>
              <div className="venue-item">
                <AlertCircle className="venue-icon booked" size={20} />
                <div>
                  <p className="venue-name">Garden Area</p>
                  <p className="venue-details">Booked Aug 25</p>
                </div>
              </div>
              <div className="venue-item">
                <CheckCircle className="venue-icon available" size={20} />
                <div>
                  <p className="venue-name">VIP Lounge</p>
                  <p className="venue-details">Available - 50 capacity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="dashboard-card">
        <div className="card-header">
          <h3>Services</h3>
          <button onClick={() => setShowServiceForm(true)} className="btn-primary">
            <Plus size={16} /> Add Service
          </button>
        </div>
        <div className="card-content">
          {services.length === 0 && <p>No services added yet.</p>}
          {services.map((service, index) => (
            <div key={service.id || `temp-${index}`} className="service-item">
              <div>
                <h4>{service.serviceName || "Unnamed Service"}</h4>
                <p>Cost: R{service.cost || "N/A"}</p>
                {service.chargeByHour && <p>Per Hour: R{service.chargeByHour}</p>}
                {service.chargePerPerson && <p>Per Person: R{service.chargePerPerson}</p>}
                {service.chargePerSquareMeter && <p>Per m²: R{service.chargePerSquareMeter}</p>}
                {service.extraNotes && <p className="service-notes">{service.extraNotes}</p>}
                {!service.id && (
                  <p className="error-text">Warning: This service is missing an ID and cannot be edited or deleted.</p>
                )}
              </div>
              <div className="service-actions">
                <button
                  className="btn-secondary"
                  onClick={() => handleEdit(service)}
                  disabled={!service.id}
                  title={service.id ? "Edit service" : "Cannot edit: Missing service ID"}
                  data-testid={`edit-service-${service.id || index}`}
                >
                  <Edit size={16} /> Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteService(service.id)}
                  disabled={deleting === service.id || !service.id}
                  title={service.id ? "Delete service" : "Cannot delete: Missing service ID"}
                  data-testid={`delete-service-${service.id || index}`}
                >
                  <Trash2 size={16} /> {deleting === service.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="actions-grid">
            <button
              data-testid="quick-action-update-profile"
              onClick={() => setActivePage("profile")}
              className="action-card blue"
            >
              <Edit size={24} />
              <p>Update Profile</p>
            </button>
            <button
              data-testid="quick-action-new-booking"
              onClick={() => setActivePage("bookings")}
              className="action-card green"
            >
              <Plus size={24} />
              <p>New Booking</p>
            </button>
            <button
              data-testid="quick-action-review-contracts"
              onClick={() => setActivePage("contracts")}
              className="action-card purple"
            >
              <FileText size={24} />
              <p>Review Contracts</p>
            </button>
            <button
              data-testid="quick-action-manage-venues"
              onClick={() => setActivePage("floorplan")}
              className="action-card orange"
            >
              <MapPin size={24} />
              <p>Manage Venues</p>
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {showServiceForm && (
        <div
          className="modal"
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
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-title">{editingService ? "Edit Service" : "Add New Service"}</h3>
              <button
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
                }}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                name="serviceName"
                placeholder="Service Name"
                value={formData.serviceName}
                onChange={handleChange}
                required
                aria-label="Service Name"
              />
              <input
                type="number"
                name="cost"
                placeholder="Base Cost"
                value={formData.cost}
                onChange={handleChange}
                aria-label="Base Cost"
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
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSaveService}>
                {editingService ? "Update" : "Save"}
              </button>
              <button
                className="btn-secondary"
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

export default VendorDashboard;
