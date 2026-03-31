// Routing
import { Route, Routes } from "react-router-dom";

// Components
import ProtectedLayout from "./components/ProtectedLayout";

// Routes
import routesConfig from "./routes/routeConfig";

// MUI
import { LicenseInfo } from "@mui/x-license";

// Set MUI license key
LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_LICENSE_KEY);

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
