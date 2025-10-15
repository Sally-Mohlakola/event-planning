// src/vendor/VendorReviews.jsx
import React, { useState, useEffect, useCallback } from "react";
import { auth } from "../../firebase";
import { Star, StarHalf, ChevronDown } from "lucide-react";
import { getAuth } from "firebase/auth";
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
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendorId, setVendorId] = useState(null);
  const [sortOption, setSortOption] = useState("newest");

  // Convert Firebase timestamps (same as VendorDashboard)
  const convertFirebaseTimestamp = useCallback((timestamp) => {
    if (!timestamp) return "Recently";
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === "function") date = timestamp.toDate();
      else if (timestamp._seconds && timestamp._nanoseconds)
        date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
      else if (timestamp.seconds && timestamp.nanoseconds)
        date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      else if (typeof timestamp === "string") date = new Date(timestamp);
      else if (typeof timestamp === "number") date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
      else return "Recently";

      if (isNaN(date.getTime())) return "Recently";

      const now = new Date();
      const diffInMs = now - date;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
      if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? "s" : ""} ago`;
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  }, []);

  // Get actual date for sorting
  const getReviewDate = useCallback((review) => {
    const timestamp = review.timeOfReview || review.createdAt || review.date;
    if (!timestamp) return new Date(0);
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === "function") return timestamp.toDate();
      else if (timestamp._seconds && timestamp._nanoseconds)
        return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
      else if (timestamp.seconds && timestamp.nanoseconds)
        return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      else if (typeof timestamp === "string") return new Date(timestamp);
      else if (typeof timestamp === "number") return timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
      else return new Date(0);
    } catch {
      return new Date(0);
    }
  }, []);

  // Get vendor ID
  useEffect(() => {
    if (auth.currentUser) setVendorId(auth.currentUser.uid);
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!vendorId) return;
      setLoading(true);
      try {
        const auth = getAuth();
        let user = auth.currentUser;
        while (!user) await new Promise((res) => setTimeout(res, 50)) && (user = auth.currentUser);
        const token = await user.getIdToken();

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch reviews");

        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [vendorId]);

  // Sort reviews when sortOption or reviews change
  useEffect(() => {
    if (!reviews.length) {
      setFilteredReviews([]);
      return;
    }

    const sortedReviews = [...reviews].sort((a, b) => {
      const dateA = getReviewDate(a);
      const dateB = getReviewDate(b);
      
      switch (sortOption) {
        case "newest":
          return dateB - dateA; // Most recent first
        case "oldest":
          return dateA - dateB; // Oldest first
        case "most-critical":
          return a.rating - b.rating; // Lowest ratings first
        case "most-praiseworthy":
          return b.rating - a.rating; // Highest ratings first
        default:
          return dateB - dateA;
      }
    });
    
    setFilteredReviews(sortedReviews);
  }, [reviews, sortOption, getReviewDate]);

  // Handle reply creation/edit
  const handleReply = async (reviewId, replyText) => {
    if (!replyText?.trim()) return alert("Reply text is required");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(
        `https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}/reviews/${reviewId}/reply`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ reply: replyText }) }
      );
      if (!res.ok) throw new Error("Failed to update reply");

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: replyText, replyInput: "", editingReply: false } : r))
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // Delete reply
  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this reply?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/analytics/${vendorId}/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply: "_blank_" }),
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: "_blank_", editingReply: false, replyInput: "" } : r))
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Loading your reviews...</p></div>;
  if (error) return <p className="error">{error}</p>;
  if (!reviews.length) return <p>No reviews found.</p>;

  const overallRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  const totalReviews = reviews.length;

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const rating = Math.floor(r.rating || 0);
    if (rating >= 1 && rating <= 5) ratingDistribution[rating]++;
  });

  return (
    <section className="vendor-reviews-page">
      <div className="review-page-title">
        <h2>Vendor Reviews</h2>
        <p>Review, analyze, and respond to reviews about your services.</p>
      </div>

      {/* Sorting Dropdown */}
      <div className="reviews-sort-controls">
        <div className="sort-dropdown">
          <label htmlFor="sort-select">Sort by:</label>
          <div className="select-wrapper">
            <select 
              id="sort-select"
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most-critical">Most Critical</option>
              <option value="most-praiseworthy">Most Praiseworthy</option>
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </div>
      </div>

      <div className="overall-rating">
        <p>Overall Rating</p>
        <h1>{overallRating.toFixed(1)}</h1>
        <p className="total-reviews">{totalReviews} review(s)</p>
      </div>

      <div className="rating-distribution">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingDistribution[rating];
          const percentage = (count / totalReviews) * 100;
          return (
            <div key={rating} className="distribution-item">
              <div className="distribution-stars">
                <span className="distribution-rating">{rating}</span>
                <Star size={16} color="#fbbf24" />
              </div>
              <div className="distribution-progress">
                <div className="distribution-progress-bar" style={{ width: `${percentage}%` }}></div>
              </div>
              <span className="distribution-count">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="review-list">
        {filteredReviews.map((review) => {
          const isBlank = review.reply === "_blank_";
          const reviewDate = review.timeOfReview || review.createdAt || review.date;

          return (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <p className="review-time">{convertFirebaseTimestamp(reviewDate)}</p>
                <StarRating rating={review.rating} />
              </div>

              <p className="review-comment">{review.review}</p>

              {/* Display existing reply */}
              {review.reply && !review.editingReply && !isBlank && (
                <div className="review-replies">
                  <div className="reply">
                    <span className="reply-author">Your Reply:</span>
                    <p className="reply-text">{review.reply}</p>
                    <div className="review-reply-actions">
                      <button onClick={() => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, editingReply: true, replyInput: r.reply } : r))}>Edit</button>
                      <button onClick={() => handleDeleteReply(review.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reply form */}
              {(review.editingReply || !review.reply || isBlank) && (
                <div className="reply-form">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={review.replyInput || ""}
                    onChange={(e) =>
                      setReviews((prev) =>
                        prev.map((r) =>
                          r.id === review.id
                            ? { ...r, replyInput: e.target.value, editingReply: true, reply: r.reply === "_blank_" ? null : r.reply }
                            : r
                        )
                      )
                    }
                  />
                  <div className="review-reply-actions">
                    <button onClick={() => handleReply(review.id, review.replyInput)} disabled={!review.replyInput?.trim()}>Send</button>
                    <button onClick={() => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, editingReply: false, replyInput: "" } : r))}>Cancel</button>
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