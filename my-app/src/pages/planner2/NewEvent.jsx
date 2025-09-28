import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import "./NewEvent.css";

export default function NewEvent({
	setActivePage,
	initialDate,
	onEventCreated,
}) {
	const [inputs, setInputs] = useState({
		name: "",
		eventCategory: "",
		startTime: "",
		duration: 1,
		location: "",
		style: "",
	});

	useEffect(() => {
		if (initialDate) {
			const year = initialDate.getFullYear();
			const month = String(initialDate.getMonth() + 1).padStart(2, "0");
			const day = String(initialDate.getDate()).padStart(2, "0");
			const hours = String(initialDate.getHours()).padStart(2, "0");
			const minutes = String(initialDate.getMinutes()).padStart(2, "0");
			setInputs((prev) => ({
				...prev,
				startTime: `${year}-${month}-${day}T${hours}:${minutes}`,
			}));
		}
	}, [initialDate]);

	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const navigate = useNavigate();
	const auth = getAuth();

	const eventCategories = [
		"Wedding",
		"Birthday Party",
		"Corporate Event",
		"Conference",
		"Other",
	];
	const eventStyles = [
		"Elegant/Formal",
		"Casual/Relaxed",
		"Modern/Contemporary",
		"Vintage/Classic",
		"Other",
	];

	const handleChange = (e) => {
		const { name, value } = e.target;
		setInputs((values) => ({ ...values, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (
			!inputs.name ||
			!inputs.eventCategory ||
			!inputs.startTime ||
			!inputs.location ||
			!inputs.style
		) {
			setError("Please fill in all required fields");
			return;
		}

		if (!auth.currentUser) {
			setError("You must be logged in to create an event");
			return;
		}

		try {
			const token = await auth.currentUser.getIdToken();
			const res = await fetch(
				"https://us-central1-planit-sdp.cloudfunctions.net/api/event/apply",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						...inputs,
						plannerId: auth.currentUser.uid,
						date: inputs.startTime,
					}),
				}
			);

			if (!res.ok) throw new Error("Failed to create event");

			setSuccess("Event created successfully!");
			if (onEventCreated) {
				onEventCreated();
			} else {
				setTimeout(() => navigate("/planner-dashboard"), 1500);
			}
		} catch (err) {
			console.error(err);
			setError(err.message);
		}
	};

	return (
		<div className="newevent-container">
			{!onEventCreated && (
				<div className="back-button-container">
					<button
						className="back-button"
						onClick={() =>
							setActivePage
								? setActivePage("dashboard")
								: navigate("/planner-dashboard")
						}
					>
						← Back to Dashboard
					</button>
				</div>
			)}

			<header className="intro">
				<h1 className="newevent-title">Create New Event</h1>
				<p className="newevent-subtitle">Tell us about your event</p>
			</header>

			<form className="event-form" onSubmit={handleSubmit}>
				<fieldset>
					<legend className="sr-only">Event Details</legend>
					<div className="form-group">
						<label htmlFor="name">Event Name *</label>
						<input
							type="text"
							id="name"
							name="name"
							placeholder="Enter event name"
							value={inputs.name}
							onChange={handleChange}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="eventCategory">Event Category *</label>
						<select
							id="eventCategory"
							name="eventCategory"
							value={inputs.eventCategory}
							onChange={handleChange}
							required
						>
							<option value="">Select event category</option>
							{eventCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>

					<div className="form-row">
						<div className="form-group">
							<label htmlFor="startTime">Date & Time *</label>
							<input
								type="datetime-local"
								min={minDateTime}
								id="startTime"
								name="startTime"
								value={inputs.startTime}
								onChange={handleChange}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="duration">Duration (hours) *</label>
							<input
								type="number"
								id="duration"
								name="duration"
								min="1"
								max="24"
								value={inputs.duration}
								onChange={handleChange}
								required
							/>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="location">Location *</label>
						<input
							type="text"
							id="location"
							name="location"
							placeholder="Enter event location"
							value={inputs.location}
							onChange={handleChange}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="style">Event Style *</label>
						<select
							id="style"
							name="style"
							value={inputs.style}
							onChange={handleChange}
							required
						>
							<option value="">Select event style</option>
							{eventStyles.map((style) => (
								<option key={style} value={style}>
									{style}
								</option>
							))}
						</select>
					</div>
				</fieldset>

				<button type="submit" className="create-event-btn">
					Create Event
				</button>
			</form>

			{error && (
				<p className="message error-message" role="alert">
					<span>⚠</span>
					{error}
				</p>
			)}
			{success && (
				<p className="message success-message" role="status">
					<span>✓</span>
					{success}
				</p>
			)}
		</div>
	);
}
