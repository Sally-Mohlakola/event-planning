import React, { useState, useEffect } from "react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import {
	Calendar,
	Users,
	BarChart as BarIcon,
	PieChart as PieIcon,
} from "lucide-react";
import "./AdminReports.css";
import { auth } from "../../../firebase"; // Adjust path as needed

// Mock data for demonstration - will replace with API calls later
const mockSummaryData = {
	events: {
		total: 152,
		status: { planning: 80, confirmed: 60, completed: 12 },
	},
	planners: { total: 45, status: { active: 40, suspended: 5 } },
	vendors: { total: 120, status: { approved: 105, pending: 15 } },
};

// Minimal Popup component
const Popup = ({ isOpen, onClose, children }) => {
	if (!isOpen) return null;
	return (
		<div className="popup-overlay" onClick={onClose}>
			<div className="popup-content" onClick={(e) => e.stopPropagation()}>
				<button className="popup-close" onClick={onClose}>
					&times;
				</button>
				{children}
			</div>
		</div>
	);
};

const AdminReports = () => {
	const [summary, setSummary] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [monthlyFinancials, setMonthlyFinancials] = useState([]);
	const [newEventsData, setNewEventsData] = useState([]);
	const [guestRsvpData, setGuestRsvpData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Popup state
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [popupContent, setPopupContent] = useState(null);
	const [popupTitle, setPopupTitle] = useState("");

	const COLORS = ["#2e7d32", "#ff6d00", "#d50000", "#2962ff"];

	// Function to open detailed popup
	const handleExpandReports = (section) => {
		setPopupTitle(`Detailed ${section} Reports`);
		setPopupContent(
			`This is the detailed analytics view for ${section}. Full data tables and charts would be displayed here.`
		);
		setIsPopupOpen(true);
	};

	useEffect(() => {
		const fetchSummary = async () => {
			try {
				// Replace with real API calls
				setSummary(mockSummaryData);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		const fetchData = async () => {
			if (!auth.currentUser) {
				setError("User not authenticated");
				setLoading(false);
				return;
			}

			try {
				const token = await auth.currentUser.getIdToken();
				const eventsRes = await fetch(
					"https://us-central1-planit-sdp.cloudfunctions.net/api/admin/events",
					{ headers: { Authorization: `Bearer ${token}` } }
				);
				if (!eventsRes.ok)
					throw new Error(
						`Failed to fetch events: ${eventsRes.status}`
					);
				const eventsData = await eventsRes.json();
				const events = eventsData.events || [];

				// Determine date range
				const today = new Date();
				const eventDates = events
					.map((e) => new Date(e.date))
					.filter((d) => !isNaN(d));
				const minDate = eventDates.length
					? Math.min(today, ...eventDates)
					: today;
				const maxDate = eventDates.length
					? Math.max(...eventDates)
					: new Date(today.getFullYear(), today.getMonth() + 6, 1);
				const months = [];
				for (
					let d = new Date(minDate);
					d <= maxDate;
					d.setMonth(d.getMonth() + 1)
				) {
					months.push(d.toLocaleString("default", { month: "long" }));
				}

				// Monthly financials
				const financialsMap = {};
				months.forEach(
					(month) =>
						(financialsMap[month] = {
							month,
							budget: 0,
							spending: 0,
						})
				);
				events.forEach((event) => {
					const month = new Date(event.date).toLocaleString(
						"default",
						{ month: "long" }
					);
					if (months.includes(month)) {
						const budgetValue = parseFloat(event.budget || 0);
						financialsMap[month].budget += budgetValue;
						financialsMap[month].spending += budgetValue * 0.9; // Placeholder
					}
				});
				setMonthlyFinancials(Object.values(financialsMap));

				// New events trend
				const eventsByMonth = {};
				months.forEach((month) => (eventsByMonth[month] = 0));
				events.forEach((event) => {
					const month = new Date(event.date).toLocaleString(
						"default",
						{ month: "long" }
					);
					if (months.includes(month)) eventsByMonth[month] += 1;
				});
				setNewEventsData(
					months.map((month) => ({
						month,
						newEvents: eventsByMonth[month],
					}))
				);

				// Guest RSVP data
				const rsvpMap = {
					Attending: 0,
					Pending: 0,
					"Not Attending": 0,
					Maybe: 0,
				};
				events.forEach((event) => {
					const totalGuests = Number(event.expectedGuestCount) || 0;
					rsvpMap["Attending"] += Math.floor(totalGuests * 0.5);
					rsvpMap["Pending"] += Math.floor(totalGuests * 0.3);
					rsvpMap["Not Attending"] += Math.floor(totalGuests * 0.15);
					rsvpMap["Maybe"] += Math.floor(totalGuests * 0.05);
				});
				setGuestRsvpData(
					Object.keys(rsvpMap).map((status) => ({
						name: status,
						value: rsvpMap[status],
					}))
				);
			} catch (err) {
				console.error("Error fetching report data:", err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchSummary();
		fetchData();
	}, []);

	if (isLoading || loading)
		return (
			<div className="loading-screen">
				<div className="spinner"></div>
				<p>Loading reports...</p>
			</div>
		);

	if (error) return <div className="error">{error}</div>;

	return (
		<main className="main-container">
			<div className="charts">
				{/* Chart 1: Monthly Financial Overview */}
				<div className="chart-container">
					<h4>Monthly Financials (Budget vs. Spending)</h4>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart
							data={monthlyFinancials}
							margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								strokeOpacity={0.2}
							/>
							<XAxis dataKey="month" />
							<YAxis />
							<Tooltip />
							<Legend />
							<Bar
								dataKey="budget"
								fill="#8884d8"
								name="Budgeted Amount"
							/>
							<Bar
								dataKey="spending"
								fill="#82ca9d"
								name="Actual Spending"
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>

				{/* Chart 2: New Event Creation Trend */}
				<div className="chart-container">
					<h4>New Event Creation Trend</h4>
					<ResponsiveContainer width="100%" height={300}>
						<LineChart
							data={newEventsData}
							margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								strokeOpacity={0.2}
							/>
							<XAxis dataKey="month" />
							<YAxis
								domain={[0, "auto"]}
								type="number"
								tickFormatter={(value) => Math.round(value)}
							/>
							<Tooltip />
							<Legend />
							<Line
								type="monotone"
								dataKey="newEvents"
								stroke="#ff6d00"
								strokeWidth={2}
								name="New Events Created"
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>

				{/* Chart 3: Guest RSVP Status Breakdown */}
				<div className="chart-container">
					<h4>Guest RSVP Status (All Events)</h4>
					<ResponsiveContainer width="100%" height={300}>
						<PieChart>
							<Pie
								data={guestRsvpData}
								cx="50%"
								cy="50%"
								labelLine={false}
								outerRadius={100}
								fill="#8884d8"
								dataKey="value"
								nameKey="name"
								label={({ name, percent }) =>
									`${name} ${(percent * 100).toFixed(0)}%`
								}
							>
								{guestRsvpData.map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={COLORS[index % COLORS.length]}
									/>
								))}
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>

				<div className="chart-container">
					<h4>Upcoming Feature</h4>
					<div className="placeholder-chart">
						<p>More reports coming soon...</p>
					</div>
				</div>

				<section className="reports-grid">
					{/* Events Report Card */}
					<article className="report-summary-card">
						<header className="card-header">
							<Calendar className="header-icon" />
							<h2>Events Overview</h2>
						</header>
						<div className="card-body">
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.events.total}
								</p>
								<p className="kpi-label">Total Events</p>
							</div>
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.events.status.planning}
								</p>
								<p className="kpi-label">In Planning</p>
							</div>
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.events.status.confirmed}
								</p>
								<p className="kpi-label">Confirmed</p>
							</div>
						</div>
						<footer className="card-footer">
							<button
								onClick={() => handleExpandReports("Events")}
							>
								<BarIcon size={16} /> Expand Event Reports
							</button>
						</footer>
					</article>

					{/* Planners Report Card */}
					<article className="report-summary-card">
						<header className="card-header">
							<Users className="header-icon" />
							<h2>Planners Overview</h2>
						</header>
						<div className="card-body">
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.planners.total}
								</p>
								<p className="kpi-label">Total Planners</p>
							</div>
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.planners.status.active}
								</p>
								<p className="kpi-label">Active</p>
							</div>
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.planners.status.suspended}
								</p>
								<p className="kpi-label">Suspended</p>
							</div>
						</div>
						<footer className="card-footer">
							<button
								onClick={() => handleExpandReports("Planners")}
							>
								<PieIcon size={16} /> Expand Planner Reports
							</button>
						</footer>
					</article>

					{/* Vendors Report Card */}
					<article className="report-summary-card">
						<header className="card-header">
							<Users className="header-icon" />
							<h2>Vendors Overview</h2>
						</header>
						<div className="card-body">
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.vendors.total}
								</p>
								<p className="kpi-label">Total Vendors</p>
							</div>
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.vendors.status.approved}
								</p>
								<p className="kpi-label">Approved</p>
							</div>
							<div className="kpi-metric">
								<p className="kpi-value">
									{summary?.vendors.status.pending}
								</p>
								<p className="kpi-label">Pending</p>
							</div>
						</div>
						<footer className="card-footer">
							<button
								onClick={() => handleExpandReports("Vendors")}
							>
								<BarIcon size={16} /> Expand Vendor Reports
							</button>
						</footer>
					</article>
				</section>

				{/* Popup */}
				<Popup
					isOpen={isPopupOpen}
					onClose={() => setIsPopupOpen(false)}
				>
					<div className="detailed-reports-popup">
						<h2>{popupTitle}</h2>
						<p>{popupContent}</p>
					</div>
				</Popup>
			</div>
		</main>
	);
};

export default AdminReports;
