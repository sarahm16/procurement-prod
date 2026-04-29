import { useParams } from "react-router-dom";
import { createContext, useEffect, useState } from "react";

// Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Context
const SiteDetailContext = createContext({
  site: {},
  updateSite: () => {},
});

function SiteDetail() {
  // Get the site ID from the URL parameters
  const { id } = useParams();

  // State
  const [site, setSite] = useState({});

  const updateSite = async (updates) => {
    // Update the site in the database

    // Update the site locally
    setSite((prev) => ({ ...prev, ...updates }));
  };

  // Fetch site details using the ID (this is just a placeholder, replace with actual data fetching logic)
  useEffect(() => {
    console.log("Fetching details for site ID:", id);
  }, [id]);

  return (
    <SiteDetailContext.Provider value={{ site, updateSite }}>
      <DetailPageLayout
        header={
          <DetailPageHeader
            title={`Site #${id}`}
            subtitle={`Details for Site #${id}`}
            status="active"
            statusOptions={["active", "inactive", "suspended", "pending"]}
            onStatusChange={(newStatus) =>
              console.log("Status changed to:", newStatus)
            }
            breadcrumbs={[
              { label: "Sites", href: "/sites" },
              { label: `Site #${id}` },
            ]}
            meta={[]}
            address="123 Main St, Anytown, USA"
            onBack={() => console.log("Back button clicked")}
            actions={[]}
          />
        }
      ></DetailPageLayout>
    </SiteDetailContext.Provider>
  );
}

export default SiteDetail;
