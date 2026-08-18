// workorder-details/tabs/DetailsTab/WorkOrderSiteCard.jsx
import { InfoCard, FieldRow } from "../../../../components/InfoGrid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const line = (v) => (
  <Typography sx={{ fontSize: "0.85rem" }}>{v || "—"}</Typography>
);

export default function WorkOrderSiteCard({ site }) {
  // site comes from the work order's Site relation
  const location = [site?.mailing_city?.trim(), site?.mailing_state?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <InfoCard title="Site" collapsible defaultOpen span="half">
      <FieldRow
        label="Site"
        value={site?.store}
        render={(v) => (
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {v || "—"}
          </Typography>
        )}
      />
      <FieldRow
        label="Client"
        value={site?.Client?.client}
        render={(v) => line(v)}
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
