// components/RecordLink.jsx
//
// A value that opens another record's detail page, e.g. the client's name on
// a site. Click opens it here; the icon (or Ctrl/Cmd-click, middle-click)
// opens it in a new tab so you don't lose your place.
//
//   <RecordLink to={`/clients/${site.client_id}`}>Walmart</RecordLink>
//
// FieldRow uses it for its `link` prop; use it directly in custom renders,
// grids and chips.
import { Link as RouterLink } from "react-router-dom";
import { Box, IconButton, Link, Tooltip } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function RecordLink({ to, children, sx, newTab = true }) {
  if (!to) return children ?? "—";

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        minWidth: 0,
        maxWidth: "100%",
        "& .open-new": { opacity: 0 },
        "&:hover .open-new, & .open-new:focus-visible": { opacity: 1 },
        "@media (hover: none)": { "& .open-new": { opacity: 1 } },
        ...sx,
      }}
    >
      <Link
        component={RouterLink}
        to={to}
        underline="hover"
        sx={{
          fontFamily: '"Barlow", sans-serif',
          fontSize: "0.85rem",
          fontWeight: 500,
          lineHeight: 1.4,
          color: "primary.main",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Link>
      {newTab && (
        <Tooltip title="Open in a new tab">
          <IconButton
            className="open-new"
            size="small"
            component="a"
            href={to}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in a new tab"
            sx={{
              p: 0.25,
              flexShrink: 0,
              color: "text.disabled",
              transition: "opacity 0.1s",
              "&:hover": { color: "primary.main" },
            }}
          >
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
