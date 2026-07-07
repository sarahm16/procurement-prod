import { useParams } from "react-router-dom";
import { createContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

// Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// MUI Components
import Typography from "@mui/material/Typography";

// Context
const ClientDetailContext = createContext({
  client: {},
  updateClient: () => {},
});

const fetchClient = async (id) => {
  return axios.get(`/api/clients/${id}`);
};

function ClientDetail() {
  // Get the client ID from the URL parameters
  const { id } = useParams();

  // State
  const [client, setClient] = useState({});
  const [clientNotes, setClientNotes] = useState([]);
  const [clientDetails, setClientDetails] = useState({});
  const [clientActivity, setClientActivity] = useState([]);

  const updateClient = async (updates) => {
    // Update the client in the database

    // Update the client locally
    setClient((prev) => ({ ...prev, ...updates }));
  };

  // Fetch client details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for client ID:", id);

    console.log("Fetching details for client ID:", id);
    fetchClient(id).then((res) => {
      console.log("Client details response:", res.data);
      const clientData = res.data;
      setClient(clientData);

      // General Details Page Layout
      setClientNotes(clientData.notes);

      // Details Tab
      setClientDetails({
        status: clientData.status,
        company: clientData.company,
        mailing_address: clientData.mailing_address,
        mailing_address2: clientData.mailing_address2,
        mailing_city: clientData.mailing_city,
        mailing_state: clientData.mailing_state,
        mailing_zipcode: clientData.mailing_zipcode,
      });
      setClientActivity(clientData.activity_log);
    });
  }, [id]);

  const addNote = useCallback(async (payload) => {
    console.log("payload in addNote:", payload);
    // Save note to database here
    const { data } = await axios.post(`/api/notes`, payload);

    // Update local state
    setClientNotes((prevNotes) => [...prevNotes, data]);
  }, []);

  return (
    <ClientDetailContext.Provider value={{ client, updateClient }}>
      <DetailPageLayout
        header={
          <DetailPageHeader
            title={`Client ${client?.client}`}
            subtitle={`Details for ${client?.client}`}
            status="active"
            statusOptions={["active", "inactive", "suspended", "pending"]}
            onStatusChange={(newStatus) =>
              console.log("Status changed to:", newStatus)
            }
            breadcrumbs={[
              { label: "Clients", href: "/clients" },
              { label: client?.client },
            ]}
            meta={[]}
            address="123 Main St, Anytown, USA"
            onBack={() => console.log("Back button clicked")}
            actions={[]}
          />
        }
        notes={clientNotes}
        onAddNote={addNote}
      >
        <Typography variant="h6" gutterBottom>
          Client Details Content Goes Here
        </Typography>
      </DetailPageLayout>
    </ClientDetailContext.Provider>
  );
}

export default ClientDetail;
