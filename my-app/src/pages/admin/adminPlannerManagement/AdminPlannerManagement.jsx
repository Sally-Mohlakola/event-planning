import React from "react";
import "./AdminPlannerManagement.css";

export default function PlannerManagement() {
	return (
		<section className="admin-planner-list">
			<section className="admin-planner-header">
				<h2>Planners</h2>
				<p className="admin-planner-subtitle">
					Manage planner profiles
				</p>
			</section>

			<section className="admin-planner-controls">
				<section className="admin-planner-search-sort">
					<input
						type="text"
						placeholder="Search planner..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="search-bar"
					/>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="sort-select"
					>
						<option value="date">Sort by Name</option>
						<option value="name">Sort by *Something*</option>
					</select>
				</section>
			</section>

			<section className="admin-planners-grid"></section>
		</section>
	);
}
