// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../../components/InfoGrid";
import { ChipSelectCard } from "../../../../components/ChipSelectCard";

// Context
import { VendorDetailsContext, VendorTradesContext } from "../../VendorDetail";

function VendorDetailsTab() {
  // Context
  const { vendorDetails } = useContext(VendorDetailsContext);
  const { vendorTrades, deleteTrade, addTrade } =
    useContext(VendorTradesContext);

  // State
  const [allTrades, setAllTrades] = useState([]);

  useEffect(() => {
    const fetchAllTrades = async () => {
      try {
        const response = await axios.get("/api/trades");
        console.log("All trades response:", response.data);
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
        <InfoCard
          title="Vendor Info"
          icon={null}
          collapsible
          defaultOpen
          editable
          onSave={() => {}}
          actions={[]}
          editValues={vendorDetails}
          span="half"
        >
          <FieldRow
            label={"Company"}
            value={vendorDetails.company}
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
            value={vendorDetails.contact_name}
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
            value={vendorDetails.contact_phone}
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
            value={vendorDetails.secondary_phone}
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
            value={vendorDetails.contact_email}
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
          value={vendorTrades}
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
          title="Vendor Address"
          icon={null}
          collapsible
          defaultOpen
          editable
          onSave={() => {}}
          actions={[]}
          editValues={vendorDetails}
          span="half"
        >
          <FieldRow
            label={"Address"}
            value={vendorDetails.mailing_address}
            editing={false}
            fieldKey="mailing_address"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
          <FieldRow
            label={"Address 2"}
            value={vendorDetails.mailing_address2}
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
            value={vendorDetails.mailing_city}
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
            value={vendorDetails.mailing_state}
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
            value={vendorDetails.mailing_zipcode}
            editing={false}
            fieldKey="mailing_zipcode"
            onChange={() => {}}
            fullWidth={false}
            type="text"
            render={false}
            editable
          />
        </InfoCard>
      </InfoGrid>
    </>
  );
}

export default VendorDetailsTab;
