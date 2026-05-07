import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";
import { useLocation, Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";

function LoginPage() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Already signed in — send them where they were trying to go
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = () => {
    instance.loginRedirect({
      ...loginRequest,
      // After login, MSAL will redirect back to your app's redirectUri,
      // then AuthGuard sends them to their original destination
      state: from,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>Welcome</h1>
        <p>Sign in with your company account to continue.</p>
        <button onClick={handleLogin}>Sign in with Microsoft</button>
      </div>
    </div>
  );
}

export default LoginPage;
