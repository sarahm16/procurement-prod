// Libraries
import { useEffect, useState } from "react";
import axios from "axios";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";
import { useCreateSingle } from "../../../*/hooks/useCreateSingle";
import { useUpdateSingle } from "../../../*/hooks/useUpdateSingle";

// Local Components
import ConstantsTable from "../components/ConstantsTable";

function TradesAdmin() {
  // Custom hooks
  const { createSingle } = useCreateSingle("trades");
  const { updateSingle } = useUpdateSingle("trades");
  const { data: trades, loading, error } = useFetchAll("trades");

  // State
  const [localTrades, setLocalTrades] = useState([]);

  useEffect(() => {
    setLocalTrades(trades);
  }, [trades]);

  const handleAdd = async (newTrade) => {
    const created = await createSingle(newTrade);
    if (created) {
      setLocalTrades((prev) => [...prev, created]);
    }
  };

  const onUpdate = async (id, updatedData) => {
    try {
      const updatedSingle = await updateSingle(id, updatedData);
      console.log("Updated trade:", updatedSingle);
      setLocalTrades((prev) =>
        prev.map((item) => (item.id === id ? updatedSingle : item)),
      );
    } catch (error) {
      console.error("Error updating trade:", error);
    }
  };

  return (
    <>
      <ConstantsTable
        title="Trades"
        items={localTrades}
        loading={loading}
        error={error}
        onAdd={handleAdd}
        onUpdate={onUpdate}
      />
    </>
  );
}

export default TradesAdmin;
