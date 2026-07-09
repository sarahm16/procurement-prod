// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../components/InfoGrid";
import { ChipSelectCard } from "../../../components/ChipSelectCard";
import AddressAutocomplete from "../../../components/AddressAutocomplete";
import ContactFormModal from "./ContactFormModal";

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
  useClientActions,
  useClientContacts,
  useClientDetails,
  useClientServiceLines,
} from "../ClientDetailProvider";

function ClientDetailsTab() {
  // Context
  const details = useClientDetails();
  const serviceLines = useClientServiceLines();
  const contacts = useClientContacts();
  const { updateDetails } = useClientActions();

  const { user } = useAuthenticatedUser();

  const [allServiceLines, setAllServiceLines] = useState([]);
  const [addingContact, setAddingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const [contactRoles, setContactRoles] = useState([]);

  const fetchAllContactRoles = async () => {
    try {
      const response = await axios.get("/api/contactRoles");
      console.log("All contact roles response:", response.data);
      setContactRoles(response.data);
    } catch (error) {
      console.error("Error fetching contact roles:", error);
    }
  };
  useEffect(() => {
    fetchAllContactRoles();
  }, []);

  const handleAddContact = async (form) => {};

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
          {/* <FieldRow
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
          /> */}
        </InfoCard>

        <ChipSelectCard
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
        />

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
        <Box
          sx={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.disabled",
            }}
          >
            Contacts
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddingContact(true)}
          >
            Add Contact
          </Button>
        </Box>
        {/* then the mapped contact InfoCards */}

        {contacts?.length > 0 &&
          contacts.map((contact) => (
            <InfoCard
              key={contact.id}
              title={`${contact.contact_role} Contact`}
              collapsible
              defaultOpen
              editable
              editValues={contact}
              span="half"
              onSave={(draft) => handleSaveContact(contact.id, draft)}
              actions={
                <Tooltip title="Remove contact">
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteContact(contact)}
                    sx={{
                      color: "text.disabled",
                      "&:hover": { color: "error.main" },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              }
            >
              <FieldRow
                label="Contact Name"
                value={contact.name}
                fieldKey="name"
              />
              <FieldRow
                label="Contact Email"
                value={contact.email}
                fieldKey="email"
              />
              <FieldRow
                label="Contact Phone"
                value={contact.phone}
                fieldKey="phone"
              />
            </InfoCard>
          ))}
      </InfoGrid>
      <ContactFormModal
        open={addingContact}
        onClose={() => setAddingContact(false)}
        onSubmit={handleAddContact}
        roles={contactRoles}
        submitting={savingContact}
      />
    </>
  );
}

export default ClientDetailsTab;
