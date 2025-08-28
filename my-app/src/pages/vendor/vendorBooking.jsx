// src/vendor/VendorBooking.jsx
import React, { useState } from "react";
import { Calendar, User, MapPin, Clock, CheckCircle, XCircle, Filter } from "lucide-react";
import './vendorBooking.css';

const VendorBooking = ({ setActivePage }) => {
  const [filter, setFilter] = useState("all");

  // Example mock data
  const bookings = [
    {
      id: 1,
      event: "Wedding Reception",
      client: "Sarah M.",
      date: "2025-09-12",
      time: "18:00",
      location: "Rosewood Hall",
      status: "confirmed",
    },
    {
      id: 2,
      event: "Corporate Dinner",
      client: "Mark T.",
      date: "2025-09-20",
      time: "19:30",
      location: "Skyline Venue",
      status: "pending",
    },
    {
      id: 3,
      event: "Birthday Party",
      client: "Nandi K.",
      date: "2025-10-01",
      time: "14:00",
      location: "Private Residence",
      status: "cancelled",
    },
  ];

  const filteredBookings =
    filter === "all"
      ?bookings: bookings.filter((b) => b.status === filter);

  return (
    <section className="booking-page">
      <header>
        <h1>Booking Management</h1>
        <p>View, manage, and update your event bookings in one place.</p>
      </header>

      {/* Filters */}
      <div className="filters">
        <Filter />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>


      <div className="booking-list">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="booking-card">
            <h2>{booking.event}</h2>
            <div className="details">
              <p><User size={16} /> {booking.client}</p>
              <p><Calendar size={16} /> {booking.date}</p>
              <p><Clock size={16} /> {booking.time}</p>
              <p><MapPin size={16} /> {booking.location}</p>
            </div>

            {/* Status & Actions */}
            <div className="actions-container">
              <span className={`status-badge ${
                booking.status === "confirmed"
                  ? "status-confirmed"
                  : booking.status === "pending"
                  ? "status-pending"
                  : "status-cancelled"
              }`}>{booking.status}</span>

              <div className="actions">
                <button className="approve-btn">
                  <CheckCircle size={18} />
                </button>
                <button className="cancel-btn">
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default VendorBooking;
