// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../../components/InfoGrid";
import { ChipSelectCard } from "../../../../components/ChipSelectCard";
import AddressAutocomplete from "../../../../components/AddressAutocomplete";
import RoleAssignment from "../../../../components/RoleAssignment";
import Contacts from "../../../../components/Contacts";

// Context
import {
  useVendorActions,
  useVendorDetails,
  useVendorTrades,
  useVendorContacts,
} from "../../VendorDetailProvider";

// MUI Components
import Typography from "@mui/material/Typography";

function VendorDetailsTab() {
  const { id } = useParams();
  // Context
  const details = useVendorDetails();
  const trades = useVendorTrades();
  const contacts = useVendorContacts();

  const {
    deleteTrade,
    addTrade,
    updateDetails,
    addContact,
    updateContact,
    deleteContact,
  } = useVendorActions();

  // State
  const [allTrades, setAllTrades] = useState([]);

  useEffect(() => {
    const fetchAllTrades = async () => {
      try {
        const response = await axios.get("/api/trades");
        setAllTrades(response.data);
      } catch (error) {
        console.error("Error fetching trades:", error);
      }
    };
    fetchAllTrades();
  }, []);

  return (
    <>
      <InfoGrid>
        <RoleAssignment entity_type_id={1} entity_id={Number(id)} />
        <InfoCard
          title="Vendor Info"
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
            label={"Company"}
            value={details.company}
            editing={false}
            fieldKey="company"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
          <FieldRow
            label={"Contact Name"}
            value={details.contact_name}
            editing={false}
            fieldKey="contact_name"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
          <FieldRow
            label={"Contact Phone"}
            value={details.contact_phone}
            editing={false}
            fieldKey="contact_phone"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
          <FieldRow
            label={"Secondary Phone"}
            value={details.secondary_phone}
            editing={false}
            fieldKey="secondary_phone"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
          <FieldRow
            label={"Contact Email"}
            value={details.contact_email}
            editing={false}
            fieldKey="contact_email"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
        </InfoCard>

        <ChipSelectCard
          title="Trades"
          options={allTrades}
          value={trades}
          /*           onChange={setLocalTrades}
           */ onDelete={(trade) => {
            console.log("Deleting trade:", trade);
            deleteTrade(trade);
          }}
          onAdd={(trade) => {
            console.log("Adding trade:", trade);
            addTrade(trade);
          }}
        />

        <InfoCard
          title="Vendor Mailing Address"
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
                    console.log(place);
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
          title="Vendor Billing Address"
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
                    console.log(place);
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

        <Contacts
          contacts={contacts || []}
          addContact={addContact}
          updateContact={updateContact}
          deleteContact={deleteContact}
        />
      </InfoGrid>
    </>
  );
}

export default VendorDetailsTab;
