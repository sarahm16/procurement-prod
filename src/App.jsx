// Routing
import { Route, Routes } from "react-router-dom";

// Components
import ProtectedLayout from "./components/ProtectedLayout";

// Routes
import Sites from "./pages/sites/Sites";

// MUI Icons
import LocationOnIcon from "@mui/icons-material/LocationOn";

// Define routes
const routesConfig = [
  {
    title: "Site List",
    path: "/",
    element: <Sites />,
    icon: <LocationOnIcon />,
  },
  {
    title: "Site List",
    path: "/sites",
    element: <Sites />,
    icon: <LocationOnIcon />,
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
