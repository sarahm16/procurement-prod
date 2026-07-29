import { useState } from "react";
import axios from "axios";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";

// MUI Icons
import TuneIcon from "@mui/icons-material/Tune";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

// Components
import GeneralPageLayout from "../../components/GeneralPageLayout";
import SoftwaresAdmin from "./tables/SoftwaresAdmin";
import TradesAdmin from "./tables/TradesAdmin";
import ServiceLinesAdmin from "./tables/ServiceLinesAdmin";
import VendorStatusesAdmin from "./tables/VendorStatusesAdmin";
import EmployeesAdmin from "./tables/EmployeesTable";
import ContactRolesAdmin from "./tables/ContactRolesTable";
import InternalRolesAdmin from "./tables/InternalRolesAdmin";
// import { Button } from "@mui/material";
// import fetchAndUpdateEmployees from "../../*/api/fetchCurrentEmployees";
// import ServicesAdmin from "./tables/ServicesAdmin";  ← add yours here as you build them

// ── Nav config ────────────────────────────────────────────────────────────────
// Add new admin sections here — the rest wires itself up automatically.
const NAV_SECTIONS = [
  {
    id: "constants",
    label: "Constants",
    icon: <TuneIcon fontSize="small" />,
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: <SecurityOutlinedIcon fontSize="small" />,
    disabled: true,
  },
  {
    id: "internalRoles",
    label: "Internal Roles",
    icon: <SecurityOutlinedIcon fontSize="small" />,
    disabled: false,
  },
  {
    id: "users",
    label: "Users",
    icon: <PeopleOutlineIcon fontSize="small" />,
    disabled: false,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationsNoneIcon fontSize="small" />,
    disabled: true,
  },
];

// ── Constants section content ─────────────────────────────────────────────────
// Renders all constants tables in a responsive two-column masonry grid.
// Add more <*Admin /> components here as you build them — they'll flow in
// automatically.
function ConstantsSection() {
  return (
    <Box
      sx={{
        // CSS columns give a true masonry layout — tables of different heights
        // stack naturally without awkward whitespace.
        columnCount: { xs: 1, md: 2, xl: 3 },
        columnGap: 3,
        "& > *": {
          // Each child breaks out of the column flow on its own terms
          breakInside: "avoid",
          marginBottom: 3,
          display: "block",
        },
      }}
    >
      <SoftwaresAdmin />
      <ContactRolesAdmin />
      <TradesAdmin />
      <ServiceLinesAdmin />
      <VendorStatusesAdmin />
      {/* <ServicesAdmin /> */}
      {/* Keep adding tables here */}
    </Box>
  );
}

function UsersSection() {
  return (
    <Box
      sx={{
        // CSS columns give a true masonry layout — tables of different heights
        // stack naturally without awkward whitespace.
        columnCount: { xs: 1 },
        columnGap: 3,
        "& > *": {
          // Each child breaks out of the column flow on its own terms
          breakInside: "avoid",
          marginBottom: 3,
          display: "block",
        },
      }}
    >
      <EmployeesAdmin />
      {/* Keep adding tables here */}
    </Box>
  );
}

function InternalRolesSection() {
  return (
    <Box
      sx={{
        // CSS columns give a true masonry layout — tables of different heights
        // stack naturally without awkward whitespace.
        columnCount: { xs: 1, md: 2, xl: 3 },
        columnGap: 3,
        "& > *": {
          // Each child breaks out of the column flow on its own terms
          breakInside: "avoid",
          marginBottom: 3,
          display: "block",
        },
      }}
    >
      <InternalRolesAdmin />
      {/* Keep adding tables here */}
    </Box>
  );
}

// ── Section registry ──────────────────────────────────────────────────────────
// Maps nav ids to their content components.
const SECTION_CONTENT = {
  constants: <ConstantsSection />,
  // permissions: <PermissionsSection />,
  users: <UsersSection />,
  internalRoles: <InternalRolesSection />,
};

// ── Admin page ────────────────────────────────────────────────────────────────
function Admin() {
  const [activeSection, setActiveSection] = useState("constants");

  return (
    <GeneralPageLayout>
      <Box
        sx={{
          display: "flex",
          height: "100%",
          gap: 0,
        }}
      >
        {/* <Button
          onClick={async () => {
            const response = await axios.post(
              "https://sarlacc-server-htfaarfvczc0hrgv.westus2-01.azurewebsites.net/api/employees/sync",
            );
            console.log("Update employees response:", response);
          }}
        >
          Update Employees
        </Button> */}
        {/* Secondary admin nav */}
        <Box
          sx={{
            width: 200,
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            pt: 2,
            pb: 2,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              px: 2,
              mb: 0.5,
              fontSize: "0.65rem",
              color: "text.disabled",
              letterSpacing: "0.1em",
              display: "block",
            }}
          >
            Admin
          </Typography>

          <List dense disablePadding sx={{ px: 1 }}>
            {NAV_SECTIONS.map((section) => (
              <ListItemButton
                key={section.id}
                selected={activeSection === section.id}
                disabled={section.disabled}
                onClick={() => setActiveSection(section.id)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.25,
                  py: 0.75,
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "#fff",
                    "& .MuiListItemIcon-root": { color: "#fff" },
                    "&:hover": { backgroundColor: "primary.dark" },
                  },
                  "&.Mui-disabled": {
                    opacity: 0.4,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 32,
                    color:
                      activeSection === section.id
                        ? "inherit"
                        : "text.secondary",
                  }}
                >
                  {section.icon}
                </ListItemIcon>
                <ListItemText
                  primary={section.label}
                  primaryTypographyProps={{
                    fontSize: "0.8rem",
                    fontWeight: activeSection === section.id ? 600 : 400,
                  }}
                />
                {section.disabled && (
                  <Typography
                    variant="overline"
                    sx={{
                      fontSize: "0.55rem",
                      color: "text.disabled",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Soon
                  </Typography>
                )}
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ mx: 2, mt: 1, borderColor: "divider" }} />
        </Box>

        {/* Section content */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            px: { xs: 2, sm: 3 },
            py: 3,
          }}
        >
          {SECTION_CONTENT[activeSection] ?? (
            <Typography color="text.secondary" variant="body2">
              Coming soon.
            </Typography>
          )}
        </Box>
      </Box>
    </GeneralPageLayout>
  );
}

export default Admin;
