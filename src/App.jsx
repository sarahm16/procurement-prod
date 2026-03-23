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
    title: "Sites",
    path: "/",
    element: <Sites />,
    icon: <LocationOnIcon />,
  },
  {
    title: "Sites",
    path: "/sites",
    element: <Sites />,
    icon: <LocationOnIcon />,
  },
];

function App() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedLayout />}>
          {routesConfig.map(({ path, element }, index) => (
            <Route key={index} path={path} element={element} />
          ))}
        </Route>
      </Routes>
    </>
  );
}

export default App;
