// Libraries
import { useEffect, useState } from "react";
import axios from "axios";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";
import { useUpdateSingle } from "../../../*/hooks/useUpdateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function SoftwaresAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("softwares");
  const { updateSingle } = useUpdateSingle("softwares");
  const { data: softwares, loading, error } = useFetchAll("softwares");

  // State
  const [localSoftwares, setLocalSoftwares] = useState([]);

  useEffect(() => {
    setLocalSoftwares(softwares);
  }, [softwares]);

  const handleAdd = async (newSoftware) => {
    const created = await createSingle(newSoftware);
    if (created) {
      setLocalSoftwares((prev) => [...prev, created]);
    }
  };

  const onUpdate = async (id, updatedData) => {
    try {
      const updatedSingle = await updateSingle(id, updatedData);
      console.log("Updated software:", updatedSingle);
      setLocalSoftwares((prev) =>
        prev.map((item) => (item.id === id ? updatedSingle : item)),
      );
    } catch (error) {
      console.error("Error updating software:", error);
    }
  };

  return (
    <>
      <ConstantsTable
        title="Softwares"
        items={localSoftwares}
        loading={loading}
        error={error}
        onAdd={handleAdd}
        onUpdate={onUpdate}
      />
    </>
  );
}

export default SoftwaresAdmin;
