import React, { useState, useEffect } from "react";
import { auth } from "../../../firebase"; // Make sure this path is correct
import Popup from "../adminGeneralComponents/Popup";
import "./AdminVendorApplications.css";

function AdminVendorApplications() {
	const [applications, setApplications] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	// State for the Popup
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [selectedVendor, setSelectedVendor] = useState(null);

	// Fetch pending applications when the component mounts
	useEffect(() => {
		const fetchApplications = async () => {
			try {
				const apiUrl =
					"https://us-central1-planit-sdp.cloudfunctions.net/api/admin/vendor-applications";

				const response = await fetch(apiUrl); // No auth headers needed for local testing

				if (!response.ok) {
					throw new Error(
						"Failed to fetch applications. Is the emulator running?"
					);
				}
				const data = await response.json();
				setApplications(data);
			} catch (err) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchApplications();
	}, []);

	// Function to handle approving or rejecting a vendor
	const handleUpdateStatus = async (vendorId, status) => {
		try {
			const apiUrl = `https://us-central1-planit-sdp.cloudfunctions.net/api/admin/vendor-applications/${vendorId}`;

			const response = await fetch(apiUrl, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status }),
			});

			if (!response.ok) {
				throw new Error(`Failed to ${status} vendor`);
			}

			// If successful, remove the application from the list in the UI
			setApplications((prev) =>
				prev.filter((app) => app.id !== vendorId)
			);
		} catch (err) {
			setError(err.message);
		}
	};

	// Function to open the popup with the selected vendor's data
	const handleRowClick = (vendor) => {
		setSelectedVendor(vendor);
		setIsPopupOpen(true);
	};

	if (isLoading) return <h3>Loading applications...</h3>;
	if (error) return <h3>Error: {error}</h3>;

	return (
		<section className="main-container">
			<h1>Pending Vendor Applications</h1>
			<section className="applications-list">
				{applications.length > 0 ? (
					<table className="vendor-table">
						<thead>
							<tr>
								<th>Business Name</th>
								<th>Category</th>
								<th>Email</th>
							</tr>
						</thead>
						<tbody>
							{applications.map((app) => (
								<tr
									key={app.id}
									onClick={() => handleRowClick(app)}
								>
									<td>{app.businessName}</td>
									<td>{app.category}</td>
									<td>{app.email}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p>There are no pending applications found.</p>
				)}
			</section>

			{/* The Popup for displaying vendor details */}
			<Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
				{selectedVendor && (
					<div className="vendor-popup-content">
						{/*Vendor Profile Picture*/}
						{selectedVendor.profilePic ? (
							<img
								src={selectedVendor.profilePic}
								alt={selectedVendor.businessName}
								className="vendor-profile-pic"
							/>
						) : (
							<div className="vendor-profile-pic placeholder">
								<span>
									{selectedVendor.businessName.charAt(0)}
								</span>
							</div>
						)}

						{/*Vendor Details*/}
						<h2 className="vendor-name">
							{selectedVendor.businessName}
						</h2>
						<p className="vendor-categor">
							<strong>Category:</strong> {selectedVendor.category}
						</p>
						<p className="vendor-description">
							<strong>Description:</strong>{" "}
							{selectedVendor.description}
						</p>
						<p className="vendor-email">
							<strong>Email:</strong> {selectedVendor.email}
						</p>
						<p className="vendor-phone">
							<strong>Phone:</strong> {selectedVendor.phone}
						</p>
						<p className="vendor-address">
							<strong>Address:</strong> {selectedVendor.address}
						</p>

						{/*Approve/Reject Buttons*/}
						<div className="application-actions">
							<button
								className="btn-approve"
								onClick={() =>
									handleUpdateStatus(
										selectedVendor.id,
										"approved"
									)
								}
							>
								Approve
							</button>
							<button
								className="btn-reject"
								onClick={() =>
									handleUpdateStatus(
										selectedVendor.id,
										"rejected"
									)
								}
							>
								Reject
							</button>
						</div>
					</div>
				)}
			</Popup>
		</section>
	);
}

export default AdminVendorApplications;
