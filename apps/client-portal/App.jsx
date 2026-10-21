// src/App.jsx — the client portal's pages.
//
//   /sign-in      public
//   /             work orders
//   /sites
//   /equipment
//   /users        client admins only
//   anything else → /
import { Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout, RequireAuth, SignInPage } from "@sarlacc/portal";
import { PORTAL } from "./config";
import EquipmentPage from "./pages/Equipment/EquipmentPage";
import SitesPage from "./pages/Sites/SitesPage";
import UsersPage from "./pages/Users/UsersPage";
import WorkOrdersPage from "./pages/WorkOrders/WorkOrdersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage config={PORTAL} />} />
      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout config={PORTAL} />}>
          <Route index element={<WorkOrdersPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
