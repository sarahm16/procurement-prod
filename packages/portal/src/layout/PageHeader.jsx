// @sarlacc/portal · src/layout/PageHeader.jsx
//
// The title row at the top of every page, with the page's main action on
// the right (it drops under the title on phones).
//
//   <PageHeader title="Work orders" subtitle="…" actions={<Button …/>} />
//   <PageHeader title="WO-10482" back={{ to: "/", label: "Work orders" }} />
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function PageHeader({ title, subtitle, actions, back }) {
  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      {back && (
        <Button
          component={RouterLink}
          to={back.to}
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ ml: -1.5, mb: 0.5, color: "text.secondary" }}
        >
          {back.label}
        </Button>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "flex-end" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontSize: { xs: "1.85rem", md: "2.25rem" } }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexShrink: 0,
              "& .MuiButton-root": { minHeight: 42 },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
}
