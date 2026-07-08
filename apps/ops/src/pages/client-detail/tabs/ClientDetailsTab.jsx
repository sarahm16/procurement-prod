// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../components/InfoGrid";
import { ChipSelectCard } from "../../../components/ChipSelectCard";
import AddressAutocomplete from "../../../components/AddressAutocomplete";

// Context
import {
  ClientContactsContext,
  ClientDetailContext,
  ClientServiceLinesContext,
} from "../ClientDetail";

import Typography from "@mui/material/Typography";
import useAuthenticatedUser from "../../../*/hooks/useAuthenticatedUser";

function ClientDetailsTab() {
  // Context
  const { clientDetails, updateClientDetailsLocally } =
    useContext(ClientDetailContext);
  const { clientServiceLines } = useContext(ClientServiceLinesContext);
  const { clientContacts } = useContext(ClientContactsContext);

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

  const handleSaveDetails = async (draft) => {
    try {
      axios
        .put(`/api/clients/${clientDetails.id}`, {
          user_id: user?.id,
          changes: draft,
        })
        .then((response) => {
          console.log("Client updated successfully:", response.data);
          updateClientDetailsLocally(draft);
        })
        .catch((error) => {
          console.error("Error updating client:", error);
        });
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  return (
    <>
      <InfoGrid>
        <InfoCard
          title="Client Info"
          icon={null}
          collapsible
          defaultOpen
          editable
          onSave={handleSaveDetails}
          actions={[]}
          editValues={clientDetails}
          span="half"
        >
          <FieldRow
            label={"Name"}
            value={clientDetails.client}
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
            value={clientDetails.legal_name}
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
            value={clientDetails.contact_name}
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
            value={clientDetails.contact_phone}
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
            value={clientDetails.secondary_phone}
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
            value={clientDetails.contact_email}
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
          value={clientServiceLines}
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
          onSave={handleSaveDetails}
          actions={[]}
          editValues={clientDetails}
          span="half"
        >
          <FieldRow
            label="Address"
            value={clientDetails.mailing_address}
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
            value={clientDetails.mailing_address2}
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
            value={clientDetails.mailing_city}
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
            value={clientDetails.mailing_state}
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
            value={clientDetails.mailing_zipcode}
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
          onSave={handleSaveDetails}
          actions={[]}
          editValues={clientDetails}
          span="half"
        >
          <FieldRow
            label="Address"
            value={clientDetails.billing_address}
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
            value={clientDetails.billing_address2}
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
            value={clientDetails.billing_city}
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
            value={clientDetails.billing_state}
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
            value={clientDetails.billing_zipcode}
            editing={false}
            fieldKey="billing_zipcode"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
        </InfoCard>

        {clientContacts?.length > 0 &&
          clientContacts.map((contact) => (
            <InfoCard
              title={`${contact.contact_role} Contact`}
              icon={null}
              collapsible
              defaultOpen
              editable
              onSave={() => {}}
              actions={[]}
              editValues={contact}
              span="half"
            >
              <FieldRow
                label={"Contact Name"}
                value={contact.name}
                editing={false}
                fieldKey="name"
                onChange={() => {}}
                fullWidth={false}
                type="text"
                render={false}
                editable
              />
              <FieldRow
                label={"Contact Email"}
                value={contact.email}
                editing={false}
                fieldKey="email"
                onChange={() => {}}
                fullWidth={false}
                type="text"
                render={false}
                editable
              />
              <FieldRow
                label={"Contact Phone"}
                value={contact.phone}
                editing={false}
                fieldKey="phone"
                onChange={() => {}}
                fullWidth={false}
                type="text"
                render={false}
                editable
              />
            </InfoCard>
          ))}
      </InfoGrid>
    </>
  );
}

export default ClientDetailsTab;
