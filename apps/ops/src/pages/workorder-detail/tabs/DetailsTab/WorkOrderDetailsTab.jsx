// workorder-details/tabs/DetailsTab/WorkOrderDetailsTab.jsx
//
//   Side (reference)            Main (the work)
//   ─ Team                      ─ Assigned Vendor | Vendor Onboarding
//   ─ Work Order Info           ─ Scope & Pricing
//   ─ Site                      ─ Mobilization Fee
//                               ─ Linked Work Orders
import { useParams } from "react-router-dom";

import DetailTabLayout, {
  CardPair,
} from "../../../../components/DetailTabLayout";
import TeamCard from "../../../../components/TeamCard";

import AssignedVendorCard from "./AssignedVendorCard";
import GeneralInfoCard from "./GeneralInfoCard";
import WorkOrderSiteCard from "./WorkOrderSiteCard";
import ServicesPricingCard from "./ServicesPricingCard";
import VendorOnboardingCard from "./VendorOnboardingCard";
import LinkedWorkOrders from "./LinkedWorkOrders";
import MobilizationFeeCard from "./MobilizationFeeCard";

import {
  useWorkOrderActions,
  useWorkOrderDetails,
  useWorkOrderSite,
  useWorkOrderServices,
} from "../../WorkOrderDetailProvider";

const WORK_ORDER_ENTITY_TYPE_ID = 4;

export default function WorkOrderDetailsTab() {
  const { id } = useParams();

  const details = useWorkOrderDetails();
  const site = useWorkOrderSite();
  const services = useWorkOrderServices();
  const { updateDetails, addService, updateService, deleteService } =
    useWorkOrderActions();

  return (
    <DetailTabLayout
      side={
        <>
          <TeamCard
            entity_type_id={WORK_ORDER_ENTITY_TYPE_ID}
            entity_id={Number(id)}
          />
          <GeneralInfoCard details={details} onSave={updateDetails} />
          <WorkOrderSiteCard site={site} />
        </>
      }
      main={
        <>
          <CardPair>
            <AssignedVendorCard />
            <VendorOnboardingCard />
          </CardPair>
          <ServicesPricingCard
            services={services || []}
            scopeOfWork={details?.scope_of_work}
            onAddService={addService}
            onUpdateService={updateService}
            onDeleteService={deleteService}
            onSaveScope={updateDetails}
          />
          <MobilizationFeeCard />
          <LinkedWorkOrders />
        </>
      }
    />
  );
}
