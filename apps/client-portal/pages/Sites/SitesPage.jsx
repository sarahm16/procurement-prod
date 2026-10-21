// src/pages/Sites/SitesPage.jsx — placeholder.
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { ComingSoon, PageHeader } from "@sarlacc/portal";

export default function SitesPage() {
  return (
    <>
      <PageHeader
        title="Sites"
        subtitle="Your locations and the services at each."
      />
      <ComingSoon
        icon={PlaceOutlinedIcon}
        title="Your sites will show here"
        text="Addresses, active services and each site's work order history."
      />
    </>
  );
}
