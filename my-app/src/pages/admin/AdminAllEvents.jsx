import { useState, useEffect } from "react";
import "../planner/PlannerAllEvents.css";
import { getAuth } from "firebase/auth";

function EventCard({ event, onSelectEvent, onDeleteEvent }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
        <p className="event-attendees">{event.expectedGuestCount} attendees</p>
        <p className="event-budget">R{event.budget.toLocaleString()}</p>
      </section>
      <section className="event-description">
        <p>{event.description}</p>
      </section>
      <section className="event-buttons">
        
        <button className="quick-view-btn">Quick View</button>
        <button
          className="delete-btn"
          onClick={() => onDeleteEvent(event.id)}
        >
          Delete
        </button>
      </section>
    </section>
  );
}

export default function AdminAllEvents({ setActivePage, onSelectEvent }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [events, setEvents] = useState([]);

  const fetchAdminEvents = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken(true);

    const res = await fetch(
      `https://us-central1-planit-sdp.cloudfunctions.net/api/admin/events`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) return [];
    
    const data = await res.json();
    console.log("API response:", data);
    return data.events || [];
  };

  const deleteEvent = async (eventId) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken(true);

    const res = await fetch(
      `https://us-central1-planit-sdp.cloudfunctions.net/api/admin/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } else {
      console.error("Failed to delete event");
    }
  };

  useEffect(() => {
    async function loadEvents() {
      const events = await fetchAdminEvents();
      setEvents(events);
    }
    loadEvents();
  }, []);

  const filteredEvents = events
    .filter(
      (event) =>
        (event.name.toLowerCase().includes(search.toLowerCase()) ||
          event.location.toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter === "All" || event.status === statusFilter)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.date) - new Date(b.date);
        case "name":
          return a.name.localeCompare(b.name);
        case "budget":
          return b.budget - a.budget;
        case "attendees":
          return b.expectedGuestCount - a.expectedGuestCount;
        default:
          return 0;
      }
    });

  return (
    <section className="events-list">
      <section className="events-header">
        <h2>Events </h2>
        <p className="events-subtitle">Manage, track, and delete events</p>
      </section>

      <section className="events-controls">
        <section className="search-sort">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="budget">Sort by Budget</option>
            <option value="attendees">Sort by Attendees</option>
          </select>
        </section>

        <section className="status-filters">
          <button
            className={`status-filter-btn ${
              statusFilter === "All" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("All")}
          >
            All Events
          </button>
          <button
            className={`status-filter-btn ${
              statusFilter === "upcoming" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("planning")}
          >
            Upcoming
          </button>
          <button
            className={`status-filter-btn ${
              statusFilter === "in-progress" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("in-progress")}
          >
            In Progress
          </button>
          <button
            className={`status-filter-btn ${
              statusFilter === "completed" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed
          </button>
        </section>
      </section>

      <section className="events-grid">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelectEvent={onSelectEvent}
              onDeleteEvent={deleteEvent}
            />
          ))
        ) : (
          <section className="no-events">
            <p>No events found matching your criteria</p>
          </section>
        )}
      </section>
    </section>
  );
}
