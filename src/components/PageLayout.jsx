import { useState } from "react";
import { useColorMode } from "../theme/ThemeProvider";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Avatar,
  useTheme,
  useMediaQuery,
} from "@mui/material";

// Icons — swap these for your actual nav icons
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";

// Nav Items
import routesConfig from "../routes/routeConfig";
const NAV_ITEMS = routesConfig.filter((route) => route.showInLayout);

const DRAWER_WIDTH = 240;

export default function PageLayout({
  children,
  title,
  onLogout,
  user,
  currentPath,
  onNavigate,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, toggleColorMode } = useColorMode();

  const isLight = mode === "light";

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  const route = routesConfig.find(
    (r) => currentPath?.startsWith(r.path) && r.path !== "/",
  );
  const icon = route ? route.icon : null;

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo / App Name */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: isLight ? "#FFFFFF" : theme.palette.primary.main,
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Sarlacc
        </Typography>
        {isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{ color: isLight ? "#FFFFFF" : "text.primary" }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Divider
        sx={{ borderColor: isLight ? "rgba(255,255,255,0.1)" : "divider" }}
      />

      {/* Nav Items */}
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath?.includes(item.path) ?? false;
          return (
            <ListItem key={item.title} disablePadding>
              <ListItemButton
                onClick={() => {
                  onNavigate?.(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  mx: 1,
                  borderRadius: 1.5,
                  backgroundColor: isActive
                    ? isLight
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(74,143,191,0.15)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: isLight
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(74,143,191,0.1)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive
                      ? isLight
                        ? "#FFFFFF"
                        : theme.palette.primary.main
                      : isLight
                        ? "rgba(255,255,255,0.6)"
                        : theme.palette.text.secondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? isLight
                        ? "#FFFFFF"
                        : theme.palette.primary.main
                      : isLight
                        ? "rgba(255,255,255,0.75)"
                        : theme.palette.text.secondary,
                  }}
                />
                {/* Active indicator bar */}
                {isActive && (
                  <Box
                    sx={{
                      width: 3,
                      height: 20,
                      borderRadius: 2,
                      backgroundColor: theme.palette.secondary.main,
                      ml: 1,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider
        sx={{ borderColor: isLight ? "rgba(255,255,255,0.1)" : "divider" }}
      />

      {/* User + Logout */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: theme.palette.secondary.main,
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          {user?.name?.[0] ?? "U"}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              color: isLight ? "#FFFFFF" : theme.palette.text.primary,
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            {user?.name ?? "User"}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: isLight
                ? "rgba(255,255,255,0.55)"
                : theme.palette.text.secondary,
              fontSize: "0.7rem",
            }}
          >
            {user?.email ?? ""}
          </Typography>
        </Box>
        <Tooltip title="Log out">
          <IconButton
            size="small"
            onClick={onLogout}
            sx={{
              color: isLight
                ? "rgba(255,255,255,0.6)"
                : theme.palette.text.secondary,
            }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar — permanent on desktop, temporary drawer on mobile */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop permanent drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Top AppBar */}
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ gap: 1 }}>
            {/* Mobile menu toggle */}
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" }, mr: 1 }}
            >
              <MenuIcon />
            </IconButton>

            {/* Page title */}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: "secondary.main",
                "& svg": { fontSize: "1.25rem" },
              }}
            >
              {icon}
            </Box>
            <Typography
              variant="h6"
              sx={{
                flex: 1,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: "text.primary",
              }}
            >
              {title}
            </Typography>

            {/* Dark mode toggle */}
            <Tooltip title={isLight ? "Dark mode" : "Light mode"}>
              <IconButton onClick={toggleColorMode} size="small">
                {isLight ? (
                  <DarkModeIcon fontSize="small" />
                ) : (
                  <LightModeIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Page content — no padding here, each page controls its own spacing.
            List pages: wrap content in a Box with p={{ xs: 2, sm: 3 }}
            Detail pages: use DetailPageLayout which handles fixed header + scroll */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: "hidden",
            backgroundColor: "background.default",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
