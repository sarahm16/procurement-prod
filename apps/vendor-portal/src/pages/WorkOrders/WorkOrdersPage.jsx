// src/pages/WorkOrders/WorkOrdersPage.jsx — the home page.
// Placeholder until the work order design is settled in the ops app.
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import { ComingSoon, PageHeader, useAuth } from "@sarlacc/portal";

export default function WorkOrdersPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title="Work orders"
        subtitle={`Work assigned to ${user?.vendor?.company ?? "your company"}.`}
      />
      <ComingSoon
        icon={AssignmentOutlinedIcon}
        title="Your work orders will show here"
        text="Open one to see the site, scope and due date, and to send updates to our team."
        height={560}
      />
    </>
  );
}
