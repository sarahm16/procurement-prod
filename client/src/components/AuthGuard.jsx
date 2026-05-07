import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Navigate, Outlet, useLocation } from "react-router-dom";

function AuthGuard() {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  const location = useLocation();

  // MSAL is still processing a redirect — don't flash the login page
  if (inProgress !== InteractionStatus.None) {
    return null; // or a full-page spinner if you prefer
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
