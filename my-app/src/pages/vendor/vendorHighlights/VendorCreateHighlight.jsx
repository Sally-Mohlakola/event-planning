import React, { useState, useEffect } from "react";
import BASE_URL from "../../../apiConfig";
import { getAuth } from "firebase/auth";
import { Loader, AlertTriangle } from "lucide-react";

// Helper function to convert a file to a base64 string
const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result);
		reader.onerror = (error) => reject(error);
	});

const CreateHighlight = ({ reviewId, onComplete }) => {
	const [review, setReview] = useState(null);
	const [description, setDescription] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [selectedFiles, setSelectedFiles] = useState([]);

	useEffect(() => {
		const fetchReview = async () => {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user || !reviewId) return;
			try {
				const token = await user.getIdToken();
				const res = await fetch(`${BASE_URL}/reviews/${reviewId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error("Failed to fetch review details");
				setReview(await res.json());
			} catch (err) {
				setError(err.message);
			}
		};
		fetchReview();
	}, [reviewId]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (selectedFiles.length === 0 || !description) {
			setError("Please add a description and at least one image.");
			return;
		}
		setIsLoading(true);
		setError("");

		try {
			const auth = getAuth();
			const user = auth.currentUser;
			const token = await user.getIdToken();

			// Convert all selected files to base64
			const base64Images = await Promise.all(
				selectedFiles.map((file) => fileToBase64(file))
			);

			const highlightData = {
				reviewId,
				description,
				images: base64Images, // Send array of base64 strings
			};

			const res = await fetch(`${BASE_URL}/vendor/highlights`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(highlightData),
			});

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(
					errData.message || "Failed to create highlight."
				);
			}

			onComplete();
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<div className="modal-header">
				<h2>Create New Highlight</h2>
			</div>
			<div className="modal-body">
				{review && (
					<div className="review-snippet">
						<p>
							<strong>
								Based on review for {review.eventName}
							</strong>
						</p>
						<p>"{review.comment}"</p>
					</div>
				)}
				<form onSubmit={handleSubmit} className="highlight-form">
					<div className="form-group">
						<label htmlFor="description">Description</label>
						<textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows="4"
						/>
					</div>
					<div className="form-group">
						<label htmlFor="images">Gallery Images</label>
						<input
							id="images"
							type="file"
							multiple
							accept="image/*"
							onChange={(e) =>
								setSelectedFiles(Array.from(e.target.files))
							}
						/>
					</div>
					{error && (
						<div className="form-error">
							<AlertTriangle size={16} />
							{error}
						</div>
					)}
					<div className="form-actions">
						<button
							type="submit"
							className="primary-btn"
							disabled={isLoading}
						>
							{isLoading ? (
								<Loader className="spinner-sm" />
							) : (
								"Save Highlight"
							)}
						</button>
					</div>
				</form>
			</div>
		</>
	);
};

export default CreateHighlight;
