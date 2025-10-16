import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import "./PlannerViewEvent.css";

import AddGuestPopup from "./components/AddGuestPopup.jsx";
import GuestRSVPSummary from "./components/GuestRSVPSummary.jsx";
import ServiceItem from "./components/ServiceItem.jsx";
import PromptCard from "./components/PromptCard.jsx";
import GuestImportWithValidation from "./components/GuestImportWithValidation.jsx";
import BronzeFury from "./BronzeFury.jsx";
import PlannerVendorMarketplace from "./PlannerVendorMarketplace.jsx";
import PlannerTasks from "./PlannerTasks.jsx";
import PlannerSchedules from "./PlannerSchedules.jsx";
import ChatComponent from "./ChatComponent.jsx";
import Popup from "../general/popup/Popup.jsx"; // ✅ ensure Popup is imported
import BASE_URL from "../../apiConfig";

export default function PlannerViewEvent({ eventId }) {
  const [guests, setGuests] = useState([]);
  const [services, setServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showGuestImport, setShowGuestImport] = useState(false);
  const [showVendorPopup, setShowVendorPopup] = useState(false);
  const [showBronzeFury, setShowBronzeFury] = useState(false);
  const [activeChat, setActiveChat] = useState(null);

  const auth = getAuth();

  // Fetch initial event data (guests, services, tasks)
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      const token = await auth.currentUser?.getIdToken();
      try {
        const [guestRes, serviceRes, taskRes] = await Promise.all([
          fetch(`${BASE_URL}/planner/events/${eventId}/guests`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/planner/events/${eventId}/services`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/planner/events/${eventId}/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setGuests(await guestRes.json());
        setServices(await serviceRes.json());
        setTasks(await taskRes.json());
      } catch (err) {
        console.error("Error loading event data:", err);
      }
    };
    fetchData();
  }, [eventId]);

  return (
    <section className="planner-event-page">
      <header className="planner-event-header">
        <h2>Event Overview</h2>
        <div className="header-actions">
          <button onClick={() => setShowAddGuest(true)}>+ Add Guest</button>
          <button onClick={() => setShowGuestImport(true)}>Import Guests</button>
          <button onClick={() => setShowVendorPopup(true)}>Add Vendor</button>
          <button onClick={() => setShowBronzeFury(true)}>Import from BronzeFury</button>
        </div>
      </header>

      {/* Guest Summary Section */}
      <section className="guest-section">
        <h3>Guest List</h3>
        {guests.length === 0 ? (
          <PromptCard
            title="No Guests Yet"
            message="Add your first guest or import from CSV."
            buttonText="Add Guest"
            onClick={() => setShowAddGuest(true)}
          />
        ) : (
          <>
            <GuestRSVPSummary guests={guests} />
            <ul className="guest-list">
              {guests.map((g, i) => (
                <li key={i}>{g.firstname} {g.lastname} – {g.email}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Vendors Section */}
      <section className="vendor-section">
        <h3>Vendors</h3>
        {services.length === 0 ? (
          <PromptCard
            title="No Vendors Yet"
            message="Browse the marketplace to find vendors."
            buttonText="Open Marketplace"
            onClick={() => setShowVendorPopup(true)}
          />
        ) : (
          <div className="vendor-list">
            {services.map((s, i) => (
              <ServiceItem key={i} service={s} showChat={setActiveChat} />
            ))}
          </div>
        )}
      </section>

      {/* Tasks and Schedule */}
      <section className="planner-schedule-tasks">
        <PlannerTasks tasks={tasks} eventId={eventId} />
        <PlannerSchedules eventId={eventId} />
      </section>

      {/* Chat (if a vendor is selected) */}
      {activeChat && <ChatComponent service={activeChat} onClose={() => setActiveChat(null)} />}

      {/* Popups */}
      {showAddGuest && (
		<AddGuestPopup
			isOpen={showAddGuest}
			onClose={() => setShowAddGuest(false)}
			eventId={eventId}
			setGuests={setGuests}
			guests={guests}
		/>
		)}


      {showGuestImport && (
        <GuestImportWithValidation
          eventId={eventId}
          onImportComplete={() => setShowGuestImport(false)}
          onClose={() => setShowGuestImport(false)}
        />
      )}

      {/* ✅ Inline Vendor Marketplace Modal (replaces VendorPopup) */}
      {showVendorPopup && (
        <Popup isOpen={showVendorPopup} onClose={() => setShowVendorPopup(false)}>
          <PlannerVendorMarketplace onClose={() => setShowVendorPopup(false)} />
        </Popup>
      )}

      {showBronzeFury && <BronzeFury onClose={() => setShowBronzeFury(false)} />}
    </section>
  );
}
