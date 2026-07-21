// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../components/InfoGrid";
import { ChipSelectCard } from "../../../components/ChipSelectCard";
import AddressAutocomplete from "../../../components/AddressAutocomplete";
import ContactFormModal from "../../../components/Forms/ContactFormModal";
import ConfirmDialog from "../../../components/ConfirmDialog";

// MUI Components
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";

// Hooks
import useAuthenticatedUser from "../../../*/hooks/useAuthenticatedUser";

import {
  useSiteContacts,
  useSiteDetails,
  useSiteActions,
} from "../SiteDetailProvider";
import Contacts from "../../../components/Contacts";

function SiteDetailsTab() {
  // Context
  const details = useSiteDetails();
  const contacts = useSiteContacts();
  const { updateDetails, addContact, updateContact, deleteContact } =
    useSiteActions();

  const { user } = useAuthenticatedUser();

  const [allServiceLines, setAllServiceLines] = useState([]);

  useEffect(() => {
    const fetchAllServiceLines = async () => {
      try {
        const response = await axios.get("/api/serviceLines");
        console.log("All service lines response:", response.data);
        setAllServiceLines(response.data);
      } catch (error) {
        console.error("Error fetching service lines:", error);
      }
    };
    fetchAllServiceLines();
  }, []);

  return (
    <>
      <InfoGrid>
        <InfoCard
          title="Site Info"
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
            label={"Client"}
            value={details.client}
            editing={false}
            fieldKey="client"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable={false}
          />
          <FieldRow
            label={"Store"}
            value={details.store}
            editing={false}
            fieldKey="store"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable={false}
          />
        </InfoCard>

        {/* <ChipSelectCard
          title="Service Lines"
          options={allServiceLines}
          value={serviceLines}
          onDelete={(serviceLine) => {
            console.log("Deleting service line:", serviceLine);
            // deleteServiceLine(serviceLine);
          }}
          onAdd={(serviceLine) => {
            console.log("Adding service line:", serviceLine);
            // addServiceLine(serviceLine);
          }}
        /> */}

        <InfoCard
          title="Site Mailing Address"
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
          title="Site Billing Address"
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

        {/* Reusable Contacts Component */}

        <Contacts
          contacts={contacts}
          updateContact={updateContact}
          addContact={addContact}
          deleteContact={deleteContact}
        />
      </InfoGrid>
    </>
  );
}

export default SiteDetailsTab;
