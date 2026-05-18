import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

import PageLayout from "./PageLayout";

function ProtectedLayout({ routesConfig }) {
  const location = useLocation();
  const pathname = location.pathname;
  const route = routesConfig.find(
    (r) => pathname.startsWith(r.path) && r.path !== "/",
  );
  const pageTitle = route ? route.title : "Protected Page";

  const navigate = useNavigate();
  const { instance, accounts } = useMsal();

  // accounts[0] is the active account after login
  const account = accounts[0];
  const user = account
    ? {
        name: account.name, // "Sarah Carter"
        email: account.username, // sarah.carter@company.com
        oid: account.localAccountId, // stable unique ID — use this as your DB key
      }
    : null;

  const handleLogout = () => {
    instance.logoutRedirect({ account });
  };

  return (
    <PageLayout
      title={pageTitle}
      user={user}
      currentPath={location.pathname}
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    >
      <Outlet />
    </PageLayout>
  );
}

export default ProtectedLayout;
