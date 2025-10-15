import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase";
import { Search, Edit } from "lucide-react";
import Popup from "../../general/popup/Popup.jsx";
import "./AdminVendorManagement.css";
import AdminVendorApplications from "./AdminVendorApplications.jsx";
import BASE_URL from "../../../apiConfig";
import LoadingSpinner from "../../general/loadingspinner/LoadingSpinner.jsx";

function AdminVendorManagement() {
	const navigate = useNavigate();
	const [vendors, setVendors] = useState([]);
	const [filteredVendors, setFilteredVendors] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [selectedVendor, setSelectedVendor] = useState(null);

	const getToken = () =>
		auth.currentUser
			? auth.currentUser.getIdToken()
			: Promise.reject("Not logged in");

	useEffect(() => {
		const fetchVendors = async () => {
			let user = auth.currentUser;
			while (!user) {
				await new Promise((res) => setTimeout(res, 50));
				user = auth.currentUser;
			}
			try {
				const token = await getToken();
				const response = await fetch(`${BASE_URL}/admin/vendors`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!response.ok) throw new Error("Failed to fetch vendors.");
				const data = await response.json();
				setVendors(data);
				setFilteredVendors(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchVendors();
	}, []);

	useEffect(() => {
		let result = vendors;

		if (searchTerm) {
			result = result.filter((v) =>
				v.businessName.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		if (categoryFilter !== "all") {
			result = result.filter((v) => v.category === categoryFilter);
		}

		setFilteredVendors(result);
	}, [searchTerm, categoryFilter, vendors]);

	const handleViewDetails = (vendor) => {
		setSelectedVendor(vendor);
		setIsPopupOpen(true);
	};

	const uniqueCategories = [
		"all",
		...new Set(vendors.map((v) => v.category)),
	];

	if (isLoading)
		return (
			<main className="admin-vendor-management-container">
				<LoadingSpinner text="Loading vendors..." />
			</main>
		);

	if (error)
		return (
			<main className="admin-vendor-management-container">
				<h3>Error: {error}</h3>
			</main>
		);

	return (
		<section className="admin-vendor-management-container">
			<header className="admin-vendor-management-header">
				<h1>Vendor Management</h1>
				<p className="admin-vendor-management-subtitle">
					Manage approved vendors and pending applications
				</p>
			</header>

			<section className="admin-vendor-management-section">
				<h2 className="admin-vendor-management-heading">
					Pending Applications
				</h2>
				<AdminVendorApplications />
			</section>

			<section className="admin-vendor-management-section">
				<h2 className="admin-vendor-management-heading">
					Approved Vendors
				</h2>

				<section className="admin-vendor-management-filters">
					<div className="admin-vendor-management-search">
						<Search size={20} />
						<input
							type="text"
							placeholder="Search by business name..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					<select
						className="admin-vendor-management-dropdown"
						value={categoryFilter}
						onChange={(e) => setCategoryFilter(e.target.value)}
					>
						{uniqueCategories.map((cat) => (
							<option key={cat} value={cat}>
								{cat === "all" ? "All Categories" : cat}
							</option>
						))}
					</select>
				</section>

				<section className="admin-vendor-management-grid">
					{filteredVendors.length > 0 ? (
						filteredVendors.map((vendor) => (
							<article
								key={vendor.id}
								className="admin-vendor-management-card"
							>
								<figure className="admin-vendor-management-card-image">
									<img
										src={
											vendor.profilePic ||
											"/default-avatar.png"
										}
										alt={vendor.businessName}
									/>
								</figure>
								<section className="admin-vendor-management-card-info">
									<h4>{vendor.businessName}</h4>
									<p className="admin-vendor-management-category">
										{vendor.category}
									</p>
								</section>
								<button
									className="admin-vendor-management-view-btn"
									onClick={() => handleViewDetails(vendor)}
								>
									View Details
								</button>
							</article>
						))
					) : (
						<p className="admin-vendor-management-empty">
							No vendors found.
						</p>
					)}
				</section>
			</section>

			<Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
				{selectedVendor && (
					<section className="admin-vendor-management-popup">
						<header className="admin-vendor-management-popup-header">
							<img
								src={
									selectedVendor.profilePic ||
									"/default-avatar.png"
								}
								alt={selectedVendor.businessName}
								className="admin-vendor-management-popup-img"
							/>
							<h2>{selectedVendor.businessName}</h2>
							<p className="admin-vendor-management-popup-category">
								{selectedVendor.category}
							</p>
						</header>

						<section className="admin-vendor-management-popup-body">
							<p className="admin-vendor-management-description">
								{selectedVendor.description}
							</p>

							<section className="admin-vendor-management-contact">
								<p>
									<strong>Email:</strong>{" "}
									{selectedVendor.email}
								</p>
								<p>
									<strong>Phone:</strong>{" "}
									{selectedVendor.phone}
								</p>
								<p>
									<strong>Address:</strong>{" "}
									{selectedVendor.address}
								</p>
							</section>
						</section>
					</section>
				)}
			</Popup>
		</section>
	);
}

export default AdminVendorManagement;
