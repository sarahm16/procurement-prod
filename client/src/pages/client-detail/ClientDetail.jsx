import { useParams } from "react-router-dom";
import { createContext, useEffect, useState } from "react";

// Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// MUI Components
import { Typography } from "@mui/material";

// Context
const ClientDetailContext = createContext({
  client: {},
  updateClient: () => {},
});

function ClientDetail() {
  // Get the client ID from the URL parameters
  const { id } = useParams();

  // State
  const [client, setClient] = useState({});

  const updateClient = async (updates) => {
    // Update the client in the database

    // Update the client locally
    setClient((prev) => ({ ...prev, ...updates }));
  };

  // Fetch client details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for client ID:", id);
  }, [id]);

  return (
    <ClientDetailContext.Provider value={{ client, updateClient }}>
      <DetailPageLayout
        header={
          <DetailPageHeader
            title={`Client #${id}`}
            subtitle={`Details for Client #${id}`}
            status="active"
            statusOptions={["active", "inactive", "suspended", "pending"]}
            onStatusChange={(newStatus) =>
              console.log("Status changed to:", newStatus)
            }
            breadcrumbs={[
              { label: "Clients", href: "/clients" },
              { label: `Client #${id}` },
            ]}
            meta={[]}
            address="123 Main St, Anytown, USA"
            onBack={() => console.log("Back button clicked")}
            actions={[]}
          />
        }
      >
        <Typography variant="h6" gutterBottom>
          Client Details Content Goes Here
        </Typography>
      </DetailPageLayout>
    </ClientDetailContext.Provider>
  );
}

export default ClientDetail;
