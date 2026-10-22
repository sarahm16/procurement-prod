// workorder-details/tabs/MessagesTab/MessagesTab.jsx
//
// The two outside conversations on a work order, one at a time:
//   Client — our team ↔ the client (only if they use our client portal)
//   Vendor — our team ↔ the vendor on the work order (vendor portal)
//
// Only one is ever on screen, the switch says who each one is with, and
// each has its own colour, so a message can't be typed into the wrong one
// by accident. Internal notes stay in the Notes panel.
import { useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import MessageThread from "./MessageThread";
import {
  useFieldActivity,
  useWorkOrderDetails,
} from "../../WorkOrderDetailProvider";

const ACCENT = { client: "secondary", vendor: "info" };

export default function MessagesTab() {
  const details = useWorkOrderDetails();
  const fieldActivity = useFieldActivity();
  const clientName = details?.client ?? "the client";
  const vendorName = details?.vendor?.company ?? null;
  const clientOnPortal = Boolean(details?.client_uses_portal);

  const count = (ch) =>
    (fieldActivity?.communications ?? []).filter((m) => m.channel === ch).length;

  // Start on a conversation that can be used.
  const [channel, setChannel] = useState(
    clientOnPortal || !vendorName ? "client" : "vendor",
  );

  const option = (value, Icon, label, name) => (
    <ToggleButton
      value={value}
      sx={{
        px: 2,
        py: 1,
        gap: 1,
        textTransform: "none",
        justifyContent: "flex-start",
        "&.Mui-selected": {
          color: `${ACCENT[value]}.main`,
          borderColor: `${ACCENT[value]}.main`,
        },
      }}
    >
      <Icon fontSize="small" />
      <Box sx={{ textAlign: "left" }}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2 }}>
          {label} · {count(value)}
        </Typography>
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
          {name}
        </Typography>
      </Box>
    </ToggleButton>
  );

  return (
    <Box sx={{ maxWidth: 900, pb: 4 }}>
      <ToggleButtonGroup
        exclusive
        value={channel}
        onChange={(_, v) => v && setChannel(v)}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        {option("client", StorefrontOutlinedIcon, "Client", clientName)}
        {option("vendor", EngineeringOutlinedIcon, "Vendor", vendorName ?? "No vendor yet")}
      </ToggleButtonGroup>

      {channel === "client" ? (
        <MessageThread
          key="client"
          channel="client"
          recipient={clientName}
          clientName={details?.client}
          accent={ACCENT.client}
          emptyText={`No messages with ${clientName} yet.`}
          blockedReason={
            clientOnPortal
              ? null
              : `${clientName} doesn't use the client portal, so they can't receive messages here.`
          }
        />
      ) : (
        <MessageThread
          key="vendor"
          channel="vendor"
          recipient={vendorName ?? "the vendor"}
          clientName={details?.client}
          accent={ACCENT.vendor}
          emptyText={
            vendorName
              ? `No messages with ${vendorName} yet.`
              : "Assign a vendor to start a conversation."
          }
          blockedReason={vendorName ? null : "Assign a vendor to message them."}
        />
      )}
    </Box>
  );
}
