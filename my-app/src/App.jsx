import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

//main pages imports
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import LandingPage from "./pages/LandingPage.jsx";

//planner pages imports
import PlannerApp from "./pages/planner/PlannerApp.jsx";
import PlannerDashboard from "./pages/planner/PlannerDashboard.jsx";
import PlannerContract from "./pages/planner/PlannerContract.jsx";
import NewEvent from "./pages/planner/NewEvent.jsx";

//vendor pages imports
import PlannerManagement from "./pages/admin/PlannerManagement.jsx";
import VendorProfile from "./pages/vendor/vendorProfile.jsx";
import VendorApply from "./pages/vendor/vendorApply.jsx";
import VendorWaiting from "./pages/vendor/VendorWaiting.jsx";
import VendorApp from "./pages/vendor/vendorApp.jsx";

//admin pagse imports
import Admin from "./pages/admin/Admin.jsx";
import AdminGate from "./pages/admin/AdminGate";
import EventManagement from "./pages/admin/EventManagement.jsx";
import VendorManagement from "./pages/admin/VendorManagement.jsx";
import VendorProfileEdit from "./pages/vendor/vendorProfileEdit.jsx";
import Reports from "./pages/admin/Reports.jsx";
import VendorApplications from "./pages/admin/VendorApplications";
import AdminCreateProfile from "./pages/admin/AdminCreateProfile";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminProfileEdit from "./pages/admin/AdminProfileEdit.jsx";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/signup" element={<Signup />} />
				<Route path="/login" element={<Login />} />

				<Route path="/home" element={<Home />} />

				<Route path="/planner-dashboard" element={<PlannerApp />} />
				<Route
					path="/planner-dashboard"
					element={<PlannerDashboard />}
				/>
				<Route path="/planner/new-event" element={<NewEvent />} />

				<Route path="/vendor-app" element={<VendorApp />} />
				<Route
					path="/vendor/vendor-dashboard"
					element={<VendorProfile />}
				/>
				<Route
					path="/vendor/vendor-edit-profile"
					element={<VendorProfileEdit />}
				/>
				<Route
					path="/vendor/vendor-profile"
					element={<VendorProfile />}
				/>
				<Route path="/vendor/vendor-apply" element={<VendorApply />} />

				<Route path="/planner/new-event" element={<NewEvent />} />
				<Route path="/vendor/waiting" element={<VendorWaiting />} />
				<Route
					path="/planner/contracts"
					element={<PlannerContract />}
				/>

				{/*Admin Routes*/}
				<Route path="/admin" element={<AdminGate />} />
				<Route path="/admin/*" element={<Admin />} />
				<Route
					path="/admin-create-profile"
					element={<AdminCreateProfile />}
				/>
				<Route path="/admin/my-profile" element={<AdminProfile />} />
				<Route
					path="/admin-edit-profile"
					element={<AdminProfileEdit />}
				/>

				<Route
					path="/admin/planner-management"
					element={<PlannerManagement />}
				/>
				<Route
					path="/admin/event-management"
					element={<EventManagement />}
				/>
				<Route
					path="/admin/vendor-management"
					element={<VendorManagement />}
				/>
				<Route path="/admin/reports" element={<Reports />} />
				<Route
					path="/admin/vendor-applications"
					element={<VendorApplications />}
				/>
			</Routes>
		</Router>
	);
}

export default App;
