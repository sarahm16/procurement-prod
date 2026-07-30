import React, { useEffect, useState } from "react";
import axios from "axios";

// Hooks
import { useClientActions, useClientContracts } from "../ClientDetailProvider";
import { useEmployees } from "../../../*/hooks/useEmployees";

// Local Components
import ContractCard from "./ContractCard";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

function ClientDocumentationTab() {
  const contracts = useClientContracts();
  const { loadContracts, updateContract } = useClientActions();

  const { data: employees = [] } = useEmployees();
  const activeEmployees = employees.filter((e) => !e.terminated);

  useEffect(() => {
    console.log("ClientDocumentationTab contracts:", contracts);
    if (contracts === null) loadContracts();
  }, [contracts, loadContracts]);

  const handleSaveContract = async (contractId, draft) => {
    try {
      await updateContract(contractId, draft);
    } catch (error) {
      console.error("Error updating contract:", error);
    }
  };

  // if (contracts === null) {
  //   return (
  //     <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
  //       <CircularProgress size={28} />
  //     </Box>
  //   );
  // }

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
              employees={activeEmployees}
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
