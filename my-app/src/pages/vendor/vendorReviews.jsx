// src/vendor/VendorReviews.jsx
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

const VendorReviews = ({ setActivePage }) => {
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

  if (loading) return <p>Loading reviews...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!reviews.length) return <p>No reviews found.</p>;

  // Overall rating
  const overallRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Progress bars
  const totalReviews = reviews.length;
  const ratingCounts = {
    excellent: reviews.filter((r) => r.rating >= 4.5).length,
    good: reviews.filter((r) => r.rating >= 3.5 && r.rating < 4.5).length,
    average: reviews.filter((r) => r.rating >= 2.5 && r.rating < 3.5).length,
    poor: reviews.filter((r) => r.rating < 2.5).length,
  };

  // Format time
  const formatTime = (timestamp) => {
    const now = new Date();
    const reviewDate = new Date(timestamp);
    const diffMs = now - reviewDate; // subtract to get positive difference
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
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

      {/* Review Tiles */}
      <div className="review-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-card">
            <p className="review-time">{formatTime(review.createdAt)}</p>
            <div className="review-stars">
              <StarRating rating={review.rating} size={16} />
            </div>
            <p className="review-comment" style={{ color: "black" }}>
              {review.review}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VendorReviews;
