// src/portalConfig.js — what makes this the client portal.
import AddTaskOutlinedIcon from "@mui/icons-material/AddTaskOutlined";
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
};
