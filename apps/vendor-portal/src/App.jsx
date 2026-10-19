// src/App.jsx — the portal's pages.
//
//   /sign-in          public
//   /                 work orders (signed in)
//   anything else  →  /
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import PortalLayout from "./layout/PortalLayout";
import SignIn from "./pages/SignIn";
import WorkOrders from "./pages/WorkOrders";

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout />}>
          <Route index element={<WorkOrders />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
