// Libraries
import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

// Local Components
import InfoGrid, { FieldRow, InfoCard } from "../../../../components/InfoGrid";
import { ChipSelectCard } from "../../../../components/ChipSelectCard";
import AddressAutocomplete from "../../../../components/AddressAutocomplete";
import RoleAssignment from "../../../../components/RoleAssignment";
// import Contacts from "../../../../components/Contacts";

// Context
import {
  useWorkOrderActions,
  useWorkOrderDetails,
  useWorkOrderServices,
  //   useWorkOrderContacts,
} from "../../WorkOrderDetailProvider";

// MUI Components
import Typography from "@mui/material/Typography";

function WorkOrderDetailsTab() {
  const { id } = useParams();
  // Context
  const details = useWorkOrderDetails();
  const services = useWorkOrderServices();
  //   const contacts = useWorkOrderContacts();

  const {
    deleteService,
    addService,
    updateDetails,
    // addContact,
    // updateContact,
    // deleteContact,
  } = useWorkOrderActions();

  // State
  const [allServices, setAllServices] = useState([]);

  useEffect(() => {
    const fetchAllServices = async () => {
      try {
        const response = await axios.get("/api/trades");
        setAllServices(response.data);
      } catch (error) {
        console.error("Error fetching trades:", error);
      }
    };
    fetchAllServices();
  }, []);

  return (
    <>
      <InfoGrid>
        <RoleAssignment entity_type_id={4} entity_id={Number(id)} />
        <InfoCard
          title="Work Order Info"
          icon={null}
          collapsible
          defaultOpen
          editable
          onSave={updateDetails}
          actions={[]}
          editValues={details}
          span="half"
        ></InfoCard>

        <InfoCard
          title="Work Order Mailing Address"
          icon={null}
          collapsible
          defaultOpen
          editable
          onSave={updateDetails}
          actions={[]}
          editValues={details}
          span="half"
        ></InfoCard>
        <InfoCard
          title="Work Order Billing Address"
          icon={null}
          collapsible
          defaultOpen
          editable
          onSave={updateDetails}
          actions={[]}
          editValues={details}
          span="half"
        ></InfoCard>

        {/* <Contacts
          contacts={contacts || []}
          addContact={addContact}
          updateContact={updateContact}
          deleteContact={deleteContact}
        /> */}
      </InfoGrid>
    </>
  );
}

export default WorkOrderDetailsTab;
