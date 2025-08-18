import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChefHat } from 'lucide-react'; // icons
import './Home.css'; // scoped styles

export default function Home() {
  const navigate = useNavigate();

  const navPlannerDashboard = () => {
    navigate("/planner-dashboard");
  }

  const navVendorDashboard = () => {
    navigate("/vendor-app");
  }

  const navLogout=()=>{
    navigate("/");
  }

  return (
<section className="home-page">
        <button id="logout" onClick={navLogout}>Logout</button>
      <h1>Welcome to Event Hub</h1>
      <h4>The complete platform for event planning, vendor management, and seamless execution</h4>

      <section className="choose-experience">
        <h1>Choose your experience</h1>
        <p>Access the resources you need to get you there.</p>

        {/* Event Manager Tile */}
        <section className="role-tile center-tile">
          <div className="icon-circle">
            <Calendar size={40} color="white" />
          </div>
          <h2>Event Manager</h2>
          <ul>
            <li>Event creation & management</li>
            <li>Guest list management</li>
            <li>Vendor marketplace access</li>
          </ul>
          <button onClick={navPlannerDashboard}>Enter Event Dashboard</button>
        </section>

        {/* Vendor Tile */}
        <section className="role-tile center-tile">
          <div className="icon-circle">
            <ChefHat size={40} color="white" />
          </div>
          <h2>Vendor</h2>
          <ul>
            <li>Business profile management</li>
            <li>Booking calendar</li>
            <li>Ratings & reviews</li>
          </ul>
          <button onClick={navVendorDashboard}>Enter Vendor Dashboard</button>
        </section>
      </section>

      <section className="trusted-section">
        <h1>Trusted by Event Professionals</h1>
        <p>Join hundreds of successful events planned on our platform</p>
      </section>
</section>

  );
}
