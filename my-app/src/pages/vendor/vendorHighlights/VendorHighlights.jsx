import React, { useState, useEffect, useCallback } from "react";
import BASE_URL from "../../../apiConfig";
import { getAuth } from "firebase/auth";
import Popup from "../../general/popup/Popup.jsx";
import VendorCreateHighlight from "./VendorCreateHighlight";
import VendorEditHighlight from "./VendorEditHighlight";
import VendorViewHighlight from "./VendorViewHighlight";
import "./VendorHighlights.css";
import { PlusCircle, Loader, AlertTriangle, Eye } from "lucide-react";

const VendorHighlights = () => {
	const [highlights, setHighlights] = useState([]);
	const [reviews, setReviews] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [popupContent, setPopupContent] = useState(null);
	const [selectedReviewId, setSelectedReviewId] = useState(null);
	const [selectedHighlight, setSelectedHighlight] = useState(null);
	const [error, setError] = useState("");

	const fetchVendorData = useCallback(async () => {
		const auth = getAuth();
		const user = auth.currentUser;
		if (!user) return;

		try {
			const token = await user.getIdToken();
			const response = await fetch(
				`${BASE_URL}/vendor/${user.uid}/highlights`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			if (response.status === 404) {
				setHighlights([]);
				return;
			}
			if (!response.ok) throw new Error("Failed to fetch highlights");
			const data = await response.json();
			setHighlights(data);
		} catch (err) {
			console.error(err);
			setError("Could not load your highlights.");
		}
	}, []);

	useEffect(() => {
		setIsLoading(true);
		const auth = getAuth();
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (user) {
				fetchVendorData().finally(() => setIsLoading(false));
			} else {
				setIsLoading(false);
				setError("Please log in to manage highlights.");
			}
		});
		return () => unsubscribe();
	}, [fetchVendorData]);

	const handleOpenSelectReview = async () => {
		setPopupContent("loading");
		const auth = getAuth();
		const user = auth.currentUser;
		try {
			const token = await user.getIdToken();
			const res = await fetch(`${BASE_URL}/reviews/vendor/${user.uid}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (res.status === 404) {
				setReviews([]);
				setPopupContent("select_review");
				return;
			}
			if (!res.ok) throw new Error("Could not fetch reviews.");

			const allReviews = await res.json();
			const highlightedReviewIds = new Set(
				highlights.map((h) => h.reviewId)
			);
			const availableReviews = allReviews.filter(
				(review) => !highlightedReviewIds.has(review.id)
			);
			setReviews(availableReviews);
			setPopupContent("select_review");
		} catch (err) {
			setError("Failed to load reviews.");
			setPopupContent(null);
		}
	};

	const handleViewClick = (highlight) => {
		setSelectedHighlight(highlight);
		setPopupContent("view");
	};

	const handleReviewSelected = (reviewId) => {
		setSelectedReviewId(reviewId);
		setPopupContent("create");
	};

	const handleEditClick = (highlight) => {
		setSelectedHighlight(highlight);
		setPopupContent("edit");
	};

	const handleClosePopup = () => {
		setPopupContent(null);
		setSelectedReviewId(null);
		setSelectedHighlight(null);
	};

	const handleOperationComplete = () => {
		handleClosePopup();
		fetchVendorData();
	};

	const handleDelete = async (highlightId) => {
		if (
			window.confirm(
				"Are you sure you want to permanently delete this highlight?"
			)
		) {
			const auth = getAuth();
			const user = auth.currentUser;
			try {
				const token = await user.getIdToken();
				await fetch(`${BASE_URL}/vendor/highlights/${highlightId}`, {
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				});
				setHighlights((prev) =>
					prev.filter((h) => h.id !== highlightId)
				);
			} catch (err) {
				setError("Failed to delete highlight.");
			}
		}
	};

	const renderPopupContent = () => {
		switch (popupContent) {
			case "loading":
				return (
					<div className="popup-loading">
						<Loader className="spinner" /> <p>Loading Reviews...</p>
					</div>
				);
			case "view":
				return <VendorViewHighlight highlight={selectedHighlight} />;
			case "select_review":
				return (
					<>
						<div className="modal-header">
							<h2>Select a Review to Highlight</h2>
						</div>
						<div className="modal-body">
							{reviews.length > 0 ? (
								<ul className="reviews-list-popup">
									{reviews.map((review) => (
										<li key={review.id}>
											<button
												className="review-select-btn"
												onClick={() =>
													handleReviewSelected(
														review.id
													)
												}
											>
												<p className="review-event-name">
													For Event:{" "}
													<strong>
														{review.eventName}
													</strong>
												</p>
												<p className="review-comment">
													"{review.comment}"
												</p>
												<span className="review-details">
													From:{" "}
													{review.plannerName ||
														"Planner"}{" "}
													| Rating:{" "}
													{"⭐".repeat(review.rating)}
												</span>
											</button>
										</li>
									))}
								</ul>
							) : (
								<p>
									No new reviews are available to be
									highlighted.
								</p>
							)}
						</div>
					</>
				);
			case "create":
				return (
					<VendorCreateHighlight
						reviewId={selectedReviewId}
						onComplete={handleOperationComplete}
					/>
				);
			case "edit":
				return (
					<VendorEditHighlight
						highlight={selectedHighlight}
						onComplete={handleOperationComplete}
					/>
				);
			default:
				return null;
		}
	};

	if (isLoading)
		return (
			<div className="loading-container">
				<Loader className="spinner" />
			</div>
		);

	return (
		<div className="highlights-page">
			<div className="highlights-header">
				<h1>My Highlights</h1>
				<button
					className="primary-btn"
					onClick={handleOpenSelectReview}
				>
					<PlusCircle size={20} /> Create New Highlight
				</button>
			</div>

			{error && (
				<div className="error-banner">
					<AlertTriangle size={18} /> {error}
				</div>
			)}

			{highlights.length > 0 ? (
				<div className="highlights-grid">
					{highlights.map((h) => (
						<div key={h.id} className="highlight-card">
							<button
								className="card-image-btn"
								onClick={() => handleViewClick(h)}
							>
								<div className="card-image-overlay">
									<Eye size={24} />
									<span>View Gallery</span>
								</div>
								<img src={h.imageUrls[0]} alt="Highlight" />
							</button>
							<div className="card-content">
								<p className="card-description">
									{h.description}
								</p>
								<div className="card-actions">
									<button
										className="secondary-btn"
										onClick={() => handleEditClick(h)}
									>
										Edit
									</button>
									<button
										className="danger-btn"
										onClick={() => handleDelete(h.id)}
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="empty-state">
					<h3>Showcase Your Best Work</h3>
					<p>
						You haven't created any highlights yet. Click "Create
						New Highlight" to get started.
					</p>
				</div>
			)}

			<Popup isOpen={!!popupContent} onClose={handleClosePopup}>
				{renderPopupContent()}
			</Popup>
		</div>
	);
};

export default VendorHighlights;
