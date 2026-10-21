// src/config.js — what makes this the client portal.
import AddTaskOutlinedIcon from "@mui/icons-material/AddTaskOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";

export const PORTAL = {
  name: "Client Portal",
  apiBase: "/api/client-portal",
  headline: ["Every request,", "tracked to done."],
  blurb: "Submit work for your sites and follow it from request to completion.",
  points: [
    {
      icon: AddTaskOutlinedIcon,
      text: "Submit a work order for any of your sites",
    },
    {
      icon: TimelineOutlinedIcon,
      text: "See where each request stands, at a glance",
    },
    {
      icon: StorefrontOutlinedIcon,
      text: "Every site and its history in one place",
    },
  ],
  emailHint: "Enter your work email.",
  helpText:
    "Need access for someone on your team? Contact your NFC account manager.",
  orgName: (user) => user.client?.name,

  // Top-bar links. adminOnly: only client admins see it.
  nav: [
    { label: "Work orders", path: "/", icon: AssignmentOutlinedIcon },
    { label: "Sites", path: "/sites", icon: PlaceOutlinedIcon },
    { label: "Equipment", path: "/equipment", icon: HandymanOutlinedIcon },
    {
      label: "Users",
      path: "/users",
      icon: PeopleAltOutlinedIcon,
      adminOnly: true,
    },
  ],

  // "Help & support". Fill in email/phone and they'll appear in the dialog.
  help: {
    title: "Help & support",
    body: "Questions about a work order, a site or your account? Your NFC account manager can help.",
    email: "",
    phone: "",
  },
};
