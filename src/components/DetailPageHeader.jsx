import { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PlaceIcon from "@mui/icons-material/Place";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// ─── Status color mapping ─────────────────────────────────────────────────────
// Extend this map to cover all your status values across entities
const STATUS_COLORS = {
  // Vendor / Site global statuses
  active: { bg: "#1a7f4b", color: "#ffffff" },
  onboarded: { bg: "#2E5F8A", color: "#ffffff" },
  onboarding: { bg: "#2E5F8A", color: "#ffffff" },
  sourcing: { bg: "#7b5ea7", color: "#ffffff" },
  lead: { bg: "#5A6A7E", color: "#ffffff" },
  paused: { bg: "#b07d2e", color: "#ffffff" },
  terminated: { bg: "#9e2a2b", color: "#ffffff" },
  // Work order statuses
  open: { bg: "#2E5F8A", color: "#ffffff" },
  "in progress": { bg: "#1a7f4b", color: "#ffffff" },
  completed: { bg: "#3d6b40", color: "#ffffff" },
  cancelled: { bg: "#9e2a2b", color: "#ffffff" },
  pending: { bg: "#b07d2e", color: "#ffffff" },
};

const getStatusColors = (status, theme) => {
  const key = status?.toLowerCase();
  return (
    STATUS_COLORS[key] ?? { bg: theme.palette.primary.main, color: "#fff" }
  );
};

// ─── StatusChip ───────────────────────────────────────────────────────────────
function StatusChip({ status, statusOptions = [], onStatusChange }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const colors = getStatusColors(status, theme);

  const handleOpen = (e) => {
    if (statusOptions.length > 0) setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);
  const handleSelect = (option) => {
    onStatusChange?.(option);
    handleClose();
  };

  return (
    <>
      <Chip
        label={status}
        onClick={handleOpen}
        deleteIcon={
          statusOptions.length > 0 ? (
            <ExpandMoreIcon style={{ color: colors.color, fontSize: 16 }} />
          ) : undefined
        }
        onDelete={statusOptions.length > 0 ? handleOpen : undefined}
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontFamily: '"Barlow", sans-serif',
          fontWeight: 700,
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          height: 26,
          borderRadius: "4px",
          cursor: statusOptions.length > 0 ? "pointer" : "default",
          transition: "filter 0.15s ease",
          "&:hover":
            statusOptions.length > 0 ? { filter: "brightness(1.15)" } : {},
          "& .MuiChip-label": { px: 1.25 },
        }}
      />
      {statusOptions.length > 0 && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                minWidth: 160,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 8px 24px rgba(0,0,0,0.5)"
                    : "0 8px 24px rgba(0,0,0,0.12)",
              },
            },
          }}
        >
          {statusOptions.map((option) => {
            const c = getStatusColors(option, theme);
            return (
              <MenuItem
                key={option}
                onClick={() => handleSelect(option)}
                selected={option.toLowerCase() === status?.toLowerCase()}
                sx={{
                  gap: 1.5,
                  fontSize: "0.8rem",
                  fontFamily: '"Barlow", sans-serif',
                  fontWeight: 500,
                  py: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: c.bg,
                    flexShrink: 0,
                  }}
                />
                {option}
              </MenuItem>
            );
          })}
        </Menu>
      )}
    </>
  );
}

// ─── MetaItem ─────────────────────────────────────────────────────────────────
function MetaItem({ label, value, icon }) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {icon && (
        <Box
          sx={{
            color: theme.palette.text.secondary,
            display: "flex",
            alignItems: "center",
          }}
        >
          {icon}
        </Box>
      )}
      {label && (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontSize: "0.65rem",
          }}
        >
          {label}:
        </Typography>
      )}
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.text.primary,
          fontFamily: '"Barlow", sans-serif',
          fontWeight: 500,
          fontSize: "0.8rem",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ─── DetailPageHeader ─────────────────────────────────────────────────────────
/**
 * Reusable detail page header for Sites, Clients, Vendors, Work Orders.
 *
 * Props:
 *   title         {string}   — primary heading (store name, client name, WO#, etc.)
 *   subtitle      {string}   — secondary line (optional, e.g. company/brand name)
 *   status        {string}   — current status value
 *   statusOptions {string[]} — list of selectable statuses for the chip menu
 *   onStatusChange{fn}       — called with new status string
 *   breadcrumbs   {Array}    — [{ label, href }] — last item is current page (no href)
 *   meta          {Array}    — [{ label, value, icon }] — small info pills below title
 *   address       {string}   — optional address line shown with pin icon
 *   onBack        {fn}       — if provided, shows a back arrow button
 *   actions       {ReactNode}— optional right-side action buttons
 */
export default function DetailPageHeader({
  title,
  subtitle,
  status,
  statusOptions = [],
  onStatusChange,
  breadcrumbs = [],
  meta = [],
  address,
  onBack,
  actions,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderBottom: `1px solid ${theme.palette.divider}`,
        mb: 3,
        // Subtle left accent bar using the primary color
        borderLeft: `4px solid ${theme.palette.secondary.main}`,
        borderRadius: "0 8px 8px 0",
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 2.5 }}>
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={
              <NavigateNextIcon fontSize="inherit" sx={{ fontSize: 14 }} />
            }
            sx={{ mb: 1.5 }}
          >
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return isLast ? (
                <Typography
                  key={i}
                  sx={{
                    fontSize: "0.72rem",
                    fontFamily: '"Barlow", sans-serif',
                    fontWeight: 600,
                    color: "text.primary",
                    letterSpacing: "0.02em",
                  }}
                >
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={i}
                  href={crumb.href}
                  underline="hover"
                  sx={{
                    fontSize: "0.72rem",
                    fontFamily: '"Barlow", sans-serif',
                    fontWeight: 500,
                    color: "text.secondary",
                    letterSpacing: "0.02em",
                  }}
                >
                  {crumb.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        )}

        {/* Title row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
            }}
          >
            {/* Back button */}
            {/*             {onBack && (
              <Tooltip title="Go back">
                <IconButton
                  onClick={onBack}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    backgroundColor: alpha(theme.palette.text.secondary, 0.08),
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: "primary.main",
                    },
                    flexShrink: 0,
                  }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )} */}

            {/* Title + subtitle */}
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: "1.4rem", sm: "1.7rem" },
                    letterSpacing: "-0.01em",
                    color: "text.primary",
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </Typography>

                {/* Status chip */}
                {status && (
                  <StatusChip
                    status={status}
                    statusOptions={statusOptions}
                    onStatusChange={onStatusChange}
                  />
                )}
              </Box>

              {/* Subtitle (brand/company name) */}
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.primary.main,
                    fontFamily: '"Barlow", sans-serif',
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    mt: 0.25,
                    opacity: isDark ? 0.85 : 1,
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Right side actions */}
          {actions && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
              }}
            >
              {actions}
            </Box>
          )}
        </Box>

        {/* Meta row */}
        {(meta.length > 0 || address) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: { xs: 1, sm: 0 },
              mt: 1.25,
            }}
          >
            {/* Address */}
            {address && (
              <>
                <MetaItem
                  value={address}
                  icon={<PlaceIcon sx={{ fontSize: 14 }} />}
                />
                {meta.length > 0 && (
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ mx: 1.5, display: { xs: "none", sm: "block" } }}
                  />
                )}
              </>
            )}

            {/* Other meta fields */}
            {meta.map((item, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center" }}>
                <MetaItem
                  label={item.label}
                  value={item.value}
                  icon={item.icon}
                />
                {i < meta.length - 1 && (
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ mx: 1.5, display: { xs: "none", sm: "block" } }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
