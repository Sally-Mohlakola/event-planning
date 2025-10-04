import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import "./PlannerViewEvent.css";

export default function DeleteEvent({ eventId, onClose, eventData }) {
  const navigate = useNavigate();
  const [eventToDelete] = useState(eventData?.name || "");

  const onDelete = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken(true);
      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/planner/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      // Let parent handle navigation if needed
      onClose?.();
      navigate(-1);

    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  return (
    <section className="popup-overlay" onClick={onClose}>
      <section className="popup-content" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Event?</h3>
        <p>
          Are you sure you want to delete the event "{eventToDelete}"? This action cannot be undone.
        </p>
        <button className="cancel-form-btn" onClick={onClose}>Cancel</button>
        <button className="delete-form-btn" onClick={onDelete}>Delete</button>
      </section>
    </section>
  );
}
