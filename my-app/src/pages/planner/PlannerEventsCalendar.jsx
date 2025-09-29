import React, { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { getAuth } from "firebase/auth";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./PlannerEventsCalendar.css";
import NewEvent from "./NewEvent"; // Re-using NewEvent as a modal component
import {
	X,
	Calendar as CalendarIcon,
	Clock,
	MapPin,
	Users,
	Plus,
	Edit2,
	Trash2,
} from "lucide-react";

const locales = {
	"en-US": enUS,
};

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek,
	getDay,
	locales,
});

function EventDetailsModal({ event, onClose, onEdit, onDelete }) {
	const dialogRef = useRef(null);

	useEffect(() => {
		if (event && dialogRef.current) {
			dialogRef.current.showModal();
		}
	}, [event]);

	if (!event) return null;

	const [schedules, setSchedules] = useState([]);
	const [loadingSchedules, setLoadingSchedules] = useState(false);

	useEffect(() => {
		const fetchSchedules = async () => {
			if (!event.id) return;
			setLoadingSchedules(true);
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) {
				setLoadingSchedules(false);
				return;
			}
			const token = await user.getIdToken(true);
			try {
				const res = await fetch(
					`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/${event.id}/schedules`,
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				);
				if (res.ok) {
					const data = await res.json();
					setSchedules(data.schedules || []);
				}
			} catch (error) {
				console.error("Failed to fetch schedules:", error);
			} finally {
				setLoadingSchedules(false);
			}
		};
		fetchSchedules();
	}, [event.id]);

	const formatDate = (date) => {
		if (!date) return "N/A";
		if (date._seconds) {
			return new Date(date._seconds * 1000).toLocaleString();
		}
		return new Date(date).toLocaleString();
	};

	return (
		<dialog
			ref={dialogRef}
			className="event-details-modal"
			onClose={onClose}
		>
			<header className="modal-header">
				<h2>{event.title}</h2>
				<button
					onClick={onClose}
					className="close-button"
					aria-label="Close dialog"
				>
					<X size={24} />
				</button>
			</header>
			<main className="modal-body">
				<section className="event-details-grid">
					<p>
						<MapPin size={16} /> <strong>Location:</strong>{" "}
						{event.raw.location}
					</p>
					<p>
						<Users size={16} /> <strong>Guests:</strong>{" "}
						{event.raw.expectedGuestCount || "N/A"}
					</p>
					<p>
						<Clock size={16} /> <strong>Starts:</strong>{" "}
						{formatDate(event.start)}
					</p>
					<p>
						<Clock size={16} /> <strong>Ends:</strong>{" "}
						{formatDate(event.end)}
					</p>
				</section>

				<section className="schedules-section">
					<h3>Schedules</h3>
					{loadingSchedules ? (
						<p>Loading schedules...</p>
					) : schedules.length > 0 ? (
						<ul className="schedule-list">
							{schedules.map((schedule) => (
								<li key={schedule.id} className="schedule-item">
									<h4>{schedule.scheduleTitle}</h4>
									{schedule.items &&
									schedule.items.length > 0 ? (
										<ul>
											{schedule.items.map((item) => (
												<li key={item.id}>
													{item.time} - {item.title}
												</li>
											))}
										</ul>
									) : (
										<p>No items in this schedule.</p>
									)}
								</li>
							))}
						</ul>
					) : (
						<p>No schedules found for this event.</p>
					)}
				</section>
			</main>
			<footer className="modal-footer">
				<button
					className="button-delete"
					onClick={() => onDelete(event.id)}
				>
					<Trash2 size={16} /> Delete
				</button>
				<button
					className="button-edit"
					onClick={() => onEdit(event.raw)}
				>
					<Edit2 size={16} /> Edit
				</button>
			</footer>
		</dialog>
	);
}

export default function PlannerEventsCalendar({
	setActivePage,
	onSelectEvent,
}) {
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [selectedDate, setSelectedDate] = useState(null);
	const createEventDialogRef = useRef(null);

	const fetchPlannerEvents = useCallback(async () => {
		setLoading(true);
		const auth = getAuth();
		const user = auth.currentUser;
		if (!user) {
			setLoading(false);
			return;
		}
		const token = await user.getIdToken(true);
		try {
			const res = await fetch(
				`https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			if (res.ok) {
				const data = await res.json();
				const formattedEvents = (data.events || []).map((event) => {
					const startDate =
						event.date && event.date._seconds
							? new Date(event.date._seconds * 1000)
							: new Date(event.date);
					const endDate = new Date(startDate);
					if (event.duration) {
						endDate.setHours(
							startDate.getHours() + parseInt(event.duration, 10)
						);
					} else {
						endDate.setHours(startDate.getHours() + 1);
					}
					return {
						id: event.id,
						title: event.name,
						start: startDate,
						end: endDate,
						allDay: false,
						raw: event,
					};
				});
				setEvents(formattedEvents);
			}
		} catch (error) {
			console.error("Failed to fetch events:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPlannerEvents();
	}, [fetchPlannerEvents]);

	const handleSelectSlot = useCallback(({ start }) => {
		setSelectedDate(start);
		setShowCreateModal(true);
	}, []);

	const handleSelectEvent = useCallback((event) => {
		setSelectedEvent(event);
	}, []);

	const handleEditEvent = (eventToEdit) => {
		setSelectedEvent(null);
		onSelectEvent(eventToEdit);
	};

	const handleDeleteEvent = async (eventId) => {
		if (window.confirm("Are you sure you want to delete this event?")) {
			// Deletion logic here
			setSelectedEvent(null);
			await fetchPlannerEvents(); // Refresh events
		}
	};

	useEffect(() => {
		if (showCreateModal && createEventDialogRef.current) {
			createEventDialogRef.current.showModal();
		} else if (!showCreateModal && createEventDialogRef.current) {
			createEventDialogRef.current.close();
		}
	}, [showCreateModal]);

	if (loading) {
		return <div className="loading-container">Loading events...</div>;
	}

	return (
		<main className="calendar-container">
			<header className="calendar-header">
				<h1>Event Calendar</h1>
				<button
					className="button-primary"
					onClick={() => {
						setSelectedDate(new Date());
						setShowCreateModal(true);
					}}
				>
					<Plus size={18} /> Create New Event
				</button>
			</header>
			<Calendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				style={{ height: "calc(100vh - 150px)" }}
				selectable
				onSelectEvent={handleSelectEvent}
				onSelectSlot={handleSelectSlot}
			/>

			{showCreateModal && (
				<dialog
					ref={createEventDialogRef}
					className="create-event-modal"
					onClose={() => setShowCreateModal(false)}
				>
					<NewEvent
						setActivePage={setActivePage}
						initialDate={selectedDate}
						onEventCreated={() => {
							setShowCreateModal(false);
							fetchPlannerEvents(); // Refresh calendar
						}}
					/>
				</dialog>
			)}

			{selectedEvent && (
				<EventDetailsModal
					event={selectedEvent}
					onClose={() => setSelectedEvent(null)}
					onEdit={handleEditEvent}
					onDelete={handleDeleteEvent}
				/>
			)}
		</main>
	);
}
