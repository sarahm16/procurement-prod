// Libraries
import { useParams } from "react-router-dom";
import {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

// Local Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Tabs
import VendorDetailsTab from "./tabs/DetailsTab/VendorDetailsTab";

// Local Functions
import { sendEmailFromHTML } from "../../*/api/microsoftApi";
import { useVendorStatuses } from "../../*/hooks/useVendorStatuses";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";

// Context
export const VendorDetailsContext = createContext(null);
export const VendorTradesContext = createContext(null);
export const VendorDocsContext = createContext(null);
export const VendorSitesContext = createContext(null);
export const VendorWorkOrdersContext = createContext(null);
export const VendorActivityContext = createContext(null);
export const VendorNotesContext = createContext(null);

function VendorDetail() {
  // Get the vendor ID from the URL parameters
  const { id } = useParams();

  // State
  const [vendorDetails, setVendorDetails] = useState({});
  const [vendorDocs, setVendorDocs] = useState({});
  const [vendorSites, setVendorSites] = useState([]);
  const [vendorWorkOrders, setVendorWorkOrders] = useState([]);
  const [vendorActivity, setVendorActivity] = useState([]);
  const [vendorNotes, setVendorNotes] = useState([]);
  const [vendorTrades, setVendorTrades] = useState([]);

  // Hooks
  const { data: vendorStatuses = [] } = useVendorStatuses();
  const { user } = useAuthenticatedUser();

  const fetchVendor = async () => {
    return axios.get(`/api/vendors/${id}`);
  };

  // Fetch vendor details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for vendor ID:", id);
    fetchVendor().then((res) => {
      console.log("Vendor details response:", res.data);
      const vendorData = res.data;

      // General Details Page Layout
      setVendorNotes(vendorData.notes);

      // Details Tab
      setVendorDetails({
        status: vendorData.status,
        company: vendorData.company,
        mailing_address: vendorData.mailing_address,
        mailing_address2: vendorData.mailing_address2,
        mailing_city: vendorData.mailing_city,
        mailing_state: vendorData.mailing_state,
        mailing_zipcode: vendorData.mailing_zipcode,
        contact_name: vendorData.contact_name,
        contact_email: vendorData.contact_email,
        contact_phone: vendorData.contact_phone,
        contact_phone2: vendorData.contact_phone2,
      });
      setVendorTrades(vendorData.trades);
      setVendorActivity(vendorData.activity_log);
    });
  }, [id]);

  const deleteTrade = useCallback(
    async (tradeToDelete) => {
      const deleteResponse = await axios.delete(
        `/api/vendors/${id}/trades/${tradeToDelete.id}`,
      );
      setVendorTrades((prevTrades) =>
        prevTrades.filter((trade) => trade.id !== tradeToDelete.id),
      );
    },
    [id],
  );

  const addTrade = useCallback(
    async (tradeToAdd) => {
      const addResponse = await axios.post(
        `/api/vendors/${id}/trades/${tradeToAdd.id}`,
      );
      console.log("Add association response:", addResponse.data);
      setVendorTrades((prevTrades) => [...prevTrades, tradeToAdd]);
    },
    [id],
  );

  const tradesContextValue = useMemo(
    () => ({ vendorTrades, deleteTrade, addTrade }),
    [vendorTrades, deleteTrade, addTrade],
  );

  const detailsContextValue = useMemo(
    () => ({ vendorDetails, setVendorDetails }),
    [vendorDetails, setVendorDetails],
  );

  /*   const addNote = useCallback(
    async (subject, emailBody, recipients, bccRecipients) => {
      try {
        const response = await sendEmailFromHTML(
          subject,
          emailBody,
          recipients,
          bccRecipients,
        );
        console.log("Email sent successfully:", response);

        setVendorNotes((prevNotes) => [
          ...prevNotes,
          {
            id: Date.now(), // Temporary ID, replace with actual ID from backend if needed
            subject,
            emailBody,
            recipients,
            bccRecipients,
            timestamp: new Date().toISOString(),
          },
        ]);

      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
    [],
  ); */

  const addNote = useCallback(async (payload) => {
    console.log("payload in addNote:", payload);
    // Save note to database here
    const { data } = await axios.post(`/api/notes`, payload);

    // Update local state
    setVendorNotes((prevNotes) => [...prevNotes, data]);
  }, []);

  const updateStatus = async (newStatus) => {
    try {
      const response = await axios.put(`/api/vendors/${id}`, {
        fieldChanged: "status_id",
        newValue: newStatus?.id,
        user_id: user?.id,
      });
      // Use server response rather than the local newStatus object
      setVendorDetails((prev) => ({
        ...prev,
        status_id: response.data.status_id,
        status: response.data.VendorStatus, // ← from include
      }));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <VendorDetailsContext.Provider value={detailsContextValue}>
      <VendorTradesContext.Provider value={tradesContextValue}>
        <DetailPageLayout
          header={
            <DetailPageHeader
              title={vendorDetails.company}
              subtitle={`Details for Vendor ${vendorDetails.company}`}
              status={vendorDetails?.status}
              statusOptions={vendorStatuses}
              onStatusChange={updateStatus}
              breadcrumbs={[
                { label: "Vendors", href: "/vendors" },
                { label: `Vendor #${id}` },
              ]}
              meta={[]}
              address="123 Main St, Anytown, USA"
              onBack={() => console.log("Back button clicked")}
              actions={[]}
            />
          }
          tabs={[
            {
              label: "Details",
              content: <VendorDetailsTab />,
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
              content: (
                <ActivityLog
                  entries={vendorActivity}
                  fieldLabels={{ status_id: "Status" }}
                />
              ),
            },
          ]}
          notes={vendorNotes}
          notesLoading={false}
          onAddNote={addNote}
          currentUser="Sarah Carter"
          entityName={vendorDetails.company}
        />
      </VendorTradesContext.Provider>
    </VendorDetailsContext.Provider>
  );
}

export default VendorDetail;
