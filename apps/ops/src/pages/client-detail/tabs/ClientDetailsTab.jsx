// client-detail/tabs/ClientDetailsTab.jsx
//
//   Side (who they are)         Main (what we do for them)
//   ─ Team                      ─ Service Lines
//   ─ Client Info               ─ Contacts
//   ─ Mailing Address
//   ─ Billing Address
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";

import DetailTabLayout from "../../../components/DetailTabLayout";
import { FieldRow, InfoCard } from "../../../components/InfoGrid";
import AddressCard from "../../../components/AddressCard";
import Contacts from "../../../components/Contacts";
import TeamCard from "../../../components/TeamCard";
import ClientServiceLinesCard from "./ClientServiceLinesCard";

import {
  useClientActions,
  useClientContacts,
  useClientDetails,
} from "../ClientDetailProvider";

const CLIENT_ENTITY_TYPE_ID = 3;

// The software that means "this client uses our client portal".
const CLIENT_PORTAL_SOFTWARE = "Sarlacc";
const platformLabel = (name) =>
  name === CLIENT_PORTAL_SOFTWARE ? "NFC Client Portal (Sarlacc)" : name;

function ClientDetailsTab() {
  const { id } = useParams();
  const details = useClientDetails();
  const contacts = useClientContacts();
  const { updateDetails, addContact, updateContact, deleteContact } =
    useClientActions();

  // Platform options: the client platforms, plus Sarlacc (= our client
  // portal). Our other internal systems (UtilizeCore) aren't a client choice.
  const [platforms, setPlatforms] = useState([]);
  useEffect(() => {
    axios
      .get("/api/softwares")
      .then(({ data }) =>
        setPlatforms(
          (Array.isArray(data) ? data : []).filter(
            (p) => !p.is_internal || p.name === CLIENT_PORTAL_SOFTWARE,
          ),
        ),
      )
      .catch((e) => console.error("Error fetching platforms:", e));
  }, []);

  // Segment options (Government, Commercial, Residential).
  const [segments, setSegments] = useState([]);
  useEffect(() => {
    axios
      .get("/api/clients/segments")
      .then(({ data }) => setSegments(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching client segments:", e));
  }, []);

  return (
    <DetailTabLayout
      side={
        <>
          <TeamCard
            entity_type_id={CLIENT_ENTITY_TYPE_ID}
            entity_id={Number(id)}
          />
          <InfoCard
            title="Client Info"
            icon={<ApartmentOutlinedIcon />}
            editable
            onSave={updateDetails}
            editValues={details}
          >
            <FieldRow label="Name" value={details.client} fieldKey="client" />
            <FieldRow
              label="Legal Name"
              value={details.legal_name}
              fieldKey="legal_name"
            />
            <FieldRow
              label="Segment"
              value={details.segment_id}
              fieldKey="segment_id"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(
                        "segment_id",
                        e.target.value === "" ? null : e.target.value,
                      )
                    }
                  >
                    <MenuItem value="">
                      <em>Not set</em>
                    </MenuItem>
                    {segments.map((sg) => (
                      <MenuItem key={sg.id} value={sg.id}>
                        {sg.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {segments.find((sg) => sg.id === value)?.name ??
                      details.segment ??
                      "—"}
                  </Typography>
                )
              }
            />
            <FieldRow
              label="Platform"
              value={details.software_id}
              fieldKey="software_id"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange(
                        "software_id",
                        e.target.value === "" ? null : e.target.value,
                      )
                    }
                  >
                    <MenuItem value="">
                      <em>Not set</em>
                    </MenuItem>
                    {platforms.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {platformLabel(p.name)}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {platformLabel(
                      platforms.find((p) => p.id === value)?.name ??
                        details.software,
                    ) ?? "—"}
                  </Typography>
                )
              }
            />
          </InfoCard>
          <AddressCard
            kind="mailing"
            details={details}
            onSave={updateDetails}
          />
          <AddressCard
            kind="billing"
            details={details}
            onSave={updateDetails}
          />
        </>
      }
      main={
        <>
          <ClientServiceLinesCard />
          <Contacts
            contacts={contacts || []}
            addContact={addContact}
            updateContact={updateContact}
            deleteContact={deleteContact}
          />
        </>
      }
    />
  );
}

export default ClientDetailsTab;
