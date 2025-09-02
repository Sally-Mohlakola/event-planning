import { useEffect, useState } from 'react';
import "./PlannerViewEvent.css";
import { getAuth } from 'firebase/auth';

function AddGuestPopup({ isOpen, onClose, onSave }) {

    const guestTags = [
        "VIP",
        "Family",
        "Friend",
        "Colleague",
        "Plus One",
        "Speaker",
        "Sponsor",
        "Media",
        "Performer",
        "Staff"
    ];

    const dietaryOptions = [
        "None",
        "Vegetarian",
        "Vegan",
        "Gluten-Free",
        "Nut-Free",
        "Dairy-Free",
        "Halal",
        "Kosher"
    ];

    const [selectedTags, setSelectedTags] = useState([]);
    const [dietary, setDietary] = useState("None");

    const [guestForm, setGuestForm] = useState({
        firstname: '',
        lastname: '',
        email: '',
        plusOne: 0
    });

    const handleTagToggle = (tag) => {
        setSelectedTags(prev => {
            const updatedTags = prev.includes(tag) 
                ? prev.filter(t => t !== tag) 
                : [...prev, tag];

            setGuestForm({...guestForm, tags: updatedTags});

            console.log(updatedTags);
            return updatedTags;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (guestForm.firstname.trim() && guestForm.email.trim()) {
            onSave({
                ...guestForm,
                rsvpStatus: 'pending'
            });
            setGuestForm({
                firstname: '',
                lastname: '',
                email: '',
                plusOne: 0
            });
            onClose();
        }
    };

    const handleClose = () => {
        setGuestForm({
            firstname: '',
            lastname: '',
            email: '',
            plusOne: 0
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <section className="popup-overlay" onClick={handleClose}>
            <section className="popup-content" onClick={(e) => e.stopPropagation()}>
                <section className="popup-header">
                    <h3>Add Guest</h3>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </section>
                <form onSubmit={handleSubmit} className="guest-form">
                    <section className="form-row">
                        <label>
                            First Name *
                            <input 
                                type="text"
                                value={guestForm.firstname}
                                onChange={(e) => setGuestForm({...guestForm, firstname: e.target.value})}
                                required
                                autoFocus
                            />
                        </label>
                        <label>
                            Last Name
                            <input 
                                type="text"
                                value={guestForm.lastname}
                                onChange={(e) => setGuestForm({...guestForm, lastname: e.target.value})}
                            />
                        </label>
                    </section>
                    <label>
                        Email Address *
                        <input 
                            type="email"
                            value={guestForm.email}
                            onChange={(e) => setGuestForm({...guestForm, email: e.target.value})}
                            required
                        />
                    </label>
                    <label>
                        Phone
                        <input 
                            type="text"
                            checked={guestForm.plusOne}
                            onChange={(e) => setGuestForm({...guestForm, plusOne: e.target.value})}
                        />
                    </label>

                    <section className="form-group">
                        <label>Dietary Requirement:</label>
                        <select value={dietary} onChange={(e) => setGuestForm({...guestForm, dietary: e.target.value})}>
                        {dietaryOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                        </select>
                    </section>

                    <section className="form-group">
                        <label>Guest Tags:</label>
                        <section className="checkbox-group">
                        {guestTags.map(tag => (
                            <label key={tag} className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={() => handleTagToggle(tag)}
                            />
                            {tag}
                            </label>
                        ))}
                        </section>
                    </section>

                    <label>
                        Notes
                        <input 
                            type="text"
                            checked={guestForm.plusOne}
                            onChange={(e) => setGuestForm({...guestForm, plusOne: e.target.value})}
                        />
                    </label>
                    <label className="plusones-label">
                        Number of Plus Ones
                        <input 
                            type="number"
                            checked={guestForm.plusOne}
                            onChange={(e) => setGuestForm({...guestForm, plusOne: e.target.value})}
                        />
                    </label>
                    <section className="form-actions">
                        <button type="button" className="cancel-form-btn" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="save-form-btn">
                            Add Guest
                        </button>
                    </section>
                </form>
            </section>
        </section>
    );
}

function GuestRSVPSummary({guests}) {
    const totalGuests = guests.length;
    const confirmedGuests = guests.filter(g => g.rsvpStatus === 'attending').length;
    const pendingGuests = guests.filter(g => g.rsvpStatus === 'pending').length;
    const declinedGuests = guests.filter(g => g.rsvpStatus === 'not_attending').length;

    return(
        <section className="rsvp-summary">
            <h4>RSVP Status</h4>
            <section className="rsvp-stats">
                <section className="rsvp-stat confirmed">
                    <span className="rsvp-number">{confirmedGuests}</span>
                    <span className="rsvp-label">Confirmed</span>
                </section>
                <section className="rsvp-stat pending">
                    <span className="rsvp-number">{pendingGuests}</span>
                    <span className="rsvp-label">Pending</span>
                </section>
                <section className="rsvp-stat declined">
                    <span className="rsvp-number">{declinedGuests}</span>
                    <span className="rsvp-label">Declined</span>
                </section>
            </section>
            <section className="rsvp-progress">
                <section 
                    className="rsvp-progress-bar"
                    style={{width: `${totalGuests > 0 ? (confirmedGuests / totalGuests) * 100 : 0}%`}}
                ></section>
            </section>
            <p className="rsvp-percentage">
                {totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0}% confirmed
            </p>
        </section>
    );
}

function VendorItem({vendor}) {
    return(
        <section className="vendor-item">
            <section className="vendor-info">
                <h4>{vendor.name}</h4>
                <p>{vendor.category}</p>
            </section>
            <section className="vendor-cost">
                <h4>Current total cost: </h4>
                <p>{vendor.cost}</p>
            </section>
            <section className="vendor-actions">
                <button className="contact-btn">Contact</button>
                <button className="remove-btn">Remove</button>
            </section>
        </section>
    );
}

function TaskItem({taskName, taskStatus, onToggle}) {
    const isCompleted = taskStatus === true;
    
    return(
        <section className="task-item">
            <section className="task-checkbox">
                <input 
                    type="checkbox" 
                    checked={isCompleted}
                    onChange={() => onToggle(taskName)}
                />
            </section>
            <section className="task-content">
                <h4 className={isCompleted ? "completed" : ""}>{taskName}</h4>
            </section>
        </section>
    );
}


export default function PlannerViewEvent({event, setActivePage}) {

    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [guests, setGuests] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [eventData, setEventData] = useState(event);
    const [showAddGuestPopup, setShowAddGuestPopup] = useState(false);

    const [editForm, setEditForm] = useState({...eventData});

    const eventId = event.id;

    const fetchGuests = async () => {
    
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);
    
        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/guests`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        if (!res.ok) return []; 
    
        const data = await res.json();
        return data.guests || [];
    };

    const fetchVendors = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);
    
        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${eventId}/vendors`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        if (!res.ok) return []; 
    
        const data = await res.json();
        return data.vendors || [];
    };

    const updateEventData = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);
    
        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/${eventId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(eventData)
        });
        if (!res.ok) console.log("Update Failed"); 
        console.log("Updated Event.");
    }    

    useEffect(() => {
        async function loadGuests() {
            const guests = await fetchGuests();
            setGuests(guests);
        }
        loadGuests();
    }, []);

    useEffect(() => {
        async function loadVendors() {
            const vendors = await fetchVendors();
            setVendors(vendors);
        }
        loadVendors();
    }, []);

    useEffect(() => {
        if(showAddGuestPopup === true){
            
        }
    }, showAddGuestPopup);

    const handleSave = () => {
        setEventData({...editForm});
        setIsEditing(false);
    };

    useEffect(() => {
        console.log("eventData updated:", eventData);
        updateEventData();
    }, [eventData]);

    const handleCancel = () => {
        setEditForm({...eventData});
        setIsEditing(false);
    };

    const handleTaskToggle = (taskName) => {
        setEventData((prev) => ({
            ...prev,
            tasks: {
            ...prev.tasks,
            [taskName]: !prev.tasks[taskName],
            },
        }));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const onSave = async (guestInfo) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);
    
        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/${eventId}/guests`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(guestInfo)
        });
        if (!res.ok) return "Guest Creation Failed"; 
        console.log("Guest creation done.");
    }

    return(
        <section className="event-view-edit">
            <section className="event-header">
                
                <section className="header-top">
                    <button 
                        className="back-btn"
                        onClick={() => setActivePage && setActivePage('events')}
                    >
                        ← Back to Events
                    </button>
                    <section className="header-actions">
                        {!isEditing ? (
                            <button 
                                className="edit-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Event
                            </button>
                        ) : (
                            <section className="edit-actions">
                                <button className="save-btn" onClick={handleSave}>Save Changes</button>
                                <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
                            </section>
                        )}
                    </section>
                </section>

                <section className="header-main">
                    {!isEditing ? (
                        <section className="event-title-info">
                            <h1>{eventData.name}</h1>
                        </section>
                    ) : (
                        <section className="edit-title-section">
                            <input 
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="edit-title-input"
                                placeholder="Event name"
                            />
                        </section>
                    )}
                </section>
            </section>

            <section className="tabs-container">
                <section className="tabs">
                    <button 
                        className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "guests" ? "active" : ""}`}
                        onClick={() => setActiveTab("guests")}
                    >
                        Guests & RSVP
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "vendors" ? "active" : ""}`}
                        onClick={() => setActiveTab("vendors")}
                    >
                        Vendors
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
                        onClick={() => setActiveTab("tasks")}
                    >
                        Tasks
                    </button>
                </section>

                <section className="tab-content">
                    {activeTab === "overview" && (
                        <section className="overview-content">
                            <section className="overview-grid">
                                <section className="detail-card">
                                    <h3>Event Details</h3>
                                    {!isEditing ? (
                                        <section className="detail-info">
                                            <p><strong>Location:</strong> {eventData.location}</p>
                                            <p><strong>Date:</strong> {formatDate(eventData.date)}</p>
                                            <p><strong>Duration: </strong> {eventData.duration} hrs </p>
                                            <p><strong>Expected Attendees:</strong> {eventData.expectedGuestCount}</p>
                                            <p><strong>Category:</strong> {eventData.eventCategory}</p>
                                            <p><strong>Style:</strong>  
                                            <section style={{display: "flex", flexDirection: "column", justifyContent:"flex-start"}}> {eventData.style.map(style =>
                                                <p>{style}</p>)}</section></p>
                                        </section>
                                    ) : (
                                        <section className="edit-form">
                                            <label>
                                                Location:
                                                <input 
                                                    type="text"
                                                    value={editForm.location}
                                                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Date:
                                                <input 
                                                    type="datetime-local"
                                                    value={editForm.date}
                                                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Duration:
                                                <input 
                                                    type="number"
                                                    value={editForm.duration}
                                                    onChange={(e) => setEditForm({...editForm, duration: e.target.value})}
                                                />
                                            </label>
                                            <label>
                                                Expected Attendees:
                                                <input 
                                                    type="number"
                                                    value={editForm.expectedGuestCount}
                                                    onChange={(e) => setEditForm({...editForm, expectedGuestCount: parseInt(e.target.value)})}
                                                />
                                            </label>
                                            <label>
                                                Category:
                                                <input 
                                                    type="text"
                                                    value={editForm.eventCategory}
                                                    onChange={(e) => setEditForm({...editForm, eventCategory: e.target.value})}
                                                />
                                            </label>
                                        </section>
                                    )}
                                </section>
                            </section>
                        </section>
                    )}

                    {activeTab === "guests" && (

                        <section className="guests-content">

                            <GuestRSVPSummary guests={guests} />
                            
                            <section className="guests-section">
                                <section className="guests-header">
                                    <h3>Guest List</h3>
                                    <button className="add-guest-btn" onClick={() => setShowAddGuestPopup(true)}>+ Add Guest</button>
                                </section>

                                 {
                                    showAddGuestPopup === true && (
                                        <section>
                                            <AddGuestPopup isOpen={true} onClose={() => setShowAddGuestPopup(false)} onSave={onSave}/>
                                        </section>
                                    )
                                }
                                
                               
                                <section className="guests-list">
                                    {guests.length > 0 ? guests.map((guest) => (
                                        <section key={guest.id} className="guest-item">
                                            <section className="guest-info">
                                                <h4>{guest.firstname} {guest.lastname}</h4>
                                                <p>{guest.email}</p>
                                                <p>Plus Ones: {guest.plusOne}</p>
                                            </section>
                                            <section className="guest-rsvp">
                                                <span className={`rsvp-badge ${guest.rsvpStatus}`}>
                                                    {guest.rsvpStatus === 'attending' ? 'Confirmed' : 
                                                     guest.rsvpStatus === 'not_attending' ? 'Declined' : 
                                                     'Pending'}
                                                </span>
                                            </section>
                                            <section className="guest-actions">
                                                <button className="send-reminder-btn">Send Reminder</button>
                                                <button className="edit-guest-btn">Edit</button>
                                            </section>
                                        </section>
                                    )) : (
                                        <section className="empty-state">
                                            <p>No guests added yet. Click "Add Guest" to invite people to your event.</p>
                                        </section>
                                    )}
                                </section>
                            </section>
                        </section>
                    )}

                    {activeTab === "vendors" && (
                        <section className="vendors-content">
                            <section className="vendors-header">
                                <h3>Event Vendors</h3>
                                <button className="add-vendor-btn" onClick={() => setActivePage("vendor")}>+ Add Vendor</button>
                            </section>
                            <section className="vendors-list">
                                {vendors && vendors.length > 0 ? vendors.map((vendor) => (
                                    <VendorItem key={vendor.id} vendor={vendor} />
                                )) : (
                                    <section className="empty-state">
                                        <p>No vendors added yet. Click "Add Vendor" to start building your vendor list.</p>
                                    </section>
                                )}
                            </section>
                        </section>
                    )}

                     {activeTab === "tasks" && (
                        <section className="tasks-content">
                            <section className="tasks-header">
                                <h3>Event Tasks</h3>
                                <button className="add-task-btn">+ Add Task</button>
                            </section>
                                <section className="tasks-list">
                                    {eventData.tasks && Object.keys(eventData.tasks).length > 0 ? (
                                       Object.entries(eventData.tasks).map(([taskName, completed], i) => (
                                            <TaskItem
                                            key={`${taskName}-${i}`}
                                            taskName={taskName}
                                            taskStatus={completed}
                                            onToggle={handleTaskToggle}
                                            />
                                        ))
                                    ) : (
                                        <section className="empty-state">
                                        <p>No tasks added yet. Click "Add Task" to start organizing your event planning.</p>
                                        </section>
                                    )}
                                </section>
                        </section>
                    )}

                </section>
            </section>
        </section>
    );
}