// Libraries
import { useEffect, useState } from "react";
import axios from "axios";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";
import { useUpdateSingle } from "../../../*/hooks/useUpdateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function ServiceLinesAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("serviceLines");
  const { data: serviceLines, loading, error } = useFetchAll("serviceLines");

  // State
  const [localServiceLines, setLocalServiceLines] = useState([]);

  useEffect(() => {
    setLocalServiceLines(serviceLines);
  }, [serviceLines]);

  const handleAdd = async (newServiceLine) => {
    const created = await createSingle(newServiceLine);
    if (created) {
      setLocalServiceLines((prev) => [...prev, created]);
    }
  };

  return (
    <>
      <ConstantsTable
        title="Service Lines"
        items={localServiceLines}
        loading={loading}
        error={error}
        onAdd={handleAdd}
      />
    </>
  );
}

export default ServiceLinesAdmin;
