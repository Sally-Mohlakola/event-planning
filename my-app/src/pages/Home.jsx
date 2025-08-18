import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    
    const navigate = new useNavigate();

    const navPlannerDashboard=()=>{
        navigate("/planner-dashboard");
    }

    const navVendorDashboard=()=>{
        navigate("/vendor-dashboard");
    }

    return (
        <section style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Yayy sign in works </h1>
            <button onClick={navPlannerDashboard}>Planner Dashboard</button>
            <button onClick={navVendorDashboard}>Vendor Dashboard</button>
        </section>
    );
}
