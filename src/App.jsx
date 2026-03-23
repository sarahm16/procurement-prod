// Routing
import { Route, Routes } from "react-router-dom";

// Components
import ProtectedLayout from "./components/ProtectedLayout";

// Routes
import Sites from "./pages/sites/Sites";
import Clients from "./pages/clients/Clients";
import Vendors from "./pages/vendors/Vendors";
import Workorders from "./pages/workorders/Workorders";
import Dashboard from "./pages/dashboard/Dashboard";

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
  },
  {
    title: "Dashboard",
    path: "/dashboard",
    element: <Dashboard />,
    icon: <DashboardIcon />,
  },
  {
    title: "Client List",
    path: "/clients",
    element: <Clients />,
    icon: <BusinessIcon />,
  },

  {
    title: "Site List",
    path: "/sites",
    element: <Sites />,
    icon: <LocationOnIcon />,
  },
  {
    title: "Vendor List",
    path: "/vendors",
    element: <Vendors />,
    icon: <HandymanIcon />,
  },
  {
    title: "Work Orders",
    path: "/workorders",
    element: <Workorders />,
    icon: <AssignmentIcon />,
  },
];

function App() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedLayout routesConfig={routesConfig} />}>
          {routesConfig.map(({ path, element }, index) => (
            <Route key={index} path={path} element={element} />
          ))}
        </Route>
      </Routes>
    </>
  );
}

export default App;
