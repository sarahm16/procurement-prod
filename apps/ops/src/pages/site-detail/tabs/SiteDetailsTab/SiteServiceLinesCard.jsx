// site-details/tabs/SiteServiceLinesCard.jsx
import { Box, Typography, Chip, useTheme, alpha } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

/**
 * Read-only display of a site's service lines.
 * Expects `serviceLines` as an array of name strings (matches the site
 * serializer's `service_lines`), e.g. ["HVAC", "Plumbing"].
 */
export default function SiteServiceLinesCard({
  serviceLines = [],
  span = "half",
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
        gridColumn: span === "full" ? "1 / -1" : "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountTreeOutlinedIcon
          sx={{ fontSize: 17, color: "text.secondary" }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          Service Lines
        </Typography>
        {serviceLines.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "text.secondary",
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
              px: 0.85,
              py: 0.1,
              borderRadius: 1,
            }}
          >
            {serviceLines.length}
          </Typography>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2 }}>
        {serviceLines.length === 0 ? (
          <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
            No service lines assigned to this site.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {serviceLines.map((name, i) => (
              <Chip
                key={`${name}-${i}`}
                label={name}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  height: 26,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
