// components/AddressCard.jsx
//
// Mailing or billing address, the same card on every detail page.
//
//   <AddressCard kind="mailing" details={details} onSave={updateDetails} />
//   <AddressCard kind="billing" details={details} onSave={updateDetails} />
//
// Reads and writes <kind>_address, <kind>_address2, <kind>_city,
// <kind>_state and <kind>_zipcode. Picking a suggestion for the mailing
// address also sets lat and lng (the map pin), as before.
import Typography from "@mui/material/Typography";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

import { FieldRow, InfoCard } from "./InfoGrid";
import AddressAutocomplete from "./AddressAutocomplete";

const TITLES = { mailing: "Mailing Address", billing: "Billing Address" };
const ICONS = {
  mailing: <PlaceOutlinedIcon />,
  billing: <ReceiptLongOutlinedIcon />,
};

export default function AddressCard({
  kind = "mailing",
  details,
  onSave,
  title,
  defaultOpen = true,
}) {
  const k = (field) => `${kind}_${field}`;
  const d = details ?? {};

  return (
    <InfoCard
      title={title ?? TITLES[kind] ?? "Address"}
      icon={ICONS[kind]}
      collapsible
      defaultOpen={defaultOpen}
      editable
      onSave={onSave}
      editValues={d}
    >
      <FieldRow
        label="Address"
        value={d[k("address")]}
        fieldKey={k("address")}
        fullWidth
        render={(value, editing, { onChange }) =>
          editing ? (
            <AddressAutocomplete
              value={value}
              countryRestriction={["us", "ca"]}
              onChange={(text) => onChange(k("address"), text)}
              onSelect={(place) => {
                onChange(k("address"), place.address);
                onChange(k("city"), place.city);
                onChange(k("state"), place.state);
                onChange(k("zipcode"), place.zipcode);
                if (kind === "mailing") {
                  onChange("lat", place.lat);
                  onChange("lng", place.lng);
                }
              }}
            />
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>{value || "—"}</Typography>
          )
        }
      />
      <FieldRow
        label="Address 2"
        value={d[k("address2")]}
        fieldKey={k("address2")}
      />
      <FieldRow label="City" value={d[k("city")]} fieldKey={k("city")} />
      <FieldRow label="State" value={d[k("state")]} fieldKey={k("state")} />
      <FieldRow
        label="Zip Code"
        value={d[k("zipcode")]}
        fieldKey={k("zipcode")}
      />
    </InfoCard>
  );
}
