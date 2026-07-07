import { useParams } from "react-router-dom";
import { createContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

// Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Tabs
import ClientDetailsTab from "./tabs/ClientDetailsTab";

// MUI Components
import Typography from "@mui/material/Typography";

// Context
export const ClientDetailContext = createContext(null);
// export const VendorTradesContext = createContext(null);
// export const VendorDocsContext = createContext(null);
// export const VendorSitesContext = createContext(null);
// export const VendorWorkOrdersContext = createContext(null);
export const ClientNotesContext = createContext(null);
export const ClientContactsContext = createContext(null);
export const ClientServiceLinesContext = createContext(null);

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
  const [clientContacts, setClientContacts] = useState([]);
  const [clientServiceLines, setClientServiceLines] = useState([]);

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
        client: clientData.client,
        legal_name: clientData.legal_name,
        mailing_address: clientData.mailing_address,
        mailing_address2: clientData.mailing_address2,
        mailing_city: clientData.mailing_city,
        mailing_state: clientData.mailing_state,
        mailing_zipcode: clientData.mailing_zipcode,
        billing_address: clientData.billing_address,
        billing_address2: clientData.billing_address2,
        billing_city: clientData.billing_city,
        billing_state: clientData.billing_state,
        billing_zipcode: clientData.billing_zipcode,
      });
      setClientActivity(clientData.activity_log);
      setClientContacts(clientData.contacts);
      setClientServiceLines(clientData.service_lines);
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
    <ClientDetailContext.Provider value={{ clientDetails, updateClient }}>
      <ClientContactsContext.Provider
        value={{ clientContacts, setClientContacts }}
      >
        <ClientServiceLinesContext.Provider
          value={{ clientServiceLines, setClientServiceLines }}
        >
          <DetailPageLayout
            header={
              <DetailPageHeader
                title={`Client ${clientDetails?.client}`}
                subtitle={`Details for ${clientDetails?.client}`}
                status="active"
                statusOptions={["active", "inactive", "suspended", "pending"]}
                onStatusChange={(newStatus) =>
                  console.log("Status changed to:", newStatus)
                }
                breadcrumbs={[
                  { label: "Clients", href: "/clients" },
                  { label: clientDetails?.client },
                ]}
                meta={[]}
                address={`${clientDetails?.mailing_address}, ${clientDetails?.mailing_city}, ${clientDetails?.mailing_state} ${clientDetails?.mailing_zipcode}`}
                onBack={() => console.log("Back button clicked")}
                actions={[]}
              />
            }
            notes={clientNotes}
            onAddNote={addNote}
            tabs={[
              {
                label: "Details",
                content: <ClientDetailsTab />,
              },
              {
                label: "Documentation",
                content: <></>,
              },
              {
                label: "Sites",
                content: <></>,
              },
              {
                label: "Work Orders",
                content: <></>,
              },
              {
                label: "Activity",
                content: <></>,
                // content: (
                //   <ActivityLog
                //     entries={clientActivity}
                //     fieldLabels={{ status_id: "Status" }}
                //     valueFormatters={{
                //       status_id: (value) => {
                //         const status = vendorStatuses.find(
                //           (s) => s.id === Number(value),
                //         );
                //         return status ? status.name : value;
                //       },
                //     }}
                //   />
                // ),
              },
            ]}
          >
            <Typography variant="h6" gutterBottom>
              Client Details Content Goes Here
            </Typography>
          </DetailPageLayout>
        </ClientServiceLinesContext.Provider>
      </ClientContactsContext.Provider>
    </ClientDetailContext.Provider>
  );
}

export default ClientDetail;
