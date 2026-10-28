import { useEffect, useState } from "react";
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
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";

// Nav Items
import routesConfig from "../routes/routeConfig";
const NAV_ITEMS = routesConfig.filter((route) => route.showInLayout);

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 68;
const COLLAPSED_KEY = "nfc.nav.collapsed";
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Collapsed or not, remembered per browser. */
function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* private window etc. — it just won't be remembered */
    }
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

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
  const [collapsedPref, setCollapsed] = useCollapsed();
  const { mode, toggleColorMode } = useColorMode();

  const isLight = mode === "light";
  // The phone drawer is always full width; collapsing is a desktop thing.
  const collapsed = collapsedPref && !isMobile;
  const toggleCollapsed = () => setCollapsed((c) => !c);

  // Ctrl/⌘ + B toggles the sidebar, like most editors.
  useEffect(() => {
    if (isMobile) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        const t = e.target;
        if (t?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName)) return;
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, setCollapsed]);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  const route = routesConfig.find(
    (r) => currentPath?.startsWith(r.path) && r.path !== "/",
  );
  const icon = route ? route.icon : null;

  // Colours shared by the nav pieces.
  const ink = {
    strong: isLight ? "#FFFFFF" : theme.palette.text.primary,
    soft: isLight ? "rgba(255,255,255,0.6)" : theme.palette.text.secondary,
    label: isLight ? "rgba(255,255,255,0.75)" : theme.palette.text.secondary,
    active: isLight ? "#FFFFFF" : theme.palette.primary.main,
    activeBg: isLight ? "rgba(255,255,255,0.15)" : "rgba(74,143,191,0.15)",
    hoverBg: isLight ? "rgba(255,255,255,0.1)" : "rgba(74,143,191,0.1)",
    rule: isLight ? "rgba(255,255,255,0.1)" : "divider",
  };

  /** Hide text smoothly as the rail narrows, instead of letting it wrap. */
  const fade = {
    opacity: collapsed ? 0 : 1,
    transition: `opacity 120ms ${EASE}`,
    whiteSpace: "nowrap",
    overflow: "hidden",
  };

  const collapseButton = !isMobile && (
    <Tooltip title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"} placement="right">
      <IconButton
        size="small"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        sx={{
          color: ink.soft,
          "&:hover": { color: ink.strong, backgroundColor: ink.hoverBg },
        }}
      >
        {collapsed ? (
          <KeyboardDoubleArrowRightIcon fontSize="small" />
        ) : (
          <KeyboardDoubleArrowLeftIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden" }}>
      {/* Logo / App Name */}
      <Box
        sx={{
          px: collapsed ? 0 : 3,
          py: 2.5,
          minHeight: 72,
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: collapsed ? 0.5 : 1,
          transition: `padding 200ms ${EASE}`,
        }}
      >
        <Tooltip title={collapsed ? "Sarlacc" : ""} placement="right">
          <Typography
            variant="h5"
            sx={{
              color: isLight ? "#FFFFFF" : theme.palette.primary.main,
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {collapsed ? "S" : "Sarlacc"}
          </Typography>
        </Tooltip>
        {isMobile ? (
          <IconButton onClick={handleDrawerToggle} sx={{ color: ink.strong }}>
            <CloseIcon />
          </IconButton>
        ) : (
          collapseButton
        )}
      </Box>

      <Divider sx={{ borderColor: ink.rule }} />

      {/* Nav Items */}
      <List sx={{ flex: 1, pt: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath?.includes(item.path) ?? false;
          const button = (
            <ListItemButton
              onClick={() => {
                onNavigate?.(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              aria-label={collapsed ? item.title : undefined}
              aria-current={isActive ? "page" : undefined}
              sx={{
                mx: 1,
                px: collapsed ? 0 : 2,
                justifyContent: collapsed ? "center" : "flex-start",
                minHeight: 42,
                borderRadius: 1.5,
                position: "relative",
                backgroundColor: isActive ? ink.activeBg : "transparent",
                "&:hover": { backgroundColor: ink.hoverBg },
                transition: `padding 200ms ${EASE}, background-color 120ms`,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  justifyContent: "center",
                  color: isActive ? ink.active : ink.soft,
                  transition: `min-width 200ms ${EASE}`,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                sx={{ ...fade, m: 0, flex: collapsed ? "0 0 0" : "1 1 auto", width: collapsed ? 0 : "auto" }}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? ink.active : ink.label,
                  noWrap: true,
                }}
              />
              {/* Active indicator bar: beside the label when open, on the
                  rail's edge when collapsed */}
              {isActive && (
                <Box
                  sx={{
                    width: 3,
                    height: 20,
                    borderRadius: 2,
                    backgroundColor: theme.palette.secondary.main,
                    ...(collapsed
                      ? { position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)" }
                      : { ml: 1 }),
                  }}
                />
              )}
            </ListItemButton>
          );
          return (
            <ListItem key={item.title} disablePadding sx={{ mb: 0.25 }}>
              {collapsed ? (
                <Tooltip title={item.title} placement="right" arrow>
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: ink.rule }} />

      {/* User + Logout */}
      <Box
        sx={{
          p: collapsed ? 1 : 2,
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center",
          gap: collapsed ? 1 : 1.5,
          transition: `padding 200ms ${EASE}`,
        }}
      >
        <Tooltip title={collapsed ? `${user?.name ?? "User"}${user?.email ? ` · ${user.email}` : ""}` : ""} placement="right">
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
        </Tooltip>
        {!collapsed && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: ink.strong, fontWeight: 600, fontSize: "0.8rem" }}>
              {user?.name ?? "User"}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              title={user?.email ?? ""}
              sx={{
                display: "block", // caption is inline, so noWrap alone didn't clip long emails
                color: isLight ? "rgba(255,255,255,0.55)" : theme.palette.text.secondary,
                fontSize: "0.7rem",
              }}
            >
              {user?.email ?? ""}
            </Typography>
          </Box>
        )}
        <Tooltip title="Log out" placement={collapsed ? "right" : "top"}>
          <IconButton size="small" onClick={onLogout} sx={{ color: ink.soft }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const desktopWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;
  const widthTransition = `width 200ms ${EASE}`;

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar — collapsible rail on desktop, temporary drawer on mobile */}
      <Box
        component="nav"
        sx={{ width: { md: desktopWidth }, flexShrink: { md: 0 }, transition: { md: widthTransition } }}
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
              width: desktopWidth,
              boxSizing: "border-box",
              overflowX: "hidden",
              transition: widthTransition,
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
                {isLight ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
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
