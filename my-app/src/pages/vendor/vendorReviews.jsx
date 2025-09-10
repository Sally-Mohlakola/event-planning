// src/vendor/VendorReviews.jsx
import React, { useState, useEffect } from "react";
import { Star, StarHalf, StarOff } from "lucide-react";
import { auth } from "../../firebase"; // Ensure firebase is imported
import "./vendorReviews.css";

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
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch reviews");

        const data = await res.json();
        setAnalytics(data); // vendor analytics info
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

  // Overall rating calculation
  const overallRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Progress bars calculation
  const totalReviews = reviews.length;
  const ratingCounts = {
    excellent: reviews.filter((r) => r.rating >= 4.5).length,
    good: reviews.filter((r) => r.rating >= 3.5 && r.rating < 4.5).length,
    average: reviews.filter((r) => r.rating >= 2.5 && r.rating < 3.5).length,
    poor: reviews.filter((r) => r.rating < 2.5).length,
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating))
        stars.push(<Star key={i} size={16} color="#fbbf24" />);
      else if (i - rating < 1)
        stars.push(<StarHalf key={i} size={16} color="#fbbf24" />);
      else stars.push(<StarOff key={i} size={16} color="#fbbf24" />);
    }
    return stars;
  };

  const formatTime = (hoursAgo) =>
    hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`;

  return (
    <section className="vendor-reviews-page">
      <section className="review-page-title">
        <h2>Vendor Reviews</h2>
        <p>Review, analyse and respond to reviews about your services.</p>
      </section>

      {/* Overall Rating */}
      <div className="overall-rating">
        <p>Overall Rating</p>
        <h1>{overallRating.toFixed(1)}</h1>
      </div>

      {/* Rating Distribution */}
      <div className="rating-bars">
        <div className="rating-bar">
          <span className="rating-label">Excellent</span>
          <div className="rating-progress">
            <div
              className="rating-progress-fill rating-excellent"
              style={{ width: `${(ratingCounts.excellent / totalReviews) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="rating-bar">
          <span className="rating-label">Good</span>
          <div className="rating-progress">
            <div
              className="rating-progress-fill rating-good"
              style={{ width: `${(ratingCounts.good / totalReviews) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="rating-bar">
          <span className="rating-label">Average</span>
          <div className="rating-progress">
            <div
              className="rating-progress-fill rating-average"
              style={{ width: `${(ratingCounts.average / totalReviews) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="rating-bar">
          <span className="rating-label">Poor</span>
          <div className="rating-progress">
            <div
              className="rating-progress-fill rating-poor"
              style={{ width: `${(ratingCounts.poor / totalReviews) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Review Tiles */}
      <div className="review-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-card">
            <p className="review-time">{formatTime(review.hoursAgo)}</p>
            <div className="review-stars">{renderStars(review.rating)}</div>
            <p className="review-comment" style={{color:"black"}}>{review.review}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VendorReviews;
