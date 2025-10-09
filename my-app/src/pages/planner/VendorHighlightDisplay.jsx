import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import BASE_URL from "../../apiConfig";
import "./VendorHighlightDisplay.css";
import { Star } from "lucide-react";

const VendorHighlightDisplay = ({ vendorId }) => {
	const [highlights, setHighlights] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!vendorId) return;

		const fetchHighlights = async () => {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) {
				setIsLoading(false);
				return;
			}

			try {
				const token = await user.getIdToken();
				const response = await fetch(
					`${BASE_URL}/highlights/vendor/${vendorId}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					}
				);

				if (response.status === 404) {
					setHighlights([]);
				} else if (response.ok) {
					const data = await response.json();
					setHighlights(data);
				} else {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
			} catch (error) {
				console.error("Error fetching vendor highlights:", error);
				setHighlights([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchHighlights();
	}, [vendorId]);

	if (isLoading)
		return <div className="loading-state">Loading highlights...</div>;
	if (highlights.length === 0)
		return (
			<div className="empty-state">
				No highlights have been added by this vendor yet.
			</div>
		);

	return (
		<div className="highlights-section">
			{highlights.map((highlight) => (
				<div key={highlight.id} className="highlight-display-card">
					<div className="review-context-display">
						<div className="review-rating">
							{Array.from({
								length: highlight.reviewData?.rating || 0,
							}).map((_, i) => (
								<Star
									key={i}
									size={18}
									className="star-icon filled"
								/>
							))}
						</div>
						<p className="review-comment">
							"{highlight.reviewData?.comment}"
						</p>
						<span className="planner-name">
							- {highlight.plannerData?.name} for the{" "}
							{highlight.eventData?.name}
						</span>
					</div>

					<div className="highlight-gallery">
						{highlight.imageUrls.map((url, index) => (
							<img
								key={index}
								src={url}
								alt={`Highlight image ${index + 1}`}
							/>
						))}
					</div>

					<div className="highlight-content">
						<p className="highlight-description">
							{highlight.description}
						</p>
					</div>
				</div>
			))}
		</div>
	);
};

export default VendorHighlightDisplay;
