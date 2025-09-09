// src/vendor/VendorBooking.jsx
import React, { useState, useEffect } from "react";
import { Calendar, User, MapPin, Clock, CheckCircle, XCircle, Filter } from "lucide-react";
import { auth } from "../../firebase"; // ensure firebase is imported
import './vendorBooking.css';

const VendorBooking = ({ setActivePage }) => {
  const [filter, setFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      if (!auth.currentUser) return;

      try {
        const token = await auth.currentUser.getIdToken();
        console.log(auth.currentUser.uid);
        const res = await fetch("https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch bookings");
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const filteredBookings =
    filter === "all" ? bookings : bookings.filter((b) => b.vendorStatus === filter);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );
  }
  if (error) return <p className="error">{error}</p>;
  if (!bookings.length) return <p className="no-bookings">No bookings found.</p>;

  return (
    <section className="booking-page">
      <header>
        <h1>Booking Management</h1>
        <p>View, manage, and update your event bookings in one place.</p>
      </header>

      {/* Filters */}
      <div className="filters">
        <Filter />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Booking List */}
      <div className="booking-list">
        {filteredBookings.map((booking) => (
          <div key={booking.eventId} className="booking-card">
            <h2>{booking.name}</h2>
            <div className="details">
              <p><User size={16} /> {booking.name || "Unknown Client"}</p>
              <p><Calendar size={16} /> {new Date(booking.date).toLocaleDateString()}</p>
              <p><Clock size={16} /> {booking.time || "TBD"}</p>
              <p><MapPin size={16} /> {booking.location}</p>
            </div>

            {/* Status & Actions */}
            <div className="actions-container">
              <span className={`status-badge ${
                booking.vendorStatus === "accepted"
                  ? "status-confirmed"
                  : booking.vendorStatus === "pending"
                  ? "status-pending"
                  : "status-rejected"
              }`}>
                {booking.vendorStatus || "pending"}
              </span>

              <div className="actions">
                <button className="approve-btn" disabled>
                  <CheckCircle size={18} />
                </button>
                <button className="cancel-btn" disabled>
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VendorBooking;
