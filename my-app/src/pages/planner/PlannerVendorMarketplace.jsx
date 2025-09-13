import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import './PlannerVendorMarketplace.css';

function VendorCard({ vendor, event, onViewMore, onAddVendor }) {
    return (
        <article className="vendor-card">
            <img src={vendor.profilePic} alt={vendor.businessName} className="vendor-image" />
            <section className="vendor-content">
                <h3 className="vendor-name">{vendor.businessName || vendor.name}</h3>
                <section className="vendor-details">
                    <span className="vendor-category">{vendor.category}</span>
                    <section className="vendor-meta">
                        <span className="vendor-rating">{vendor.rating}</span>
                        <span className="vendor-location">{vendor.location}</span>
                    </section>
                </section>
                <section className="vendor-actions">
                    <button className="btn btn-primary" onClick={() => onAddVendor(vendor)}>Add Vendor</button>
                    <button className="btn btn-secondary" onClick={() => onViewMore(vendor)}>
                        View Details
                    </button>
                </section>
            </section>
        </article>
    );
}

function EventSelectionModal({ isOpen, events, onSelect, onClose}) {
    if (!isOpen) return null;

    return (
        <section className="modal-overlay" onClick={onClose}>
            <section className="modal-content" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Select Event</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </header>
               <main className="modal-body">
                {events.length === 0 ? (
                    <p>Loading events...</p>
                ) : (
                    <ul className="event-list">
                    {events.map(event => (
                        <li key={event.id} className="event-item">
                        <button 
                            className="event-button"
                            onClick={() => {
                            onSelect(event);
                            onClose();
                            }}
                        >
                            <strong>{event.name}</strong>
                            <span className="event-date">
                            {new Date(event.date).toLocaleDateString()}
                            </span>
                        </button>
                        </li>
                    ))}
                    </ul>
                )}
                </main>
            </section>
        </section>
    );
}

