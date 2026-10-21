// src/pages/WorkOrders.jsx
//
// Placeholder until the work order design is settled in the ops app.
import { Paper, Typography } from "@mui/material";
import { useAuth } from "../portal";

export default function WorkOrders() {
  const { user } = useAuth();
  return (
    <>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Work orders
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
          Welcome, {user?.name?.split(" ")[0]}.
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          Work orders assigned to {user?.vendor?.company ?? "you"} will show up
          here.
        </Typography>
      </Paper>
    </>
  );
}
