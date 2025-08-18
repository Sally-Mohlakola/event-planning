import React,{useState} from "react";
import { useNavigate } from "react-router-dom";
import './VendorDashboard.css';
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
  X, Edit,
  Badge
} from "lucide-react";

export default function VendorDashboard(){
     const [isOpen, setIsOpen] = useState(true);

    const navigationItems = [
        {id: 'profile', label: 'Profile', icon: Users},
        {id: 'bookings', label: 'Bookings', icon: Calendar},
        {id: 'floorplan view', label: 'Floorplan View', icon: MapPin},
        {id: 'reviews', label: 'Reviews', icon: Star},
        {id: 'contracts', label: 'Contracts', icon: FileText},
    ]

    const performanceStats = [
        {id: "overall rating", label:'Overall Rating', icon:Star},
        {id: 'total reviews', label:'Total Reviws', icon:Badge}


    ]


return(<section className = 'vendor-page-container'>
            <aside className={`side-bar ${isOpen ? 'open' : 'closed'}`}>
                <section className='vendor-sidebar-header'>
                    {isOpen && (<h2 style={{color:"black"}}>Event Hub</h2>)}
                    <button className='toggle-button'onClick={() => setIsOpen(!isOpen)}>
                        <X/>
                    </button>
                </section>
               
                <nav className='vendor-sidebar-navigation'>
                    
                     {navigationItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <button key={item.id} className={'nav-button'}>
                                <Icon size={16} />
                                {isOpen && <section>{ item.label}</section>}
                            </button>
                        )
                    })}
                </nav>
            </aside>
            <section className='vendor-main'>
                <p>Vendor Portal</p>
                <button>← Back to Home</button>
                <section className = "vendor-dashboard-intro">
                     
                    <h1>Vendor Profile</h1>
                   <br></br>
                    <p>Manage your business profile and services</p>
                    <button className='edit-button'> <Edit size={16} />Edit Profile</button>
                </section>

                

                <section className='vendor-main-content'>
                    <section className='business-card-summary'>
                        <h2>Business Information</h2>
                        <h2>--Business Name Appears Here--</h2>
                        <p id="business-type">Catering</p>
                        <br></br>
                        <p id="business-description">Premium catering services specislising in corporate events, weddings, and gala dinners. We provide international cuisine options with a focus on quality and presentation</p>
                        <br></br>
                        <p id="business-location">--Location here--</p>
                        <p id="business-phone-number">--Phone number here--</p>
                        <p id="business-email">--Email address here--</p>
                        
                    </section>


                    <section className="services-and-billing">
                        <h2>Services & Pricing</h2>
                        <section className='service-cards'>
                        <h4>Corporate Catering</h4>
                        <p><strong>R500-R600 per person</strong></p>
                        <p>Professional service with attention to detail. </p>
                       
                        </section>
                    </section>


                    <section className="Portfolio Gallery">
                    <h2>Portfolio Gallery</h2>
                    {/*Add pictures here*/}

                    </section>

                    <section className="performance-stats">

                    {/*Finish and use "const perfomanceStats" to load this section*/}

                    </section>

                   
            </section>

                   
        </section>
    </section>);




}