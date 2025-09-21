
import React, { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { Star, StarHalf } from "lucide-react";
import "./vendorReviews.css";

// Reusable StarRating component
const StarRating = ({ rating, size = 16 }) => (
  <div className="star-rating" style={{ display: "flex", gap: "2px" }}>
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

  // Fetch reviews from analytics API
  useEffect(() => {
    const fetchReviews = async () => {
      if (!auth.currentUser) return;

      try {
        const token = await auth.currentUser.getIdToken();
        const vendorId = auth.currentUser.uid;

        const res = await fetch(
          `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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

  // Handle adding/editing reply
  const handleReply = async (reviewId, replyText) => {
    if (!auth.currentUser) return;

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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to send reply");
      }

      const updatedReview = await res.json();
      console.log("Reply updated:", updatedReview);

      // ✅ Update local state with new reply, reset inputs
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, reply: updatedReview.reply, replyInput: "", editingReply: false }
            : r
        )
      );
    } catch (err) {
      console.error("Error sending reply:", err);
      alert(err.message);
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    const now = new Date();
    const reviewDate = new Date(timestamp);
    const diffMs = now - reviewDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  if (loading) return <p>Loading reviews...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!reviews.length) return <p>No reviews found.</p>;

  // Overall rating
  const overallRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Rating counts
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

      {/* Overall Rating */}
      <div className="overall-rating">
        <p>Overall Rating</p>
        <h1>{overallRating.toFixed(1)}</h1>
      </div>

      {/* Rating Distribution */}
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

      {/* Review List */}
      <div className="review-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-card">
            <p className="review-time">{formatTime(review.createdAt)}</p>
            <StarRating rating={review.rating} size={16} />
            <p className="review-comment">{review.review}</p>

            {/* Existing reply */}
            {review.reply && !review.editingReply && (
              <div className="review-reply">
                <strong>Your Reply:</strong> {review.reply}
                <button
                  onClick={() =>
                    setReviews((prev) =>
                      prev.map((r) =>
                        r.id === review.id
                          ? { ...r, editingReply: true, replyInput: r.reply }
                          : r
                      )
                    )
                  }
                >
                  Edit
                </button>
              </div>
            )}

            {/* Reply form (new or editing) */}
            {(!review.reply || review.editingReply) && (
              <div className="reply-form">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={review.replyInput || ""}
                  onChange={(e) =>
                    setReviews((prev) =>
                      prev.map((r) =>
                        r.id === review.id ? { ...r, replyInput: e.target.value } : r
                      )
                    )
                  }
                />
                <button
                  onClick={() => {
                    if (review.replyInput?.trim()) {
                      handleReply(review.id, review.replyInput.trim());
                    }
                  }}
                >
                  {review.reply ? "Update" : "Send"}
                </button>
                {review.editingReply && (
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
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default VendorReviews;
