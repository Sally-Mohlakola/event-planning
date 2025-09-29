import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Users,
	Calendar,
	MapPin,
	FileText,
	ArrowLeft,
	Building2,
	BarChart3,
} from "lucide-react";

//Paging imports
import PlannerDashboard from "./PlannerDashboard";
import PlannerVendorMarketplace from "./PlannerVendorMarketplace";
import PlannerEventsCalendar from "./PlannerEventsCalendar";

//css import
import "./PlannerApp.css";
import PlannerViewEvent from "./PlannerViewEvent";
import PlannerContract from "./PlannerContract";
import PlannerFloorPlan from "./PlannerFloorPlan";
import PlannerSchedules from "./PlannerSchedules";

const PlannerApp = () => {
	//USing to page to the selected tab
	const [activePage, setActivePage] = useState("dashboard");
	const [selectedEvent, setSelectedEvent] = useState(null);

	const navigate = useNavigate();

	const navigationItems = [
		{ id: "dashboard", label: "Dashboard", icon: BarChart3 },
		{ id: "events", label: "Events", icon: Calendar },
		{ id: "vendor", label: "Vendor Marketplace", icon: Users },
		{
			id: "schedule management",
			label: "Schedule Management",
			icon: Users,
		},
		{ id: "floorplan", label: "Floorplan", icon: MapPin },
		{ id: "documents", label: "Documents", icon: FileText },
	];

	const renderCurrentPage = () => {
		switch (activePage) {
			case "dashboard":
				return <PlannerDashboard setActivePage={setActivePage} />;
			case "events":
				return (
					<PlannerEventsCalendar
						setActivePage={setActivePage}
						onSelectEvent={onSelectEvent}
					/>
				);
			case "vendor":
				return (
					<PlannerVendorMarketplace
						setActivePage={setActivePage}
						event={selectedEvent}
					/>
				);
			case "floorplan":
				return <PlannerFloorPlan setActivePage={setActivePage} />;
			case "schedule management":
				return <PlannerSchedules setActivePage={setActivePage} />;
			case "documents":
				return <PlannerContract setActivePage={setActivePage} />;
			case "selected-event":
				return (
					<PlannerViewEvent
						event={selectedEvent}
						setActivePage={setActivePage}
					/>
				);
			default:
				return <PlannerDashboard setActivePage={setActivePage} />;
		}
	};

	const onSelectEvent = (event) => {
		setSelectedEvent(event);
		setActivePage("selected-event");
	};

	return (
		<div className="vendor-app">
			{/* Navigation Bar */}
			<nav className="vendor-navbar">
				<div className="navbar-container">
					<div className="navbar-content">
						<div className="navbar-left">
							<button
								className="home-btn"
								onClick={() => navigate("/home")}
							>
								<ArrowLeft size={20} />
								<span>Home</span>
							</button>

							<div className="vendor-logo">
								<Building2 size={24} />
								<span className="logo-text">PlannerHub</span>
							</div>
						</div>

						<div className="navbar-right">
							{navigationItems.map((item) => {
								const Icon = item.icon;
								return (
									<button
										key={item.id}
										className={`nav-btn ${
											activePage === item.id
												? "active"
												: ""
										}`}
										onClick={() => setActivePage(item.id)}
									>
										<Icon size={18} />
										{item.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<main className="vendor-main">{renderCurrentPage()}</main>
		</div>
	);
};

export default PlannerApp;
