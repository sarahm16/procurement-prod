// @sarlacc/portal · src/layout/ComingSoon.jsx
//
// A placeholder for page content that hasn't been built yet, sized like the
// real content will be (e.g. a data grid) so the layout can be judged.
//
//   <ComingSoon icon={AssignmentOutlinedIcon} title="Your work orders"
//               text="…" height={520} />
import { Box, Paper, Typography } from "@mui/material";

export default function ComingSoon({ icon: Icon, title, text, height = 420 }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: { xs: 280, md: height },
        borderRadius: 2,
        borderStyle: "dashed",
        display: "grid",
        placeItems: "center",
        p: 4,
        textAlign: "center",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ maxWidth: 380 }}>
        {Icon && <Icon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />}
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{title}</Typography>
        {text && (
          <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
            {text}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
