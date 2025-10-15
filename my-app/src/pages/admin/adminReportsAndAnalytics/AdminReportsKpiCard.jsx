import React from "react";

const AdminReportsKpiCard = ({ value, label, icon: Icon }) => (
	<figure className="admin-report-kpi-metric">
		{Icon && (
			<Icon
				className="admin-report-kpi-icon"
				size={20}
				aria-hidden="true"
			/>
		)}
		<strong className="admin-report-kpi-value">{value ?? "0"}</strong>
		<figcaption className="admin-report-kpi-label">{label}</figcaption>
	</figure>
);

export default AdminReportsKpiCard;
