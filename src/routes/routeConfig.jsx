// Route configuration for the application

// Pages
import Sites from "../pages/sites/Sites";
import Clients from "../pages/clients/Clients";
import Vendors from "../pages/vendors/Vendors";
import Workorders from "../pages/workorders/Workorders";
import Dashboard from "../pages/dashboard/Dashboard";

// MUI Icons
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BusinessIcon from "@mui/icons-material/Business";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HandymanIcon from "@mui/icons-material/Handyman";

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
    title: "Client List",
    path: "/clients/:id",
    element: <Clients />,
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
    title: "Site List",
    path: "/sites/:id",
    element: <Sites />,
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
    title: "Vendor List",
    path: "/vendors/:id",
    element: <Vendors />,
    icon: <HandymanIcon />,
    showInLayout: false,
  },
  // Work Order routes
  {
    title: "Work Orders",
    path: "/workorders",
    element: <Workorders />,
    icon: <AssignmentIcon />,
    showInLayout: true,
  },
  {
    title: "Work Orders",
    path: "/workorders/:id",
    element: <Workorders />,
    icon: <AssignmentIcon />,
    showInLayout: false,
  },
];

export default routesConfig;
