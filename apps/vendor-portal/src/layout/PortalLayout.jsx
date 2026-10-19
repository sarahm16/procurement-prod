// src/layout/PortalLayout.jsx
//
// The frame around every signed-in page: a top bar with the vendor's
// company and an account menu. Phone-first; pages render in the middle.
import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../auth/useAuth";

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export default function PortalLayout() {
  const { user, signOut } = useAuth();
  const [anchor, setAnchor] = useState(null);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      {/* color="inherit": the theme makes the bar white (or dark paper), so
          the text takes the normal text colour instead of white. */}
      <AppBar position="sticky" elevation={0} color="inherit">
        <Toolbar sx={{ gap: 1.5 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "secondary.main",
                lineHeight: 1.2,
              }}
            >
              NFC Vendor Portal
            </Typography>
            <Typography
              noWrap
              sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}
            >
              {user?.vendor?.company ?? ""}
            </Typography>
          </Box>
          <IconButton
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label="Account"
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: "0.8rem",
                fontWeight: 700,
                bgcolor: "secondary.main",
              }}
            >
              {initials(user?.name)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ px: 2, py: 1, minWidth: 220 }}>
          <Typography sx={{ fontWeight: 600 }}>{user?.name}</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            signOut();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>

      <Box
        component="main"
        sx={{
          maxWidth: 900,
          mx: "auto",
          px: 2,
          py: 2,
          pb: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
