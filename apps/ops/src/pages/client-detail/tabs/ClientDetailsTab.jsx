// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../components/InfoGrid";
import { ChipSelectCard } from "../../../components/ChipSelectCard";
import AddressAutocomplete from "../../../components/AddressAutocomplete";
import Contacts from "../../../components/Contacts";

// MUI Components
import Typography from "@mui/material/Typography";

// Hooks
import useAuthenticatedUser from "../../../*/hooks/useAuthenticatedUser";
import {
  useClientActions,
  useClientContacts,
  useClientDetails,
  useClientServiceLines,
} from "../ClientDetailProvider";
import RoleAssignment from "../../../components/RoleAssignment";
import { useParams } from "react-router-dom";

function ClientDetailsTab() {
  const { id } = useParams();
  // Context
  const details = useClientDetails();
  const serviceLines = useClientServiceLines();
  const contacts = useClientContacts();
  const { updateDetails, addContact, updateContact, deleteContact } =
    useClientActions();

  const { user } = useAuthenticatedUser();

  const [allServiceLines, setAllServiceLines] = useState([]);
  const [addingContact, setAddingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const [contactRoles, setContactRoles] = useState([]);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [deletingContact, setDeletingContact] = useState(false);

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

  const handleAddContact = async (form) => {
    setSavingContact(true);
    try {
      await addContact(form);
      setAddingContact(false);
    } catch (error) {
      console.error("Error adding contact:", error);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    setDeletingContact(true);
    try {
      await deleteContact(contactId);
      setContactToDelete(null);
    } catch (error) {
      console.error("Error deleting contact:", error);
    } finally {
      setDeletingContact(false);
    }
  };

  const handleSaveContact = async (contactId, draft) => {
    try {
      await updateContact(contactId, draft);
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

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
        <Contacts
          contacts={contacts}
          addContact={addContact}
          updateContact={updateContact}
          deleteContact={deleteContact}
        />
      </InfoGrid>
    </>
  );
}

export default ClientDetailsTab;
