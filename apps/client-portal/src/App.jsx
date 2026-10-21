// src/App.jsx — the portal's pages.
//
//   /sign-in          public
//   /                 work orders (signed in)
//   anything else  →  /
import { Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout, RequireAuth, SignInPage } from "./portal";
import { PORTAL } from "./portalConfig";
import WorkOrders from "./pages/WorkOrders";

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage config={PORTAL} />} />
      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout config={PORTAL} />}>
          <Route index element={<WorkOrders />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
