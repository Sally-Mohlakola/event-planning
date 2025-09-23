import React from "react";
import {
	BsFillArchiveFill,
	BsFillGrid3X3GapFill,
	BsPeopleFill,
	BsFillBellFill,
} from "react-icons/bs";
import AdminReports from "../adminReportsAndAnalytics/AdminReports.jsx";
import "./AdminHomeDashboard.css";

function AdminHomeDashboard() {
	return (
		<section className="vendor-applications">
			<AdminReports />
		</section>
	);
}

export default AdminHomeDashboard;
