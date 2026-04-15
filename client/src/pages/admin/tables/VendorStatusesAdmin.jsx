// Libraries
import { useEffect, useState } from "react";
import axios from "axios";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";
import { useUpdateSingle } from "../../../*/hooks/useUpdateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function VendorStatusesAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("vendorStatuses");
  const { updateSingle } = useUpdateSingle("vendorStatuses");
  const {
    data: vendorStatuses,
    loading,
    error,
  } = useFetchAll("vendorStatuses");

  // State
  const [localVendorStatuses, setLocalVendorStatuses] = useState([]);

  useEffect(() => {
    setLocalVendorStatuses(vendorStatuses);
  }, [vendorStatuses]);

  const handleAdd = async (newVendorStatus) => {
    const created = await createSingle(newVendorStatus);
    if (created) {
      setLocalVendorStatuses((prev) => [...prev, created]);
    }
  };

  const onUpdate = async (id, updatedData) => {
    try {
      const updatedSingle = await updateSingle(id, updatedData);
      console.log("Updated vendor status:", updatedSingle);
      setLocalVendorStatuses((prev) =>
        prev.map((item) => (item.id === id ? updatedSingle : item)),
      );
    } catch (error) {
      console.error("Error updating vendor status:", error);
    }
  };

  return (
    <>
      <ConstantsTable
        title="Vendor Statuses"
        items={localVendorStatuses}
        hasDescription={true}
        loading={loading}
        error={error}
        onAdd={handleAdd}
        onUpdate={onUpdate}
      />
    </>
  );
}

export default VendorStatusesAdmin;
