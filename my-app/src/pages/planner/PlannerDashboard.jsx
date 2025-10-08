import React, { useState, useEffect } from "react";
import { isAfter, isBefore } from "date-fns";
import { Calendar, Users, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import "./PlannerDashboard.css";

function VendorCard({ vendor }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "rejected":
        return "#fd4c55ff";
      default:
        return "#6366f1";
    }
  };

  return (
    <section className="vendor-card">
      <section className="vendor-header">
        <h3>{vendor.businessName}</h3>
      </section>
      <section
        className="vendor-status"
        style={{ backgroundColor: getStatusColor(vendor.status) }}
      >
        {vendor.status}
      </section>
      <section className="vendor-details">
        <p className="vendor-service">{vendor.email}</p>
        <p className="vendor-contact">{vendor.services}</p>
      </section>
    </section>
  );
}

function EventCard({ event, onSelectEvent }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "upcoming":
        return "#10b981";
      case "in-progress":
        return "#f59e0b";
      case "completed":
        return "#6b7280";
      default:
        return "#6366f1";
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    if (typeof date === "object" && typeof date._seconds === "number") {
      const jsDate = new Date(date._seconds * 1000 + date._nanoseconds / 1e6);
      return jsDate.toLocaleString();
    }
    return new Date(date).toLocaleString();
  };

  return (
    <section className="event-card">
      <section className="event-header">
        <h3>{event.name}</h3>
        <section
          className="event-status"
          style={{ backgroundColor: getStatusColor(event.status) }}
        >
          {event.status}
        </section>
      </section>
      <section className="event-details">
        <p className="event-date">{formatDate(event.date)}</p>
        <p className="event-location">{event.location}</p>
        <p className="event-attendees">
          {(event.guestList?.length ?? 0)} guests
        </p>
        <p className="event-budget">R{(event.budget ?? 0).toLocaleString()}</p>
      </section>
      <section className="event-description">
        <p>{event.description}</p>
      </section>
      <section className="event-buttons">
        <button className="select-btn" onClick={() => onSelectEvent(event)}>
          Select Event
        </button>
      </section>
    </section>
  );
}

