// vendor-detail/tabs/DetailsTab/VendorDetailsTab.jsx
//
//   Side (reference)            Main (the work)
//   ─ Team                      ─ Trades
//   ─ Vendor Info               ─ Contacts
//   ─ Mailing Address
//   ─ Billing Address
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";

import DetailTabLayout from "../../../../components/DetailTabLayout";
import { FieldRow, InfoCard } from "../../../../components/InfoGrid";
import { ChipSelectCard } from "../../../../components/ChipSelectCard";
import AddressCard from "../../../../components/AddressCard";
import Contacts from "../../../../components/Contacts";
import TeamCard from "../../../../components/TeamCard";
import VendorQuickBooksCard from "./VendorQuickBooksCard";
import VendorNoticesSummary from "../../components/VendorNoticesSummary";

import {
  useVendorActions,
  useVendorDetails,
  useVendorTrades,
  useVendorContacts,
} from "../../VendorDetailProvider";

const VENDOR_ENTITY_TYPE_ID = 1;

function VendorDetailsTab() {
  const { id } = useParams();
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

  const [allTrades, setAllTrades] = useState([]);
  useEffect(() => {
    axios
      .get("/api/trades")
      .then(({ data }) => setAllTrades(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching trades:", e));
  }, []);

  return (
    <DetailTabLayout
      side={
        <>
          <TeamCard
            entity_type_id={VENDOR_ENTITY_TYPE_ID}
            entity_id={Number(id)}
          />
          <InfoCard
            title="Vendor Info"
            icon={<BusinessOutlinedIcon />}
            editable
            onSave={updateDetails}
            editValues={details}
          >
            <FieldRow
              label="Company"
              value={details.company}
              fieldKey="company"
            />
            <FieldRow
              label="Contact Name"
              value={details.contact_name}
              fieldKey="contact_name"
            />
            <FieldRow
              label="Contact Phone"
              value={details.contact_phone}
              fieldKey="contact_phone"
            />
            <FieldRow
              label="Secondary Phone"
              value={details.secondary_phone}
              fieldKey="secondary_phone"
            />
            <FieldRow
              label="Contact Email"
              value={details.contact_email}
              fieldKey="contact_email"
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
          <VendorNoticesSummary vendorId={Number(id)} />
          <ChipSelectCard
            title="Trades"
            icon={<HandymanOutlinedIcon />}
            options={allTrades}
            value={trades}
            emptyMessage="No trades yet"
            onDelete={deleteTrade}
            onAdd={addTrade}
          />
          <Contacts
            contacts={contacts || []}
            addContact={addContact}
            updateContact={updateContact}
            deleteContact={deleteContact}
          />
          <VendorQuickBooksCard
            vendorId={Number(id)}
            company={details.company}
            quickbooksId={details.quickbooks_id}
          />
        </>
      }
    />
  );
}

export default VendorDetailsTab;
