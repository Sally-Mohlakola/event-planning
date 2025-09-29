import { auth } from "../../../firebase";
import "./AdminVendorManagement.css";
import AdminVendorApplications from "./AdminVendorApplications.jsx";
import AdminAllVendorProfiles from "./AdminAllVendorProfiles.jsx";

function AdminVendorManagement() {
	return (
		<sections className="main-container vendor-management-page">
			<h1>Pending Vendor Applications</h1>
			<AdminVendorApplications />
			<h1>All approved vendors</h1>
			<AdminAllVendorProfiles />
		</sections>
	);
}

export default AdminVendorManagement;
