// Libraries
import { useEffect, useState } from "react";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function ServiceLinesAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("serviceLines");
  const { data: serviceLines, loading, error } = useFetchAll("serviceLines");

  console.log("serviceLines", serviceLines);

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

  /*   15.197.148.33
   */
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
