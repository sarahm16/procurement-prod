// Route configuration for the application

// Pages
import Sites from "../pages/sites/Sites";
import Clients from "../pages/clients/Clients";
import Vendors from "../pages/vendors/Vendors";
import Workorders from "../pages/workorders/Workorders";
import Dashboard from "../pages/dashboard/Dashboard";
import Admin from "../pages/admin/Admin";

// Detail Pages
import ClientDetail from "../pages/client-detail/ClientDetail";
import SiteDetail from "../pages/site-detail/SiteDetail";
import VendorDetail from "../pages/vendor-detail/NewVendorDetail";
import WorkorderDetail from "../pages/workorder-detail/WorkOrderDetail";

// MUI Icons
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BusinessIcon from "@mui/icons-material/Business";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HandymanIcon from "@mui/icons-material/Handyman";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

// Define routes
const routesConfig = [
  {
    title: "Dashboard",
    path: "/",
    element: <Dashboard />,
    icon: <DashboardIcon />,
    showInLayout: false,
  },
  {
    title: "Dashboard",
    path: "/dashboard",
    element: <Dashboard />,
    icon: <DashboardIcon />,
    showInLayout: true,
  },
  // Client routes
  {
    title: "Client List",
    path: "/clients",
    element: <Clients />,
    icon: <BusinessIcon />,
    showInLayout: true,
  },
  {
    title: "Client Detail",
    path: "/clients/:id",
    element: <ClientDetail />,
    icon: <BusinessIcon />,
    showInLayout: false,
  },
  // Site routes
  {
    title: "Site List",
    path: "/sites",
    element: <Sites />,
    icon: <LocationOnIcon />,
    showInLayout: true,
  },
  {
    title: "Site Detail",
    path: "/sites/:id",
    element: <SiteDetail />,
    icon: <LocationOnIcon />,
    showInLayout: false,
  },
  // Vendor routes
  {
    title: "Vendor List",
    path: "/vendors",
    element: <Vendors />,
    icon: <HandymanIcon />,
    showInLayout: true,
  },
  {
    title: "Vendor Detail",
    path: "/vendors/:id",
    element: <VendorDetail />,
    icon: <HandymanIcon />,
    showInLayout: false,
  },
  // Work Order routes
  {
    title: "Work Order List",
    path: "/workorders",
    element: <Workorders />,
    icon: <AssignmentIcon />,
    showInLayout: true,
  },
  {
    title: "Work Order Detail",
    path: "/workorders/:id",
    element: <WorkorderDetail />,
    icon: <AssignmentIcon />,
    showInLayout: false,
  },
  {
    title: "Admin",
    path: "/admin",
    element: <Admin />,
    icon: <AdminPanelSettingsIcon />,
    showInLayout: true,
  },
];

export default routesConfig;
