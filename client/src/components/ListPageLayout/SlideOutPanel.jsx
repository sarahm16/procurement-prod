import { useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const PANEL_WIDTH = 480;

/**
 * SlideOutPanel
 *
 * A reusable slide-out drawer for create/edit forms. Opens from the right.
 * The form itself is passed in as children — the panel is just the shell.
 *
 * Usage:
 *   <SlideOutPanel
 *     open={panelOpen}
 *     onClose={() => setPanelOpen(false)}
 *     title="New Vendor"
 *     subtitle="Fill in the details below to add a new vendor."
 *   >
 *     <CreateVendorForm onSuccess={() => setPanelOpen(false)} />
 *   </SlideOutPanel>
 *
 * Props:
 *   open       {boolean}
 *   onClose    {fn}
 *   title      {string}
 *   subtitle   {string}   — optional description line below title
 *   children   {ReactNode} — the form
 *   width      {number}   — panel width in px (default 480)
 */
export default function SlideOutPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = PANEL_WIDTH,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Trap focus inside panel when open
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ref={panelRef}
      // Keep the rest of the page interactive (no backdrop lock)
      disableEnforceFocus
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark
              ? alpha("#000", 0.5)
              : alpha("#1B3A5C", 0.15),
            backdropFilter: "blur(2px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: width },
          backgroundColor: "background.paper",
          backgroundImage: "none",
          borderLeft: `1px solid ${theme.palette.divider}`,
          boxShadow: isDark
            ? `-8px 0 40px ${alpha("#000", 0.5)}`
            : `-8px 0 40px ${alpha("#1B3A5C", 0.1)}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          pt: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          // Subtle top accent
          borderTop: `3px solid ${theme.palette.secondary.main}`,
          backgroundColor: isDark
            ? alpha(theme.palette.primary.main, 0.06)
            : alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
            <ArrowForwardIcon
              sx={{
                fontSize: 14,
                color: theme.palette.secondary.main,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: '"Barlow", sans-serif',
                fontWeight: 700,
                fontSize: "1.1rem",
                letterSpacing: "-0.01em",
                color: "text.primary",
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
          </Box>

          {subtitle && (
            <Typography
              sx={{
                fontFamily: '"Barlow", sans-serif',
                fontSize: "0.78rem",
                color: "text.secondary",
                lineHeight: 1.4,
                mt: 0.5,
                pl: 2.75, // align with title text (past the arrow icon)
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Close button */}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            flexShrink: 0,
            color: "text.secondary",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            p: "5px",
            mt: 0.25,
            transition: "all 0.15s ease",
            "&:hover": {
              color: "text.primary",
              borderColor: "text.secondary",
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Divider />

      {/* ── Scrollable form area ─────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 3,
          py: 3,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 2,
            "&:hover": {
              background: alpha(theme.palette.text.primary, 0.22),
            },
          },
        }}
      >
        {children}
      </Box>
    </Drawer>
  );
}
