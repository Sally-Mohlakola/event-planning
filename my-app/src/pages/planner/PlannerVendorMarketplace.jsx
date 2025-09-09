import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';

import "./PlannerVendorMarketplace.css";

function VendorCard({vendor}){
    return(
        <section className="vendor-card">
            <img src={vendor.profilePic} alt={vendor.businessName} className="vendor-image"/>
            <h3>{vendor.name}</h3>
            <section className="vendor-info">
                <p className="vendor-category">{vendor.category}</p>
                <section className="rating-location">
                    <p className="vendor-rating">{vendor.rating}</p>
                    <p className="vendor-location">{vendor.location}</p>
                </section>
            </section>
            <section className="vendor-buttons">
                <button className="add-btn">Add Vendor</button>
                <button className="view-btn">View More</button>
            </section>
        </section>
    );
}

export default function PlannerVendorMarketplace({event, plannerId, setActivePage}){
    const [showAllEvents, setShowAllEvents] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [vendors, setVendors] = useState([]);

    const fetchSortedVendors = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`http://127.0.0.1:5001/planit-sdp/us-central1/api/planner/events/${event.id}/bestvendors`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if(!res.ok) return [];

        const data = await res.json();
        return data.vendors || [];
    }

    useEffect(() => {
        async function loadVendors(){
            const vendors = await fetchSortedVendors();
                        console.log(vendors);
            setVendors(vendors);

        }
        loadVendors();
    }, [])

    const filteredVendors = vendors.filter(v => 
        (v.businessName.toLowerCase().includes(search.toLowerCase()) || v.category.toLowerCase().includes(search.toLowerCase())) &&
        (categoryFilter === "All" || v.category === categoryFilter)
    );

    return(
        <section className="vendormarketplace">
            <section className="vendormarketplace-header">
                <h2>Vendor Marketplace</h2>
                <p className="marketplace-subtitle">Discover and connect with top-rated event vendors</p>
            </section>

            <section className="toggle">
                <button className={`toggle-btn ${showAllEvents ? "active" : ""}`} onClick={() => setShowAllEvents(true)}>
                    All Events
                </button>
                <button className={`toggle-btn ${!showAllEvents ? "active" : ""}`} onClick={() => setShowAllEvents(false)}>
                    Event Specific
                </button>
            </section>

            <section className="filters">
                <input type="text" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)}className="search-bar"/>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
                    <option value="All">All Categories</option>
                    <option value="Catering">Catering</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Decor">Decor</option>
                    <option value="Photography">Photography</option>
                </select>
            </section>

            <section className="vendor-grid">
                {filteredVendors.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor}/>
                ))}
            </section>
        </section>
    );
}

