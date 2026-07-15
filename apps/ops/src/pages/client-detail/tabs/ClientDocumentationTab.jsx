import React, { useEffect, useState } from "react";
import axios from "axios";

// Hooks
import { useClientActions, useClientContracts } from "../ClientDetailProvider";

// Local Components
import ContractCard from "./ContractCard";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

function ClientDocumentationTab() {
  const contracts = useClientContracts();
  const { loadContracts, updateContract } = useClientActions();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("ClientDocumentationTab contracts:", contracts);
    if (contracts === null) loadContracts();
  }, [contracts, loadContracts]);

  useEffect(() => {
    let active = true;
    axios.get("/api/employees").then(({ data }) => {
      if (!active) return;
      setEmployees(data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSaveContract = async (contractId, draft) => {
    try {
      await updateContract(contractId, draft);
    } catch (error) {
      console.error("Error updating contract:", error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (contracts && !contracts.length) {
    return (
      <Typography sx={{ py: 4, color: "text.disabled", textAlign: "center" }}>
        No contracts for this client yet.
      </Typography>
    );
  }

  return (
    <>
      <Box sx={{ pb: 4 }}>
        {contracts &&
          contracts.length &&
          contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              employees={employees}
              onSave={(draft) => {
                // TODO: PUT /api/contracts/:id — the diff+log route, same shape as clients
                console.log("save contract", contract.id, draft);

                handleSaveContract(contract.id, draft);
              }}
            />
          ))}
      </Box>
    </>
  );
}

export default ClientDocumentationTab;
