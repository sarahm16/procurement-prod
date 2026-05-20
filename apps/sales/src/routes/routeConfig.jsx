// Route configuration for the application

// List Pages
import BidsPage from "../pages/bids/BidsPage";

// MUI Icons
import AssignmentIcon from "@mui/icons-material/Assignment";

// Define routes
const routesConfig = [
  {
    title: "Bids",
    path: "/",
    element: <BidsPage />,
    icon: <AssignmentIcon />,
    showInLayout: true,
  },
  {
    title: "Bids",
    path: "/bids",
    element: <BidsPage />,
    icon: <AssignmentIcon />,
    showInLayout: true,
  },
];

export default routesConfig;
