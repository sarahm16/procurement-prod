// src/pages/Users/UsersPage.jsx — client admins only. Placeholder.
import { Navigate } from "react-router-dom";
import { Button, Tooltip } from "@mui/material";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import { ComingSoon, PageHeader, useAuth } from "@sarlacc/portal";

export default function UsersPage() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="People at your company who can sign in to this portal."
        actions={
          <Tooltip title="Coming soon">
            <span>
              <Button
                variant="contained"
                startIcon={<PersonAddAltOutlinedIcon />}
                disabled
              >
                Invite user
              </Button>
            </span>
          </Tooltip>
        }
      />
      <ComingSoon
        icon={PeopleAltOutlinedIcon}
        title="Your team will show here"
        text="Invite people, choose which sites they can see, and turn off access."
      />
    </>
  );
}
