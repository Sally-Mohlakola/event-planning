import React from 'react'
import
{BsFillHouseDoorFill, BsClipboard2Check, BsCart4, BsCalendar2DateFill, BsBarChartFill}
 from 'react-icons/bs'
import { Link } from 'react-router-dom';

function Sidebar({openSidebarToggle, OpenSidebar}) {
  return (
    <aside id="sidebar" className={openSidebarToggle ? "sidebar-responsive": ""}>
        <div className='sidebar-title'>
            <span className='icon close_icon' onClick={OpenSidebar}>X</span>
        </div>

        <ul className='sidebar-list'>
            <li className='sidebar-list-item'>
               <Link to="/admin-home">
                    <BsFillHouseDoorFill className='icon'/> Home
                </Link>
            </li>
            <li className='sidebar-list-item'>
                <Link to="planner-management">
                    <BsClipboard2Check className='icon'/> Planner Management
                </Link>
            </li>
            <li className='sidebar-list-item'>
                <Link to="vendor-management">
                    <BsCart4 className='icon'/> Vendor Management 
                </Link>
            </li>
            <li className='sidebar-list-item'>
                <Link to="event-management">
                    <BsCalendar2DateFill className='icon'/> Event Management
                </Link>
            </li>
            <li className='sidebar-list-item'>
                <Link to="reports">
                    <BsBarChartFill className='icon'/> Detailed reports & analytics
                </Link>
            </li>
        </ul>
    </aside>
  )
}

export default Sidebar
