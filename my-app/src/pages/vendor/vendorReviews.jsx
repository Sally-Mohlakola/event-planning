// src/vendor/VendorReviews.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { Star, StarHalf } from "lucide-react";
import "./vendorReviews.css";

const StarRating = ({ rating, size = 16 }) => (
  <div className="star-rating">
    {[1, 2, 3, 4, 5].map((i) => {
      if (i <= Math.floor(rating)) return <Star key={i} size={size} color="#fbbf24" />;
      else if (i - rating <= 0.5) return <StarHalf key={i} size={size} color="#fbbf24" />;
      else return <Star key={i} size={size} color="#d1d5db" />;
    })}
  </div>
);

const VendorReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const vendorId = auth.currentUser.uid;

        const res = await fetch(
          `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to fetch reviews");

        const data = await res.json();
        setAnalytics(data);
        setReviews(data.reviews || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const handleReply = async (reviewId, replyText) => {
    if (!auth.currentUser) return;
    if (!replyText?.trim()) {
      alert("Reply text is required");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;

      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}/reviews/${reviewId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: replyText }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update reply");
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, reply: replyText, replyInput: "", editingReply: false }
            : r
        )
      );
    } catch (err) {
      console.error("Error updating reply:", err);
      alert(err.message);
    }
  };

  const handleDeleteReply = async (reviewId) => {
    if (!auth.currentUser) return;
    if (!window.confirm("Are you sure you want to delete this reply?")) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const vendorId = auth.currentUser.uid;

      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}/reviews/${reviewId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: "_blank_" }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete reply");
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, reply: "_blank_", editingReply: false, replyInput: "" } : r
        )
      );
    } catch (err) {
      console.error("Error deleting reply:", err);
      alert(err.message);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const reviewDate = new Date(timestamp);
    const diffMs = now - reviewDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading reviews...</p>
    </div>
  );

  if (error) return <p className="error">{error}</p>;
  if (!reviews.length) return <p>No reviews found.</p>;

  const overallRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const totalReviews = reviews.length;
  const ratingCounts = {
    excellent: reviews.filter((r) => r.rating >= 4.5).length,
    good: reviews.filter((r) => r.rating >= 3.5 && r.rating < 4.5).length,
    average: reviews.filter((r) => r.rating >= 2.5 && r.rating < 3.5).length,
    poor: reviews.filter((r) => r.rating < 2.5).length,
  };

  return (
    <section className="vendor-reviews-page">
      <section className="review-page-title">
        <h2>Vendor Reviews</h2>
        <p>Review, analyze, and respond to reviews about your services.</p>
      </section>

      <div className="overall-rating">
        <p>Overall Rating</p>
        <h1>{overallRating.toFixed(1)}</h1>
      </div>

      <div className="rating-bars">
        {["excellent", "good", "average", "poor"].map((key) => (
          <div key={key} className="rating-bar">
            <span className="rating-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <div className="rating-progress">
              <div
                className={`rating-progress-fill rating-${key}`}
                style={{ width: `${(ratingCounts[key] / totalReviews) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="review-list">
        {reviews.map((review) => {
          const isBlank = review.reply === "_blank_";
          return (
            <div key={review.id} className="review-card">
              <p className="review-time">{formatTime(review.createdAt)}</p>
              <StarRating rating={review.rating} size={16} />
              <p className="review-comment">{review.review}</p>

              {review.reply && !review.editingReply && !isBlank && (
                <div className="review-reply">
                  <strong>Your Reply:</strong>
                  <p>{review.reply}</p>
                  <div className="review-reply-actions">
                    <button
                      onClick={() =>
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === review.id ? { ...r, editingReply: true, replyInput: r.reply } : r
                          )
                        )
                      }
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDeleteReply(review.id)}>Delete</button>
                  </div>
                </div>
              )}

              {(!review.reply || review.editingReply || isBlank) && (
                <div className="reply-form">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={review.replyInput || ""}
                    onChange={(e) =>
                      setReviews((prev) =>
                        prev.map((r) =>
                          r.id === review.id
                            ? {
                                ...r,
                                replyInput: e.target.value,
                                editingReply: true,
                                reply: r.reply === "_blank_" ? null : r.reply,
                              }
                            : r
                        )
                      )
                    }
                  />
                  <div className="review-reply-actions">
                    <button
                      onClick={() => handleReply(review.id, review.replyInput)}
                      disabled={!review.replyInput?.trim()}
                    >
                      Send
                    </button>
                    <button
                      onClick={() =>
                        setReviews((prev) =>
                          prev.map((r) =>
                            r.id === review.id ? { ...r, editingReply: false, replyInput: "" } : r
                          )
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default VendorReviews;
