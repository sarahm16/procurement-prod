import { Outlet, useLocation, useNavigate } from "react-router-dom";

// Components
import PageLayout from "./PageLayout";

function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => {
    console.log("Logout clicked");
  };

  return (
    <PageLayout
      title="Protected Page"
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
