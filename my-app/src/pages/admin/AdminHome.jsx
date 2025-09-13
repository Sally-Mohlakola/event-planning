import React from "react";
import {
	BsFillArchiveFill,
	BsFillGrid3X3GapFill,
	BsPeopleFill,
	BsFillBellFill,
} from "react-icons/bs";
import VendorApplications from "./VendorApplications";
import "./AdminHome.css";

function AdminHome() {
	return (
		<main className="main-container">
			<section className="vendor-applications">
				<div className="main-title">
					<h3>Pending Vendor Applications</h3>
				</div>
				<VendorApplications />
			</section>
		</main>
	);
}

export default AdminHome;
