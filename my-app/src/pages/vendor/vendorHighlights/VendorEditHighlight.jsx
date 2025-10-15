import React, { useState } from "react";
import BASE_URL from "../../../apiConfig";
import { getAuth } from "firebase/auth";
import { Loader, AlertTriangle } from "lucide-react";

const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result);
		reader.onerror = (error) => reject(error);
	});

const EditHighlight = ({ highlight, onComplete }) => {
	const [description, setDescription] = useState(highlight.description);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [newFiles, setNewFiles] = useState([]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const auth = getAuth();
			const user = auth.currentUser;
			const token = await user.getIdToken();

			const updateData = { description };

			// If new files were selected, convert them to base64
			if (newFiles.length > 0) {
				updateData.images = await Promise.all(
					newFiles.map((file) => fileToBase64(file))
				);
			}

			const res = await fetch(
				`${BASE_URL}/vendor/highlights/${highlight.id}`,
				{
					method: "PUT",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(updateData),
				}
			);

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(
					errData.message || "Failed to update highlight."
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
				<h2>Edit Highlight</h2>
			</div>
			<div className="modal-body">
				<form onSubmit={handleSubmit} className="highlight-form">
					<div className="form-group">
						<label>Current Images</label>
						<div className="current-images">
							{highlight.imageUrls.map((url) => (
								<img
									key={url}
									src={url}
									alt="Current highlight"
								/>
							))}
						</div>
					</div>
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
						<label htmlFor="images">
							Upload New Images (optional)
						</label>
						<p className="field-note">
							Uploading new images will replace all existing ones.
						</p>
						<input
							id="images"
							type="file"
							multiple
							accept="image/*"
							onChange={(e) =>
								setNewFiles(Array.from(e.target.files))
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
								"Save Changes"
							)}
						</button>
					</div>
				</form>
			</div>
		</>
	);
};

export default EditHighlight;
