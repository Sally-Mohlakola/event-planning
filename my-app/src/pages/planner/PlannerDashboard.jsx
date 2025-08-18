import React, { useState } from 'react';
import './PlannerDashboard.css';
import { 
  Calendar, 
  Users, 
  PanelLeft, 
  BarChart3, 
  MapPin, 
  MessageSquare, 
  FileText,
  Star,
  Menu,
  X
} from "lucide-react";


export default function PlannerDashboard(){
    const [isOpen, setIsOpen] = useState(true);

    const navigationItems = [
        {id: 'dashboard', label: 'Dashboard', icon: BarChart3},
        {id: 'events', label: 'Events', icon: Calendar},
        {id: 'vendor', label: 'Vendor Marketplace', icon: Users},
        {id: 'guest management', label: 'Guest Management', icon: Users},
        {id: 'floorplan', label: 'Floorplan', icon: MapPin},
        {id: 'reports', label: 'Reports', icon: FileText},
    ]

    return(
        <section className = 'page-container'>
            <aside className={`side-bar ${isOpen ? 'open' : 'closed'}`}>
                <section className='sidebar-header'>
                    {isOpen && (<h2>PlanIT</h2>)}
                    <button className='toggle-button'onClick={() => setIsOpen(!isOpen)}>
                        <X/>
                    </button>
                </section>
                
                <nav className='sidebar-navigation'>
                     {navigationItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <button key={item.id} className={'nav-button'}>
                                <Icon size={16} />
                                {isOpen && <section>{item.label}</section>}
                            </button>
                        )
                    })}
                </nav>
            </aside>
            <section className='main'>
                <section className = "dashboard-intro">
                    <section>
                        <h2>Planner Dashboard</h2>
                        <p>Welcome back, here's what's happening with your events</p>
                    </section>

                    <button className='page-button'>+ New Event</button>
                </section>

                <section className="summary-cards-section">
                    <section className='summary-card'><p>Guest RSVPs</p></section>
                    <section className='summary-card'><p>Active Events</p></section>
                    <section className='summary-card'><p>Confirmed Vendors</p></section>
                    <section className='summary-card'><p>Total Guests</p></section>                 
                </section>

                <section className='main-content'>
                    <section className='upcoming-events'>
                        <h2>Upcoming Events</h2>
                    </section>
                    <section className='quick-actions'>
                        <button className='page-button'> + Create Event</button>
                        <button className='page-button'>Browse Vendors</button>
                        <button className='page-button'>Manage Guests</button>
                        <button className='page-button'> All Events </button>
                        <button className='page-button'>All Vendors</button>
                    </section>
                </section>

                   
            </section>
        </section>
    );
}