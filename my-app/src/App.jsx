
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import PlannerDashboard from './pages/planner/PlannerDashboard.jsx';

import './App.css'
import VendorDashboard from './pages/vendor/VendorDashboard.jsx';

function App() {
  
  return (
    <Router>
      <Routes>
        <Route path='/signup' element={<Signup />} />
        <Route path='/' element={<Login />} />
        <Route path='/login' element={<Login />} />
        <Route path='/home' element={<Home />} />
        <Route path='/planner-dashboard' element={<PlannerDashboard />} />
        <Route path='/vendor-dashboard' element={<VendorDashboard />}/>
      </Routes>
    </Router>
  )
}

export default App;
