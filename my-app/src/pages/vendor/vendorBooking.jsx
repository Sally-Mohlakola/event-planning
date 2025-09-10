import React, { useState, useEffect } from "react";
import {
  Calendar,
  User,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { auth } from "../../firebase";
import "./vendorBooking.css";

const VendorBooking = ({ setActivePage }) => {
  const [filter, setFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(null);

  const vendorId = auth.currentUser?.uid; // logged-in vendor

  useEffect(() => {
    const fetchBookings = async () => {
      if (!auth.currentUser) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(
          "https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/bookings",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          const errorText = contentType?.includes("application/json")
            ? (await res.json()).message
            : await res.text();
          throw new Error(`Failed to fetch bookings: ${errorText}`);
        }

        const data = await res.json();
        const formattedBookings = (data.bookings || []).map((booking) => ({
          ...booking,
          status: booking.status || "pending", // default pending if missing
        }));
        console.log("Fetched bookings:", formattedBookings);
        setBookings(formattedBookings);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const updateVendorStatus = async (eventId, vendorId, newStatus) => {
    if (!auth.currentUser) {
      alert("User not authenticated");
      return;
    }
    if (isUpdating) {
      alert("Another update is in progress");
      return;
    }
    if (!eventId || !vendorId) {
      alert("Invalid event or vendor ID");
      return;
    }

    setIsUpdating(eventId);
    try {
      const token = await auth.currentUser.getIdToken();
      const url = `https://us-central1-planit-sdp.cloudfunctions.net/api/event/${eventId}/vendor/${vendorId}/status`;
      console.log("Updating status:", { eventId, vendorId, newStatus, url });

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.message || `Failed to update status (HTTP ${res.status})`
        );

      // Update local state dynamically
      setBookings((prev) =>
        prev.map((b) =>
          b.eventId === eventId
            ? { ...b, status: newStatus }
            : b
        )
      );
    } catch (err) {
      console.error("Error updating status:", err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredBookings =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );

  if (error) return <p className="error">{error}</p>;
  if (!bookings.length) return <p className="no-bookings">No bookings found.</p>;

  return (
    <section className="booking-page">
      <header>
        <h1>Booking Management</h1>
        <p>View, manage, and update your event bookings in one place.</p>
      </header>

      <div className="filters">
        <Filter />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="booking-list">
        {filteredBookings.map((booking) => (
          <div
            key={`${booking.eventId}`}
            className="booking-card"
          >
            <h2>{booking.eventName || "Unnamed Event"}</h2>
            <div className="details">
              <p>
                <User size={16} /> {booking.client || "Unknown Client"}
              </p>
              <p>
                <Calendar size={16} />{" "}
                {new Date(booking.date).toLocaleDateString()}
              </p>
              <p>
                <Clock size={16} />{" "}
                {new Date(booking.date).toLocaleTimeString()}
              </p>
              <p>
                <MapPin size={16} /> {booking.location || "TBD"}
              </p>
            </div>

            <div className="actions-container">
              {/* Status Badge */}
              <span
                className={`status-badge ${
                  booking.status === "accepted"
                    ? "status-confirmed"
                    : "status-rejected"
                }`}
                aria-label={`Booking status: ${booking.status}`}
              >
                {booking.status === "accepted" ? "Accepted" : "Rejected"}
              </span>

              {/* Action Buttons */}
              <div className="actions">
                <button
                  className="approve-btn"
                  onClick={() =>
                    updateVendorStatus(booking.eventId, vendorId, "accepted")
                  }
                  disabled={booking.status === "accepted" || isUpdating === booking.eventId}
                  title="Accept booking"
                >
                  {isUpdating === booking.eventId ? "Updating..." : <CheckCircle size={18} />}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() =>
                    updateVendorStatus(booking.eventId, vendorId, "rejected")
                  }
                  disabled={booking.status === "rejected" || isUpdating === booking.eventId}
                  title="Reject booking"
                >
                  {isUpdating === booking.eventId ? "Updating..." : <XCircle size={18} />}
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
