// @sarlacc/portal · src/auth/RequireAuth.jsx
//
// Wraps every page that needs someone signed in. Signed out → the sign-in
// page, remembering where they were headed so they land there afterwards
// (e.g. a "You've been assigned WO-10482" email link).
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./useAuth.js";

export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (status === "signedOut") {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
