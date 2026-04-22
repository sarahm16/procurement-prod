import { useParams } from "react-router-dom";
import { createContext, useEffect, useState } from "react";

// Components
import DetailPageHeader from "../../components/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout";
import axios from "axios";

// Context
const VendorDetailContext = createContext({
  vendor: {},
  updateVendor: () => {},
});

function VendorDetail() {
  // Get the vendor ID from the URL parameters
  const { id } = useParams();

  // State
  const [vendor, setVendor] = useState({});

  const updateVendor = async (updates) => {
    // Update the vendor in the database

    // Update the vendor locally
    setVendor((prev) => ({ ...prev, ...updates }));
  };

  const fetchVendor = async () => {
    const response = await axios.get(`/api/vendors/${id}`);
    console.log("Fetched Vendor:", response.data);
    setVendor(response.data);
  };

  // Fetch vendor details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for vendor ID:", id);
    fetchVendor();
  }, [id]);

  return (
    <VendorDetailContext.Provider value={{ vendor, updateVendor }}>
      <DetailPageLayout
        header={
          <DetailPageHeader
            title={`Vendor #${id}`}
            subtitle={`Details for Vendor #${id}`}
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
      ></DetailPageLayout>
    </VendorDetailContext.Provider>
  );
}

export default VendorDetail;
