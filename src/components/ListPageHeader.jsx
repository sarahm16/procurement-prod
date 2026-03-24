import { useLocation } from "react-router-dom";

// Routes Config
import routesConfig from "../routes/routeConfig";

// MUI imports
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

function ListPageHeader() {
  const location = useLocation();
  const pathname = location.pathname;

  const route = routesConfig.find((r) => pathname === r.path);
  const icon = route ? route.icon : null;
  const title = route ? route.title : "Page Title";

  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
      {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
    </Box>
  );
}

export default ListPageHeader;
