import React from "react";
import { Star, StarHalf, StarOff } from "lucide-react";
import "./vendorReviews.css";

const VendorReviews = ({setActivePage}) => {
  // Mock data
  const reviews = [
    {

      id: 1,
    hoursAgo: 5,
      rating: 5,
      comment: "Amazing service! Everything was perfect.",
     
    },
    {
      id: 2,
      hoursAgo: 28,
      rating: 4,
      comment: "Very professional and punctual.",
      
    },
    {
      id: 3,
       hoursAgo: 50,
      rating: 3,
      comment: "Good, but some minor issues with timing.",
     
    },
    {
      id: 4,
    hoursAgo: 100,
      rating: 2,
      comment: "Not satisfied with the food presentation.",
     
    },
  ];

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
      if (i <= Math.floor(rating)) stars.push(<Star key={i} size={16} color="#fbbf24" />);
      else if (i - rating < 1) stars.push(<StarHalf key={i} size={16} color="#fbbf24" />);
      else stars.push(<StarOff key={i} size={16} color="#fbbf24" />);
    }
    return stars;
  };

  const formatTime = (hoursAgo) =>
    hoursAgo < 24 ? `${hoursAgo} hours ago` : `${Math.floor(hoursAgo / 24)} days ago`;

  return (
    <section className="vendor-reviews-page">
      <section className="review-page-title">
        <h2>Vendor Review</h2>
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
            <p className="review-comment">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VendorReviews;
