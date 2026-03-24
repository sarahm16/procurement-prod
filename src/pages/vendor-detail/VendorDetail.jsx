import { useParams } from "react-router-dom";
import { createContext, useEffect, useState } from "react";

// Components
import DetailPageHeader from "../../components/DetailPageHeader";

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

  // Fetch vendor details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for vendor ID:", id);
  }, [id]);

  return (
    <VendorDetailContext.Provider value={{ vendor, updateVendor }}>
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
    </VendorDetailContext.Provider>
  );
}

export default VendorDetail;
