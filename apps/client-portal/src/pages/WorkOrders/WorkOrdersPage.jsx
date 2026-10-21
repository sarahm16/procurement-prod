// src/pages/WorkOrders/WorkOrdersPage.jsx — the home page.
// Placeholder until the work order design is settled in the ops app.
import { Button, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import { ComingSoon, PageHeader, useAuth } from "@sarlacc/portal";

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const scope =
    user?.site_count == null
      ? "all of your sites"
      : `your ${user.site_count} site${user.site_count === 1 ? "" : "s"}`;
  return (
    <>
      <PageHeader
        title="Work orders"
        subtitle={`Requests for ${scope}.`}
        actions={
          <Tooltip title="Coming soon">
            <span>
              <Button variant="contained" startIcon={<AddIcon />} disabled>
                Create work order
              </Button>
            </span>
          </Tooltip>
        }
      />
      <ComingSoon
        icon={AssignmentOutlinedIcon}
        title="Your work orders will show here"
        text="Filter by status, search, and open any request to see where it stands."
        height={560}
      />
    </>
  );
}
