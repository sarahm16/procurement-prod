// src/App.jsx — the vendor portal's pages.
//
//   /sign-in      public
//   /             work orders
//   /documents
//   /team         vendor admins only
//   anything else → /
import { Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout, RequireAuth, SignInPage } from "@sarlacc/portal";
import { PORTAL } from "./config";
import DocumentsPage from "./pages/Documents/DocumentsPage";
import TeamPage from "./pages/Team/TeamPage";
import WorkOrdersPage from "./pages/WorkOrders/WorkOrdersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage config={PORTAL} />} />
      <Route element={<RequireAuth />}>
        <Route element={<PortalLayout config={PORTAL} />}>
          <Route index element={<WorkOrdersPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="team" element={<TeamPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
