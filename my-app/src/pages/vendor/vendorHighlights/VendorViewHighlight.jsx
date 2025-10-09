import React, { useState } from "react";
import { Star, Calendar, User } from "lucide-react";

const VendorViewHighlight = ({ highlight }) => {
	const [activeImage, setActiveImage] = useState(highlight.imageUrls[0]);

	if (!highlight) return null;

	return (
		<>
			<div className="modal-header">
				<h2>Highlight Details</h2>
			</div>
			<div className="modal-body view-highlight-body">
				<div className="gallery-container">
					<div className="main-image-container">
						<img
							src={activeImage}
							alt="Main highlight view"
							className="gallery-main-image"
						/>
					</div>
					{highlight.imageUrls.length > 1 && (
						<div className="thumbnail-container">
							{highlight.imageUrls.map((url, index) => (
								<img
									key={index}
									src={url}
									alt={`Thumbnail ${index + 1}`}
									className={`gallery-thumbnail ${
										url === activeImage ? "active" : ""
									}`}
									onClick={() => setActiveImage(url)}
								/>
							))}
						</div>
					)}
				</div>
				<div className="highlight-details-content">
					<div className="highlight-section">
						<h3>Your Description</h3>
						<p>{highlight.description}</p>
					</div>
					<div className="highlight-section review-context">
						<h3>Original Review Context</h3>
						<div className="context-item">
							<Calendar size={18} />
							<span>
								Event:{" "}
								<strong>
									{highlight.eventData?.name || "N/A"}
								</strong>
							</span>
						</div>
						<div className="context-item">
							<User size={18} />
							<span>
								From Planner:{" "}
								<strong>
									{highlight.plannerData?.name || "N/A"}
								</strong>
							</span>
						</div>
						<div className="context-item review-quote">
							<p>
								"
								{highlight.reviewData?.comment ||
									"No comment provided."}
								"
							</p>
							<span className="review-rating">
								{Array.from({
									length: highlight.reviewData?.rating || 0,
								}).map((_, i) => (
									<Star
										key={i}
										size={16}
										className="star-icon filled"
									/>
								))}
							</span>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default VendorViewHighlight;
