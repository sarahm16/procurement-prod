// workorder-details/tabs/DetailsTab/WorkOrderSiteCard.jsx
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { InfoCard, FieldRow } from "../../../../components/InfoGrid";

export default function WorkOrderSiteCard({ site }) {
  const location = [site?.mailing_city?.trim(), site?.mailing_state?.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <InfoCard title="Site" icon={<PlaceOutlinedIcon />} collapsible defaultOpen>
      <FieldRow
        label="Site"
        value={site?.store}
        link={site?.id ? `/sites/${site.id}` : null}
      />
      <FieldRow
        label="Client"
        value={site?.Client?.client}
        link={site?.Client?.id ? `/clients/${site.Client.id}` : null}
      />
      <FieldRow label="Address" value={site?.mailing_address} />
      <FieldRow label="Location" value={location} />
    </InfoCard>
  );
}
