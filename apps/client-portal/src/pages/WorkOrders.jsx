// src/pages/WorkOrders.jsx
//
// Placeholder until the work order design is settled in the ops app.
import { Paper, Typography } from "@mui/material";
import { useAuth } from "../portal";

export default function WorkOrders() {
  const { user } = useAuth();
  const sites =
    user?.site_count == null
      ? "all of your sites"
      : `your ${user.site_count} site${user.site_count === 1 ? "" : "s"}`;
  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Work orders
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
          Welcome, {user?.name?.split(" ")[0]}.
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          Work orders for {sites} will show up here, and you&apos;ll be able to
          submit new ones.
        </Typography>
      </Paper>
    </>
  );
}
