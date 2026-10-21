// src/portalConfig.js — what makes this the vendor portal.
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";

export const PORTAL = {
  name: "Vendor Portal",
  apiBase: "/api/portal",
  headline: ["Your work orders,", "in one place."],
  blurb:
    "Everything you need to get the job done for NFC, from your phone or your desk.",
  points: [
    {
      icon: AssignmentOutlinedIcon,
      text: "See every work order assigned to your company",
    },
    {
      icon: PlaceOutlinedIcon,
      text: "Site addresses, scope of work and due dates",
    },
    {
      icon: UpdateOutlinedIcon,
      text: "Keep our team updated as the work moves",
    },
  ],
  emailHint: "Enter the email your company uses with NFC.",
  helpText: "Need access, or using a new email? Contact your NFC coordinator.",
  orgName: (user) => user.vendor?.company,
};
