// tabs/documentation/VendorDocumentationTab.jsx
import { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

import VendorComplianceSection from "./VendorComplianceSection";
// import VendorExhibitsSection from "./VendorExhibitsSection";
// import VendorExhibitsFormSection from "./VendorExhibitsFormSection";
// import VendorWorkOrderMsaSection from "./VendorWorkOrderMsaSection";
// import VendorNoticesSection from "./VendorNoticesSection";

// Section registry — add a section here and it wires itself into the nav + content.
const SECTIONS = [
  {
    id: "general",
    label: "General",
    subtitle: "Compliance documents",
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  },
  {
    id: "exhibits",
    label: "Current Exhibits",
    subtitle: "Signed pricing exhibits",
    icon: <FolderOutlinedIcon fontSize="small" />,
  },
  {
    id: "exhibitsForm",
    label: "Exhibits Form",
    subtitle: "Build & send pricing",
    icon: <AddCircleOutlineIcon fontSize="small" />,
  },
  {
    id: "workOrderMsa",
    label: "Work Order MSAs",
    subtitle: "Per-work-order agreements",
    icon: <WorkOutlineIcon fontSize="small" />,
  },
  {
    id: "notices",
    label: "Notices",
    subtitle: "Warnings & termination",
    icon: <WarningAmberOutlinedIcon fontSize="small" />,
  },
  {
    id: "misc",
    label: "Miscellaneous",
    subtitle: "Other documents",
    icon: <MoreHorizIcon fontSize="small" />,
  },
];

export default function VendorDocumentationTab({ vendorId }) {
  const theme = useTheme();
  const [active, setActive] = useState("general");

  const renderSection = () => {
    switch (active) {
      case "general":
        return <VendorComplianceSection vendorId={vendorId} />;
      // case "exhibits":
      //   return <VendorExhibitsSection vendorId={vendorId} />;
      // case "exhibitsForm":
      //   return <VendorExhibitsFormSection vendorId={vendorId} />;
      // case "workOrderMsa":
      //   return <VendorWorkOrderMsaSection vendorId={vendorId} />;
      // case "notices":
      //   return <VendorNoticesSection vendorId={vendorId} />;
      default:
        return (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: "0.9rem" }}>
              Coming soon.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 3,
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Left nav */}
      <Box
        sx={{
          width: 220,
          flexShrink: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          pr: 2,
          pt: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: "1.05rem",
            mb: 0.25,
          }}
        >
          Documentation
        </Typography>
        <Typography
          sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 1.5 }}
        >
          Manage compliance & exhibits
        </Typography>

        <List disablePadding>
          {SECTIONS.map((section) => (
            <ListItemButton
              key={section.id}
              selected={active === section.id}
              onClick={() => setActive(section.id)}
              sx={{
                borderRadius: 1.5,
                mb: 0.25,
                py: 0.75,
                alignItems: "flex-start",
                "&.Mui-selected": {
                  backgroundColor: theme.palette.primary.main,
                  color: "#fff",
                  "& .MuiListItemIcon-root": { color: "#fff" },
                  "&:hover": { backgroundColor: theme.palette.primary.dark },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 32,
                  mt: 0.25,
                  color: active === section.id ? "inherit" : "text.secondary",
                }}
              >
                {section.icon}
              </ListItemIcon>
              <ListItemText
                primary={section.label}
                secondary={section.subtitle}
                primaryTypographyProps={{
                  fontSize: "0.82rem",
                  fontWeight: active === section.id ? 600 : 500,
                }}
                secondaryTypographyProps={{
                  fontSize: "0.68rem",
                  color:
                    active === section.id
                      ? "rgba(255,255,255,0.7)"
                      : "text.disabled",
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Content area — scrolls independently */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
          pt: 1,
          pb: 4,
        }}
      >
        {renderSection()}
      </Box>
    </Box>
  );
}
