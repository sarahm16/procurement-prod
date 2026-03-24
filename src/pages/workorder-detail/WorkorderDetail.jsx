import { useParams } from "react-router-dom";
import { useEffect } from "react";

// Components
import DetailPageHeader from "../../components/DetailPageHeader";

function WorkorderDetail() {
  // Get the work order ID from the URL parameters
  const { id } = useParams();

  // State

  // Fetch work order details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for work order ID:", id);
  }, [id]);

  return (
    <>
      <DetailPageHeader
        title={`Work Order #${id}`}
        subtitle={`Details for Work Order #${id}`}
        status="open"
        statusOptions={[
          "open",
          "in progress",
          "completed",
          "cancelled",
          "pending",
        ]}
        onStatusChange={(newStatus) =>
          console.log("Status changed to:", newStatus)
        }
        breadcrumbs={[
          { label: "Work Orders", href: "/workorders" },
          { label: `Work Order #${id}` },
        ]}
        meta={[]}
        address="123 Main St, Anytown, USA"
        onBack={() => console.log("Back button clicked")}
        actions={[]}
      />
    </>
  );
}

export default WorkorderDetail;
