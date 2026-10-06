// Libraries
import { useParams } from "react-router-dom";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../components/InfoGrid";
import AddressAutocomplete from "../../../components/AddressAutocomplete";
import Contacts from "../../../components/Contacts";

import RoleAssignment from "../../../components/RoleAssignment";
import ClientServiceLinesCard from "./ClientServiceLinesCard";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Context
import {
  useClientActions,
  useClientContacts,
  useClientDetails,
} from "../ClientDetailProvider";

/**
 * Two independent columns instead of one grid, so a tall card on one side
 * doesn't leave a gap on the other. Stacks to one column on narrow screens.
 *
 *   Left (what we do for them):  Service Lines, Contacts
 *   Right (who they are):        Team, Client Info, Mailing, Billing
 */
const Column = ({ children }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      minWidth: 0,
    }}
  >
    {children}
  </Box>
);

function ClientDetailsTab() {
  const { id } = useParams();
  const details = useClientDetails();
  const contacts = useClientContacts();
  const { updateDetails, addContact, updateContact, deleteContact } =
    useClientActions();

  return (
    <InfoGrid>
      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 7fr) minmax(0, 5fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Column>
          <ClientServiceLinesCard />
          <Contacts
            contacts={contacts}
            addContact={addContact}
            updateContact={updateContact}
            deleteContact={deleteContact}
          />
        </Column>

        <Column>
          <RoleAssignment entity_type_id={3} entity_id={Number(id)} />
          <InfoCard
            title="Client Info"
            icon={null}
            collapsible
            defaultOpen
            editable
            onSave={updateDetails}
            actions={[]}
            editValues={details}
            span="half"
          >
            <FieldRow
              label={"Name"}
              value={details.client}
              editing={false}
              fieldKey="client"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"Legal Name"}
              value={details.legal_name}
              editing={false}
              fieldKey="legal_name"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
          </InfoCard>
          <InfoCard
            title="Client Mailing Address"
            icon={null}
            collapsible
            defaultOpen
            editable
            onSave={updateDetails}
            actions={[]}
            editValues={details}
            span="half"
          >
            <FieldRow
              label="Address"
              value={details.mailing_address}
              fieldKey="mailing_address"
              fullWidth
              render={(value, editing, { onChange }) =>
                editing ? (
                  <AddressAutocomplete
                    value={value}
                    countryRestriction={["us", "ca"]}
                    onChange={(text) => onChange("mailing_address", text)}
                    onSelect={(place) => {
                      onChange("mailing_address", place.address);
                      onChange("mailing_city", place.city);
                      onChange("mailing_state", place.state);
                      onChange("mailing_zipcode", place.zipcode);
                      onChange("lat", place.lat);
                      onChange("lng", place.lng);
                    }}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {value || "—"}
                  </Typography>
                )
              }
            />
            <FieldRow
              label={"Address 2"}
              value={details.mailing_address2}
              editing={false}
              fieldKey="mailing_address2"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"City"}
              value={details.mailing_city}
              editing={false}
              fieldKey="mailing_city"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"State"}
              value={details.mailing_state}
              editing={false}
              fieldKey="mailing_state"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"Zip Code"}
              value={details.mailing_zipcode}
              editing={false}
              fieldKey="mailing_zipcode"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
          </InfoCard>
          <InfoCard
            title="Client Billing Address"
            icon={null}
            collapsible
            defaultOpen
            editable
            onSave={updateDetails}
            actions={[]}
            editValues={details}
            span="half"
          >
            <FieldRow
              label="Address"
              value={details.billing_address}
              fieldKey="billing_address"
              fullWidth
              render={(value, editing, { onChange }) =>
                editing ? (
                  <AddressAutocomplete
                    value={value}
                    countryRestriction={["us", "ca"]}
                    onChange={(text) => onChange("billing_address", text)}
                    onSelect={(place) => {
                      onChange("billing_address", place.address);
                      onChange("billing_city", place.city);
                      onChange("billing_state", place.state);
                      onChange("billing_zipcode", place.zipcode);
                    }}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {value || "—"}
                  </Typography>
                )
              }
            />
            <FieldRow
              label={"Address 2"}
              value={details.billing_address2}
              editing={false}
              fieldKey="billing_address2"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"City"}
              value={details.billing_city}
              editing={false}
              fieldKey="billing_city"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"State"}
              value={details.billing_state}
              editing={false}
              fieldKey="billing_state"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
            <FieldRow
              label={"Zip Code"}
              value={details.billing_zipcode}
              editing={false}
              fieldKey="billing_zipcode"
              onChange={() => {}}
              fullWidth={false}
              type="text"
              render={false}
              editable
            />
          </InfoCard>
        </Column>
      </Box>
    </InfoGrid>
  );
}

export default ClientDetailsTab;
