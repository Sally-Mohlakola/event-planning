import React from "react";
import {
	BsFillArchiveFill,
	BsFillGrid3X3GapFill,
	BsPeopleFill,
	BsFillBellFill,
} from "react-icons/bs";
import AdminVendorApplications from "../adminVendorManagement/AdminVendorApplications";
import "./AdminHomeDashboard.css";

function AdminHomeDashboard() {
	return (
		<main className="main-container">
			<section className="vendor-applications">
				<div className="main-title">
					<h3>Pending Vendor Applications</h3>
				</div>
				<AdminVendorApplications />
			</section>
		</main>
	);
}

export default AdminHomeDashboard;
