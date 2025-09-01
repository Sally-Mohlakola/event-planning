// src/pages/vendor/vendorApply.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import "./vendorApply.css";

export default function VendorApply() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");

  if (!auth.currentUser) {
    setError("You must be logged in to apply");
    return;
  }

  try {
    const token = await auth.currentUser.getIdToken();

    const formData = new FormData();
    formData.append("businessName", businessName);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("address", address || "None");
    if (profilePic) formData.append("profilePic", profilePic);

    const res = await fetch("https://us-central1-planit-sdp.cloudfunctions.net/api/vendor/apply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to submit");

    setSuccess("Application submitted successfully!");
    navigate("/vendor-app");
    console.log("Navigating now...");
    
  } catch (err) {
    console.error(err);
    setError(err.message);
  }
};

  return (
    <main className="vendor-apply-page">
      <section className="vendor-apply-card">
        <h1>Apply as a Vendor</h1>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <form onSubmit={handleSubmit} className="vendor-apply-form">
          <label>
            Business Name
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </label>

          <label>
            Phone Number
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </label>

          <label>
            Category
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </label>

          <label>
            Address (optional)
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <label>
            Profile Picture
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePic(e.target.files[0])}
            />
          </label>

          <button type="submit" className="btn primary">
            Submit Application
          </button>
        </form>
      </section>
    </main>
  );
}
