// Libraries
import { useParams } from "react-router-dom";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Local Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Context
const VendorDetailContext = createContext({
  vendorDetails: {},
});

const VendorDocsContext = createContext({
  vendorDocs: {},
});

const VendorSitesContext = createContext({
  vendorSites: [],
});

const VendorWorkOrdersContext = createContext({
  vendorWorkOrders: [],
});

const VendorActivityContext = createContext({
  vendorActivity: [],
});

function VendorDetail() {
  // Get the vendor ID from the URL parameters
  const { id } = useParams();

  // State
  const [vendorDetails, setVendorDetails] = useState({});
  const [vendorDocs, setVendorDocs] = useState({});
  const [vendorSites, setVendorSites] = useState([]);
  const [vendorWorkOrders, setVendorWorkOrders] = useState([]);
  const [vendorActivity, setVendorActivity] = useState([]);

  const updateVendor = async (updates) => {
    // Update the vendor in the database

    // Update the vendor locally
    setVendorDetails((prev) => ({ ...prev, ...updates }));
  };

  const fetchVendor = async () => {
    return axios.get(`/api/vendors/${id}`);
    console.log("Fetched Vendor:", response.data);
  };

  // Fetch vendor details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for vendor ID:", id);
    fetchVendor().then((res) => {
      setVendorDetails({
        ...res.data,
      });
    });
  }, [id]);

  return (
    <VendorDetailContext.Provider value={{ vendorDetails }}>
      <DetailPageLayout
        header={
          <DetailPageHeader
            title={vendorDetails.company}
            subtitle={`Details for Vendor ${vendorDetails.company}`}
            status="active"
            statusOptions={["active", "inactive", "suspended", "pending"]}
            onStatusChange={(newStatus) =>
              console.log("Status changed to:", newStatus)
            }
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
            content: <></>,
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
          },
        ]}
        notes={[]}
        notesLoading={false}
        onAddNote={async (content) => {
          console.log("Adding note:", content);
        }}
        currentUser="Sarah Carter"
      />
    </VendorDetailContext.Provider>
  );
}

export default VendorDetail;
