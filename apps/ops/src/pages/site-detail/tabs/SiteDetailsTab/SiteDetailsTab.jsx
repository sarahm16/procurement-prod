// site-detail/tabs/SiteDetailsTab/SiteDetailsTab.jsx
//
//   Side (reference)            Main (the work)
//   ─ Team                      ─ Service Lines
//   ─ Site Info                 ─ Contacts
//   ─ Mailing Address
//   ─ Billing Address
import { useParams } from "react-router-dom";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import DetailTabLayout from "../../../../components/DetailTabLayout";
import { FieldRow, InfoCard } from "../../../../components/InfoGrid";
import AddressCard from "../../../../components/AddressCard";
import Contacts from "../../../../components/Contacts";
import TeamCard from "../../../../components/TeamCard";
import SiteServiceLinesCard from "./SiteServiceLinesCard";

import {
  useSiteContacts,
  useSiteDetails,
  useSiteActions,
} from "../../SiteDetailProvider";

const SITE_ENTITY_TYPE_ID = 2;

function SiteDetailsTab() {
  const { id } = useParams();
  const details = useSiteDetails();
  const contacts = useSiteContacts();
  const { updateDetails, addContact, updateContact, deleteContact } =
    useSiteActions();

  return (
    <DetailTabLayout
      side={
        <>
          <TeamCard
            entity_type_id={SITE_ENTITY_TYPE_ID}
            entity_id={Number(id)}
          />
          <InfoCard title="Site Info" icon={<StorefrontOutlinedIcon />}>
            <FieldRow label="Client" value={details.client} editable={false} />
            <FieldRow label="Store" value={details.store} editable={false} />
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
          <SiteServiceLinesCard serviceLines={details.service_lines} />
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

export default SiteDetailsTab;
