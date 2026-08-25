// workorder-details/tabs/DetailsTab/WorkOrderSiteCard.jsx
import { InfoCard, FieldRow } from "../../../../components/InfoGrid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const line = (v) => (
  <Typography sx={{ fontSize: "0.85rem" }}>{v || "—"}</Typography>
);

// A value with a launch-in-new-tab icon beside it
const launchLine = (v, href) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
    <Typography
      sx={{
        fontSize: "0.85rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {v || "—"}
    </Typography>
    {v && href && (
      <IconButton
        size="small"
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ p: 0.25, color: "text.secondary", flexShrink: 0 }}
      >
        <OpenInNewIcon sx={{ fontSize: 15 }} />
      </IconButton>
    )}
  </Box>
);

export default function WorkOrderSiteCard({ site }) {
  const location = [site?.mailing_city?.trim(), site?.mailing_state?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <InfoCard title="Site" collapsible defaultOpen span="half">
      <FieldRow
        label="Site"
        value={site?.store}
        render={(v) => launchLine(v, site?.id ? `/sites/${site.id}` : null)}
      />
      <FieldRow
        label="Client"
        value={site?.Client?.client}
        render={(v) =>
          launchLine(v, site?.Client?.id ? `/clients/${site.Client.id}` : null)
        }
      />
      <FieldRow
        label="Address"
        value={site?.mailing_address}
        render={(v) => line(v)}
      />
      <FieldRow label="Location" value={location} render={(v) => line(v)} />
    </InfoCard>
  );
}
