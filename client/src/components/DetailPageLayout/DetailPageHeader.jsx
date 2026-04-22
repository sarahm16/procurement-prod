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
  useTheme,
  alpha,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PlaceIcon from "@mui/icons-material/Place";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// ─── StatusChip ───────────────────────────────────────────────────────────────
function StatusChip({ status, statusOptions = [], onStatusChange }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const isInteractive = statusOptions.length > 0;

  const handleOpen = (e) => {
    if (isInteractive) setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);
  const handleSelect = (option) => {
    onStatusChange?.(option);
    handleClose();
  };

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1.25,
          py: 0.4,
          borderRadius: "6px",
          border: `1.5px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
          backgroundColor: alpha(theme.palette.secondary.main, 0.08),
          cursor: isInteractive ? "pointer" : "default",
          transition: "all 0.15s ease",
          "&:hover": isInteractive
            ? {
                backgroundColor: alpha(theme.palette.secondary.main, 0.14),
                borderColor: alpha(theme.palette.secondary.main, 0.6),
              }
            : {},
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: theme.palette.secondary.main,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 600,
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: theme.palette.secondary.main,
            lineHeight: 1,
          }}
        >
          {status}
        </Typography>
        {isInteractive && (
          <ExpandMoreIcon
            sx={{
              fontSize: 14,
              color: theme.palette.secondary.main,
              opacity: 0.7,
              ml: 0.25,
            }}
          />
        )}
      </Box>

      {isInteractive && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                minWidth: 170,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 12px 32px rgba(0,0,0,0.5)"
                    : "0 8px 28px rgba(0,0,0,0.1)",
              },
            },
          }}
        >
          {statusOptions.map((option) => (
            <MenuItem
              key={option}
              onClick={() => handleSelect(option)}
              selected={option.toLowerCase() === status?.toLowerCase()}
              sx={{
                fontSize: "0.82rem",
                fontFamily: '"Barlow", sans-serif',
                fontWeight: 500,
                py: 0.85,
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.secondary.main,
                  flexShrink: 0,
                  opacity:
                    option.toLowerCase() === status?.toLowerCase() ? 1 : 0.35,
                }}
              />
              {option}
            </MenuItem>
          ))}
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      {icon && (
        <Box
          sx={{
            color: theme.palette.text.disabled,
            display: "flex",
            alignItems: "center",
          }}
        >
          {icon}
        </Box>
      )}
      {label && (
        <Typography
          sx={{
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 600,
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: theme.palette.text.disabled,
          }}
        >
          {label}
        </Typography>
      )}
      <Typography
        sx={{
          fontFamily: '"Barlow", sans-serif',
          fontWeight: 500,
          fontSize: "0.82rem",
          color: theme.palette.text.secondary,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ─── DetailPageHeader ─────────────────────────────────────────────────────────
/**
 * Redesigned detail page header — clean, modern, no left accent bar.
 *
 * Props:
 *   title         {string}    — primary heading
 *   subtitle      {string}    — secondary line (optional)
 *   status        {string}    — current status value
 *   statusOptions {string[]}  — selectable statuses
 *   onStatusChange{fn}        — called with new status string
 *   breadcrumbs   {Array}     — [{ label, href }]
 *   meta          {Array}     — [{ label, value, icon }]
 *   address       {string}    — optional address with pin icon
 *   actions       {ReactNode} — right-side action buttons
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
  actions,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 2.5, sm: 4 },
        pt: 2,
        pb: 0,
      }}
    >
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={
            <NavigateNextIcon sx={{ fontSize: 13, color: "text.disabled" }} />
          }
          sx={{ mb: 1.75 }}
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
                  letterSpacing: "0.03em",
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
                  color: "text.disabled",
                  letterSpacing: "0.03em",
                  "&:hover": { color: "text.secondary" },
                }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Main row: title + actions */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          pb: 2,
        }}
      >
        {/* Left: title block */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* Subtitle above title */}
          {subtitle && (
            <Typography
              sx={{
                fontFamily: '"Barlow", sans-serif',
                fontWeight: 600,
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: theme.palette.primary.main,
                opacity: isDark ? 0.75 : 0.85,
                mb: 0.4,
              }}
            >
              {subtitle}
            </Typography>
          )}

          {/* Title + status on same line */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: { xs: "1.6rem", sm: "2rem" },
                letterSpacing: "-0.02em",
                color: "text.primary",
                lineHeight: 1.1,
              }}
            >
              {title}
            </Typography>

            {status && (
              <StatusChip
                status={status}
                statusOptions={statusOptions}
                onStatusChange={onStatusChange}
              />
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
                mt: 1,
              }}
            >
              {address && (
                <>
                  <MetaItem
                    value={address}
                    icon={<PlaceIcon sx={{ fontSize: 13 }} />}
                  />
                  {meta.length > 0 && (
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        mx: 1.75,
                        borderColor: theme.palette.divider,
                        display: { xs: "none", sm: "block" },
                      }}
                    />
                  )}
                </>
              )}
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
                      sx={{
                        mx: 1.75,
                        borderColor: theme.palette.divider,
                        display: { xs: "none", sm: "block" },
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Right: actions */}
        {actions && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
              pb: 0.5,
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* Bottom accent line — thin orange rule under the active page */}
      <Box
        sx={{
          height: 2,
          width: 48,
          backgroundColor: theme.palette.secondary.main,
          borderRadius: "2px 2px 0 0",
          mb: 0,
        }}
      />
    </Box>
  );
}
