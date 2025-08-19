import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './Admin.css';
import Header from './Header';
import Sidebar from './Sidebar';
import AdminHome from './AdminHome';
import PlannerManagement from './PlannerManagement';
import VendorManagement from './VendorManagement';
import EventManagement from './EventManagement';
import Reports from './Reports';

function Admin() {
  const [openSidebarToggle, setOpenSidebarToggle] = useState(false);

  const OpenSidebar = () => {
    setOpenSidebarToggle(!openSidebarToggle);
  };

  return (
      <div className='grid-container'>
        <Header OpenSidebar={OpenSidebar}/>
        <Sidebar openSidebarToggle={openSidebarToggle} OpenSidebar={OpenSidebar}/>
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/admin-home" element={<AdminHome />} />
          <Route path="/planner-management" element={<PlannerManagement />} />
          <Route path="/vendor-management" element={<VendorManagement />} />
          <Route path="/event-management" element={<EventManagement />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
  );
}

export default Admin;