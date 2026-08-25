// workorder-details/tabs/DetailsTab/WorkOrderDetailsTab.jsx
import { useParams } from "react-router-dom";

// Local Components
import InfoGrid from "../../../../components/InfoGrid";

// Cards
import AssignedVendorCard from "./AssignedVendorCard";
import RoleAssignment from "../../../../components/RoleAssignment";
import GeneralInfoCard from "./GeneralInfoCard";
import WorkOrderSiteCard from "./WorkOrderSiteCard";
import ServicesPricingCard from "./ServicesPricingCard";

import {
  useWorkOrderActions,
  useWorkOrderDetails,
  useWorkOrderSite,
  useWorkOrderServices,
} from "../../WorkOrderDetailProvider";
import VendorOnboardingCard from "./VendorOnboardingCard";

const WORK_ORDER_ENTITY_TYPE_ID = 4; // confirm your actual id

export default function WorkOrderDetailsTab() {
  const { id } = useParams();

  const details = useWorkOrderDetails();
  const site = useWorkOrderSite();
  const services = useWorkOrderServices();

  console.log("work order site", site);

  const {
    updateDetails,
    addService,
    updateService,
    deleteService,
    updateScope, // saves scope_of_work on the work order
  } = useWorkOrderActions();

  return (
    <InfoGrid>
      {/* Row 1: general info + who's assigned */}
      <GeneralInfoCard details={details} onSave={updateDetails} />
      <RoleAssignment
        entity_type_id={WORK_ORDER_ENTITY_TYPE_ID}
        entity_id={Number(id)}
      />

      {/* Row 2: site */}
      <WorkOrderSiteCard site={site} />

      {/* Vendor assignment placeholder (logic later) */}
      <AssignedVendorCard />
      <VendorOnboardingCard />

      {/* Full width: scope + services/pricing */}
      <ServicesPricingCard
        services={services || []}
        scopeOfWork={details?.scope_of_work}
        onAddService={addService}
        onUpdateService={updateService}
        onDeleteService={deleteService}
        onSaveScope={updateDetails}
      />

      {/* Attachments / pre-work images placeholder (logic later) */}
      {/* <AttachmentsCard workOrderId={Number(id)} /> */}
    </InfoGrid>
  );
}
