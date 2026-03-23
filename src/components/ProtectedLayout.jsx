import { Outlet, useLocation, useNavigate } from "react-router-dom";

// Components
import PageLayout from "./PageLayout";

function ProtectedLayout({ routesConfig }) {
  // Location
  const location = useLocation();
  const pathname = location.pathname;
  const route = routesConfig.find((r) => pathname.startsWith(r.path));
  const pageTitle = route ? route.title : "Protected Page";

  // Navigation
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logout clicked");
  };

  return (
    <PageLayout
      title={pageTitle}
      user={{ name: "Sarah Carter" }}
      currentPath={location.pathname}
      onNavigate={(path) => navigate(path)}
      onLogout={handleLogout}
    >
      <Outlet />
    </PageLayout>
  );
}

export default ProtectedLayout;
