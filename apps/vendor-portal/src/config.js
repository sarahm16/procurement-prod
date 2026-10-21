// src/config.js — what makes this the vendor portal.
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
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

  // Top-bar links. adminOnly: only the vendor's admins see it.
  nav: [
    { label: "Work orders", path: "/", icon: AssignmentOutlinedIcon },
    { label: "Documents", path: "/documents", icon: DescriptionOutlinedIcon },
    {
      label: "Team",
      path: "/team",
      icon: PeopleAltOutlinedIcon,
      adminOnly: true,
    },
  ],

  // "Help & support". Fill in email/phone and they'll appear in the dialog.
  help: {
    title: "Help & support",
    body: "Questions about a work order, payment or your documents? Your NFC coordinator can help.",
    email: "",
    phone: "",
  },
};
