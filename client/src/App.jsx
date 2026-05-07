// Routing
import { Route, Routes } from "react-router-dom";

// Local
import ProtectedLayout from "./components/ProtectedLayout";
import AuthGuard from "./components/AuthGuard";
import LoginPage from "./pages/LoginPage";
import routesConfig from "./routes/routeConfig";

// MUI
import { LicenseInfo } from "@mui/x-license";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// Set MUI license key
LicenseInfo.setLicenseKey(import.meta.env.VITE_MUI_LICENSE_KEY);

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route element={<ProtectedLayout routesConfig={routesConfig} />}>
              {routesConfig.map(({ path, element }, index) => (
                <Route key={index} path={path} element={element} />
              ))}
            </Route>
          </Route>
        </Routes>
      </QueryClientProvider>
    </>
  );
}

export default App;