export default function PlannerDashboard({ onSelectEvent }) {
  const navigate = useNavigate();
  const auth = getAuth();

  const [authUser, setAuthUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState({});
  const [vendorsByEvent, setVendorsByEvent] = useState({});
  const [vendorStats, setVendorStats] = useState({ approved: 0, pending: 0, rejected: 0 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date();
  future.setDate(today.getDate() + 30);
  future.setHours(23, 59, 59, 999);

  function toJSDate(date) {
    if (!date) return null;
    if (typeof date === "object" && typeof date._seconds === "number") {
      return new Date(date._seconds * 1000 + date._nanoseconds / 1e6);
    }
    if (date instanceof Date) return date;
    if (typeof date === "string" || typeof date === "number")
      return new Date(date);
    return null;
  }

  const fetchPlannerEvents = async () => {
    let user = auth.currentUser;
    let retries = 0;
    while (!user && retries < 100) {
      await new Promise((res) => setTimeout(res, 50));
      user = auth.currentUser;
      retries++;
    }
    if (!user) return [];
    const token = await user.getIdToken(true);
    const res = await fetch(
      "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  };

  const fetchGuests = async (eventId) => {
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/guests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.guests || [];
    } catch {
      return [];
    }
  };

  const fetchVendors = async (eventId) => {
    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/vendors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.vendors || [];
    } catch {
      return [];
    }
  };

  const calculateVendorStatusCounts = (vendorsMap, upcomingEventIds) => {
    let approved = 0, pending = 0, rejected = 0;
    upcomingEventIds.forEach((id) => {
      const vendors = vendorsMap[id] || [];
      vendors.forEach((vendor) => {
        if (vendor.status === "approved") approved++;
        else if (vendor.status === "pending") pending++;
        else if (vendor.status === "rejected") rejected++;
      });
    });
    return { approved, pending, rejected };
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setAuthUser(user);
      if (user) {
        const fetched = await fetchPlannerEvents();
        setEvents(fetched);
      } else {
        setEvents([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadGuestsAndVendors = async () => {
      if (!events.length) return;

      const guestsByEvent = {};
      const vendorsMap = {};

      await Promise.all(
        events.map(async (event) => {
          guestsByEvent[event.id] = await fetchGuests(event.id);
          vendorsMap[event.id] = await fetchVendors(event.id);
        })
      );

      setGuests(guestsByEvent);
      setVendorsByEvent(vendorsMap);

      setEvents((prev) =>
        prev.map((e) => ({
          ...e,
          guestList: guestsByEvent[e.id] || [],
        }))
      );
    };
    loadGuestsAndVendors();
  }, [events]);

  const upcomingEvents = events.filter((e) => {
    const eventDate = toJSDate(e.date);
    return eventDate && isAfter(eventDate, today) && isBefore(eventDate, future);
  });

  useEffect(() => {
    if (!Object.keys(vendorsByEvent).length || !upcomingEvents.length) return;
    const eventIds = upcomingEvents.map((e) => e.id);
    setVendorStats(calculateVendorStatusCounts(vendorsByEvent, eventIds));
  }, [vendorsByEvent, upcomingEvents]);

  const futureEvents = events.filter((e) => {
    const eventDate = toJSDate(e.date);
    return eventDate && isAfter(eventDate, today);
  });

  const aveGuestCount =
    upcomingEvents.length === 0
      ? 0
      : Math.round(
          upcomingEvents.reduce((sum, e) => sum + (e.guestList?.length || 0), 0) /
            upcomingEvents.length
        );

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  const prevEvents = events.filter((e) => {
    const eventDate = toJSDate(e.date);
    return (
      eventDate &&
      isAfter(eventDate, prevMonth) &&
      isBefore(eventDate, today)
    );
  });

  const prevAveGuestCount =
    prevEvents.length === 0
      ? 0
      : Math.round(
          prevEvents.reduce((sum, e) => sum + (e.guestList?.length || 0), 0) /
            prevEvents.length
        );

  const percentageChange =
    prevAveGuestCount === 0
      ? aveGuestCount === 0
        ? 0
        : 100
      : Math.round(((aveGuestCount - prevAveGuestCount) / prevAveGuestCount) * 100);

  if (!authUser) {
    return (
      <section className="dashboard-login-prompt">
        <p>Please log in to view your events.</p>
        <button onClick={() => navigate("/login")}>Go to Login</button>
      </section>
    );
  }

  if (!events.length) return <p>Loading events...</p>;

  return (
    <section className="page-container">
      {/* Summary Cards */}
      <section className="summary-cards-section">
        <section className="summary-card blue">
          <section className="summary-card-header">
            <Calendar size={40} />
          </section>
          <section className="summary-card-body">
            <h3 className="summary-label">Upcoming Events</h3>
            <p className="summary-value">{upcomingEvents.length}</p>
            <p className="summary-subtext">Next 30 days</p>
          </section>
        </section>

        <section className="summary-card green">
          <section className="summary-card-header">
            <Users size={40} />
          </section>
          <section className="summary-card-body">
            <h3 className="summary-label">Avg Attendance</h3>
            <p className="summary-value">{aveGuestCount}</p>
            <p className="summary-subtext">Per Event</p>
          </section>
        </section>

        <section className="summary-card purple">
          <section className="summary-card-header">
            <Briefcase size={40} />
          </section>
          <section className="summary-card-body">
            <h3 className="summary-label">Vendor Status</h3>
            <p className="summary-subtext">Upcoming Events:</p>
            <p>Approved: {vendorStats.approved}</p>
            <p>Pending: {vendorStats.pending}</p>
            <p>Rejected: {vendorStats.rejected}</p>
          </section>
        </section>
      </section>

      {/* Upcoming Events */}
      <section className="dashboard-card">
        <section className="card-header">
          <h3>Upcoming Events</h3>
        </section>
        <section className="events-grid">
          {upcomingEvents.length ? (
            upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelectEvent={onSelectEvent}
              />
            ))
          ) : (
            <p>You have no upcoming events</p>
          )}
        </section>
      </section>

      {/* Vendors by Event */}
      <section className="dashboard-card">
        <section className="card-header">
          <h3>Vendors by Event</h3>
        </section>
        {upcomingEvents.map((event) => {
          const vendors = vendorsByEvent[event.id] || [];
          if (!vendors.length) return null;
          return (
            <section key={event.id} className="event-vendors-section">
              <h4 className="event-vendor-title">{event.name}</h4>
              <section className="vendors-grid">
                {vendors.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} />
                ))}
              </section>
            </section>
          );
        })}
      </section>
    </section>
  );
}
