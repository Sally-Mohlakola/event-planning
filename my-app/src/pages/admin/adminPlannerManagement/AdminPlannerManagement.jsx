import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase"; // Ensure this path is correct
import { Search, Edit, UserX, UserCheck, Trash2 } from "lucide-react";
import Popup from "../../general/popup/Popup.jsx";
import "./AdminPlannerManagement.css";
import BASE_URL from "../../../apiConfig";
import LoadingSpinner from "../../general/loadingspinner/LoadingSpinner.jsx";

export default function PlannerManagement() {
	const navigate = useNavigate();
	const [planners, setPlanners] = useState([]);
	const [filteredPlanners, setFilteredPlanners] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	// State for filtering and modal
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [selectedPlanner, setSelectedPlanner] = useState(null);

	const getToken = () =>
		auth.currentUser
			? auth.currentUser.getIdToken()
			: Promise.reject("Not logged in");

	// Fetch all planners on component mount
	useEffect(() => {
		const fetchPlanners = async () => {
			let user = auth.currentUser;
			while (!user) {
				await new Promise((res) => setTimeout(res, 50)); // wait 50ms
				user = auth.currentUser;
			}
			try {
				const token = await getToken();
				const apiUrl = `${BASE_URL}/admin/planners`;
				const response = await fetch(apiUrl, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!response.ok) throw new Error("Failed to fetch planners.");
				const data = await response.json();
				setPlanners(data);
				setFilteredPlanners(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchPlanners();
	}, []);

	// Apply filters whenever planners, searchTerm, or statusFilter changes
	useEffect(() => {
		let result = planners;
		if (searchTerm) {
			result = result.filter((p) =>
				p.name.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}
		if (statusFilter !== "all") {
			result = result.filter((p) => p.status === statusFilter);
		}
		setFilteredPlanners(result);
	}, [searchTerm, statusFilter, planners]);

	const handleViewDetails = (planner) => {
		setSelectedPlanner(planner);
		setIsPopupOpen(true);
	};

	const handleUpdateStatus = async (plannerId, newStatus) => {
		// ... (Logic to update status via API)
		// This function would be similar to the one in your VendorApplications component
	};

	if (isLoading)
		return (
			<main className="main-container">
				<LoadingSpinner text="Loading planners..." />
			</main>
		);
	if (error)
		return (
			<main className="main-container">
				<h3>Error: {error}</h3>
			</main>
		);

	return (
		<main className="main-container planner-management-page">
			<header className="page-header">
				<h3>Planner Management</h3>
				<section className="search-bar">
					<Search size={20} />
					<input
						type="text"
						placeholder="Search by planner name..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</section>
			</header>

			<section className="planner-grid">
				{filteredPlanners.length > 0 ? (
					filteredPlanners.map((planner) => (
						<article
							key={planner.id}
							className="planner-summary-card"
						>
							<div className="planner-card-info">
								<h4>{planner.name}</h4>
								<p
									className={`planner-status-tag status-${planner.status}`}
								>
									{planner.status}
								</p>
								<div className="planner-stat">
									<span>{planner.activeEvents}</span> Active
									Events
								</div>
							</div>
							<button
								className="btn-view-details"
								onClick={() => handleViewDetails(planner)}
							>
								View Details
							</button>
						</article>
					))
				) : (
					<p>No planners found.</p>
				)}
			</section>

			<Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
				{selectedPlanner && (
					<div className="planner-modal-details">
						<header className="planner-modal-header">
							<h2 className="planner-modal-name">
								{selectedPlanner.name}
							</h2>
							<p
								className={`planner-status-tag status-${selectedPlanner.status}`}
							>
								{selectedPlanner.status}
							</p>
						</header>
						<section className="planner-modal-body">
							<div className="planner-contact-info">
								<p>
									<strong>Email:</strong>{" "}
									{selectedPlanner.email}
								</p>
								<p>
									<strong>Phone:</strong>{" "}
									{selectedPlanner.phone}
								</p>
								<p>
									<strong>Active Events:</strong>{" "}
									{selectedPlanner.activeEvents}
								</p>
							</div>
						</section>
					</div>
				)}
			</Popup>
		</main>
	);
}