function VendorDetailsModal({ isOpen, vendor, onClose }) {
    if (!isOpen || !vendor) return null;

    return (
        <section className="modal-overlay" onClick={onClose}>
            <section className="modal-content vendor-details-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>Vendor Details</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </header>
                <main className="modal-body">
                    <section className="vendor-detail-content">
                        <img src={vendor.profilePic} alt={vendor.businessName} className="vendor-detail-image" />
                        <section className="vendor-info-section">
                            <h3>{vendor.businessName || vendor.name}</h3>
                            <p className="vendor-category-detail">{vendor.category}</p>
                            <section className="vendor-ratings-location">
                                <p><strong>Rating:</strong> {vendor.rating}</p>
                                <p><strong>Location:</strong> {vendor.location}</p>
                            </section>
                            {vendor.description && (
                                <section className="vendor-description">
                                    <h4>Description</h4>
                                    <p>{vendor.description}</p>
                                </section>
                            )}
                            {vendor.services && (
                                <section className="vendor-services">
                                    <h4>Services</h4>
                                    <ul>
                                        {vendor.services.map((service, index) => (
                                            <li key={index}>{service}</li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                            {vendor.contact && (
                                <section className="vendor-contact">
                                    <h4>Contact Information</h4>
                                    <p><strong>Email:</strong> {vendor.contact.email}</p>
                                    <p><strong>Phone:</strong> {vendor.contact.phone}</p>
                                </section>
                            )}
                        </section>
                    </section>
                </main>
                <footer className="modal-footer">
                    <button className="btn btn-primary">Add to Event</button>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </footer>
            </section>
        </section>
    );
}

export default function PlannerVendorMarketplace({ event = null, plannerId, setActivePage }) {
    console.log("PlannerVendorMarketplace loaded with event:");
    console.log(event);
    const [activeTab, setActiveTab] = useState(event ? 'event-specific' : 'all-events');
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [vendors, setVendors] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(event);
    const [loading, setLoading] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [modalPurpose, setModalPurpose] = useState(activeTab === 'event-specific' ? "recommend" : "addVendor"); 
    const [pendingVendorId, setPendingVendorId] = useState(null);

    useEffect(() => {
        if(event){
            setSelectedEvent(event);
        }
    }, [event]);

    const fetchAllEventsVendors = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${plannerId}/bestvendors`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.vendors || [];
    }

    const fetchEventSpecificVendors = async (eventId) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/events/${eventId}/bestvendors`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.vendors || [];
    }

    const fetchEvents = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.events || [];
    }

    const addVendorToEvent = async (vendorId, eventId) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        try{
            const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/vendors/${vendorId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
            }
            });
            return res;

        }
        catch(err) {
            console.error("Error adding vendor to event:", err);
        }

    }

    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);
            
            if (activeTab === 'all-events') {
                const allVendors = await fetchAllEventsVendors();
                setVendors(allVendors);
            } else if (activeTab === 'event-specific') {
                const eventsData = await fetchEvents();
                setEvents(eventsData);
                
                if (selectedEvent?.id) {
                    const eventVendors = await fetchEventSpecificVendors(selectedEvent.id);
                    setVendors(eventVendors);
                }
            }
            
            setLoading(false);
        }

        loadInitialData();
    }, [activeTab, selectedEvent]);

    useEffect(() => {
        setModalPurpose(activeTab === 'event-specific' ? "recommend" : "addVendor");
    }, [activeTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setVendors([]);
        if (tab === 'event-specific' && !selectedEvent) {
            setShowEventModal(true);
        }
    };

    const handleEventSelect = async (selectedEventData) => {
        setSelectedEvent(selectedEventData);
        setLoading(true);
        const eventVendors = await fetchEventSpecificVendors(selectedEventData.id);
        setVendors(eventVendors);
        setLoading(false);
    };

    const handleViewVendor = (vendor) => {
        setSelectedVendor(vendor);
        setShowVendorModal(true);
    };

    const handleAddVendor = async (event, vendor) => {
        // otherwise add directly
        const res = await addVendorToEvent(vendor.id, event.id);
        if (!res.ok) {
            alert("Failed to add vendor to event.");
        } else {
            alert("Vendor added to event successfully!");
        }
    };

    const handleEventPicked = async (vendor) => {
        if (activeTab === "event-specific") {
            if (selectedEvent) {
                await handleAddVendor(selectedEvent, vendor);
            } else {
                alert("Please select an event first.");
            }
        } else {
            setPendingVendorId(vendor.id);
            const eventsList = await fetchEvents();
            setEvents(eventsList);
            setShowEventModal(true);
        }
    };

    const filteredVendors = vendors.filter(v =>
        ((v.businessName?.toLowerCase().includes(search.toLowerCase()) || 
          v.name?.toLowerCase().includes(search.toLowerCase()) ||
          v.category?.toLowerCase().includes(search.toLowerCase()))) &&
        (categoryFilter === "All" || v.category === categoryFilter)
    );

    const categories = ["All", "Catering", "Entertainment", "Decor", "Photography", "Venue", "Florist", "Music"];

    return (
        <main className="vendor-marketplace">
            <header className="marketplace-header">
                <h1 className="marketplace-title">Vendor Marketplace</h1>
                <p className="marketplace-subtitle">Discover and connect with top-rated event vendors</p>
            </header>

            <nav className="marketplace-tabs">
                <button
                    className={`tab-btn ${activeTab === 'all-events' ? 'active' : ''}`}
                    onClick={() => handleTabChange('all-events')}
                >
                    All Events
                </button>
                <button
                    className={`tab-btn ${activeTab === 'event-specific' ? 'active' : ''}`}
                    onClick={() => handleTabChange('event-specific')}
                >
                    Event Specific
                </button>
            </nav>

            {activeTab === 'event-specific' && (
                <section className="event-selector">
                    <label className="event-selector-label">Selected Event:</label>
                    <button 
                        className="event-select-button"
                        onClick={() => setShowEventModal(true)}
                    >
                        {selectedEvent ? (
                            <>
                                <strong>{selectedEvent.name}</strong>
                                <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                            </>
                        ) : (
                            "Choose an event..."
                        )}
                    </button>
                </section>
            )}

            <section className="marketplace-controls">
                <section className="search-container">
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </section>
                <section className="filter-container">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="category-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category === 'All' ? 'All Categories' : category}
                            </option>
                        ))}
                    </select>
                </section>
            </section>

            {loading ? (
                <section className="loading-state">
                    <article className="loading-spinner"></article>
                    <p>Loading vendors...</p>
                </section>
            ) : (
                <section className="vendors-grid">
                    {filteredVendors.length > 0 ? (
                        filteredVendors.map((vendor) => (
                            <VendorCard 
                            key={vendor.id} 
                            vendor={vendor} 
                            event={selectedEvent}
                            onViewMore={handleViewVendor}
                            onAddVendor={(vendor) => handleEventPicked(vendor)}
                            />
                        ))
                    ) : (
                        <section className="empty-state">
                            <p>No vendors found matching your criteria.</p>
                            {activeTab === 'event-specific' && !selectedEvent && (
                                <p>Please select an event to view vendors.</p>
                            )}
                        </section>
                    )}
                </section>
            )}

            <EventSelectionModal
                isOpen={showEventModal}
                events={events}
                onSelect={async (event) => {
                    if (pendingVendorId) {
                        await handleAddVendor(event, { id: pendingVendorId });
                        setPendingVendorId(null);
                    } else {
                        handleEventSelect(event);
                    }
                    setShowEventModal(false);
                }}
                onClose={() => setShowEventModal(false)}
            />

            <VendorDetailsModal
                isOpen={showVendorModal}
                vendor={selectedVendor}
                onClose={() => {
                    setShowVendorModal(false);
                    setSelectedVendor(null);
                }}
            />
        </main>
    );
}