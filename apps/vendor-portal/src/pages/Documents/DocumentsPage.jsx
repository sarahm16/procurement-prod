// src/pages/Documents/DocumentsPage.jsx — placeholder.
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { ComingSoon, PageHeader } from "@sarlacc/portal";

export default function DocumentsPage() {
  return (
    <>
      <PageHeader title="Documents" subtitle="Your paperwork with NFC." />
      <ComingSoon
        icon={DescriptionOutlinedIcon}
        title="Your documents will show here"
        text="Insurance certificates, W9 and agreements, and what's due for renewal."
      />
    </>
  );
}
