// @sarlacc/portal · src/layout/PortalLayout.jsx
//
// The frame around every signed-in page.
//
//   Wide screens:  [mark  Portal name | Company]  [nav links]  [Help] [name/role] [avatar]
//   Phones:        [☰] [mark  Company]                                          [avatar]
//                  ☰ opens a drawer with the nav links and Help.
//
//   <Route element={<PortalLayout config={config} />}>…</Route>
//
//   config.name      "Client Portal"
//   config.orgName   (user) => company name shown under the portal name
//   config.nav       [{ label, path, icon, adminOnly? }]
//   config.help      { title, body, email?, phone? }  (see HelpDialog)
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  alpha,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../auth/useAuth.js";
import HelpDialog from "./HelpDialog.jsx";

const ROLE_LABEL = { admin: "Admin", member: "Member" };

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

function BrandMark() {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: 1.5,
        bgcolor: "secondary.main",
        color: "secondary.contrastText",
        display: "grid",
        placeItems: "center",
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0,
      }}
    >
      NFC
    </Box>
  );
}

/** The links the signed-in person may see. */
const visibleNav = (config, user) =>
  (config.nav ?? []).filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

/** "/" is active only on itself; everything else also on its sub-pages. */
const isActive = (path, pathname) =>
  path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(`${path}/`);

function TopNavLink({ item, active }) {
  const Icon = item.icon;
  return (
    <Button
      component={NavLink}
      to={item.path}
      end={item.path === "/"}
      startIcon={Icon ? <Icon /> : null}
      sx={{
        height: 64,
        px: 1.75,
        borderRadius: 0,
        color: active ? "primary.main" : "text.secondary",
        fontSize: "0.8rem",
        position: "relative",
        "&:hover": { color: "text.primary", bgcolor: "transparent" },
        "&::after": {
          content: '""',
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 0,
          height: 3,
          borderRadius: "3px 3px 0 0",
          bgcolor: active ? "secondary.main" : "transparent",
        },
      }}
    >
      {item.label}
    </Button>
  );
}

export default function PortalLayout({ config }) {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const nav = visibleNav(config, user);
  const orgName = (user && config.orgName(user)) ?? "";
  const roleLabel = ROLE_LABEL[user?.role];

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      {/* color="inherit": the theme makes the bar white (or dark paper), so
          the text takes the normal text colour. */}
      <AppBar position="sticky" elevation={0} color="inherit">
        <Toolbar sx={{ gap: 1, minHeight: { xs: 60, md: 64 } }}>
          <IconButton
            edge="start"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Brand + company */}
          <Box
            component={NavLink}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              color: "inherit",
              textDecoration: "none",
              minWidth: 0,
              mr: { md: 3 },
            }}
          >
            <BrandMark />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 600,
                  fontSize: "1.15rem",
                  lineHeight: 1.1,
                  display: { xs: "none", sm: "block" },
                }}
              >
                {config.name}
              </Typography>
              <Typography
                noWrap
                sx={{
                  fontSize: { xs: "0.95rem", sm: "0.75rem" },
                  fontWeight: { xs: 600, sm: 500 },
                  color: { xs: "text.primary", sm: "text.secondary" },
                  lineHeight: 1.3,
                  maxWidth: { xs: 180, sm: 220 },
                }}
              >
                {orgName}
              </Typography>
            </Box>
          </Box>

          {/* Wide screens: nav in the bar */}
          <Box
            component="nav"
            sx={{
              display: { xs: "none", md: "flex" },
              alignSelf: "stretch",
              gap: 0.5,
            }}
          >
            {nav.map((item) => (
              <TopNavLink
                key={item.path}
                item={item}
                active={isActive(item.path, pathname)}
              />
            ))}
          </Box>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<HelpOutlineIcon />}
            onClick={() => setHelpOpen(true)}
            sx={{ display: { xs: "none", md: "inline-flex" }, mr: 1 }}
          >
            Help &amp; support
          </Button>

          <Box
            sx={{
              display: { xs: "none", lg: "block" },
              textAlign: "right",
              mr: 0.5,
            }}
          >
            <Typography
              sx={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.2 }}
            >
              {user?.name}
            </Typography>
            {roleLabel && (
              <Chip
                label={roleLabel}
                size="small"
                color={user?.role === "admin" ? "secondary" : "default"}
                sx={{ height: 18, fontSize: "0.6rem", mt: 0.25 }}
              />
            )}
          </Box>

          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            aria-label="Account"
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: "0.85rem",
                fontWeight: 700,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              {initials(user?.name)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Account menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ px: 2, py: 1, minWidth: 240 }}>
          <Typography sx={{ fontWeight: 600 }}>{user?.name}</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
            {user?.email}
          </Typography>
          <Typography
            sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.5 }}
          >
            {orgName}
            {roleLabel ? ` · ${roleLabel}` : ""}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setHelpOpen(true);
          }}
          sx={{ display: { md: "none" } }}
        >
          <ListItemIcon>
            <HelpOutlineIcon fontSize="small" />
          </ListItemIcon>
          Help &amp; support
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            signOut();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>

      {/* Phones: nav in a drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: { sx: { width: 280, bgcolor: "background.paper" } },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2,
            py: 2,
          }}
        >
          <BrandMark />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 600,
                fontSize: "1.15rem",
                lineHeight: 1.1,
              }}
            >
              {config.name}
            </Typography>
            <Typography
              noWrap
              sx={{ fontSize: "0.8rem", color: "text.secondary" }}
            >
              {orgName}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <List sx={{ py: 1 }}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, pathname);
            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setDrawerOpen(false)}
                selected={active}
                sx={(theme) => ({
                  "&.Mui-selected": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                  },
                })}
              >
                {Icon && (
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon />
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <List sx={{ py: 1 }}>
          <ListItemButton
            onClick={() => {
              setDrawerOpen(false);
              setHelpOpen(true);
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <HelpOutlineIcon />
            </ListItemIcon>
            <ListItemText primary="Help & support" />
          </ListItemButton>
        </List>
      </Drawer>

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        help={config.help}
      />

      <Box
        component="main"
        sx={{
          maxWidth: 1600,
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, md: 3 },
          pb: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
