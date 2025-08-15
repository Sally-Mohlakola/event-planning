import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

//login page
import Login from "./pages/Login";


// Planner Pages
import Dashboard from "./pages/planner/Dashboard";
import EventEditor from "./pages/planner/EventEditor";
import FloorplanEditor from "./pages/planner/FloorplanEditor";
import VendorMarketplace from "./pages/planner/VendorMarketplace";
import GuestListManager from "./pages/planner/GuestListManager";
import RSVPTracker from "./pages/planner/RSVPTracker";
import AgendaManager from "./pages/planner/AgendaManager";
import ReportsFeedback from "./pages/planner/ReportsFeedback";

// Vendor Pages
import VendorProfile from "./pages/vendor/VendorProfile";
import VendorBookings from "./pages/vendor/VendorBookings";
import VendorFloorplan from "./pages/vendor/VendorFloorplan";
import VendorReviews from "./pages/vendor/VendorReviews";
import VendorContracts from "./pages/vendor/VendorContracts";

// Admin Pages
import AdminVerification from "./pages/admin/AdminVerification";
import AdminVendorDetails from "./pages/admin/AdminVendorDetails";
import AdminReports from "./pages/admin/AdminReports";
import AdminUserManagement from "./pages/admin/AdminUserManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} /> 
    

          <Route path="/login" element={<Login />} /> {/*
          
          {/* Planner Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<EventEditor />} />
          <Route path="/floorplan" element={<FloorplanEditor />} />
          <Route path="/vendors" element={<VendorMarketplace />} />
          <Route path="/guests" element={<GuestListManager />} />
          <Route path="/rsvp" element={<RSVPTracker />} />
          <Route path="/agenda" element={<AgendaManager />} />
          <Route path="/reports" element={<ReportsFeedback />} />

          {/* Vendor Routes */}
          <Route path="/vendor/profile" element={<VendorProfile />} />
          <Route path="/vendor/bookings" element={<VendorBookings />} />
          <Route path="/vendor/floorplan" element={<VendorFloorplan />} />
          <Route path="/vendor/reviews" element={<VendorReviews />} />
          <Route path="/vendor/contracts" element={<VendorContracts />} />

          {/* Admin Routes */}
          <Route path="/admin/verification" element={<AdminVerification />} />
          <Route path="/admin/vendors" element={<AdminVendorDetails />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/users" element={<AdminUserManagement />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
