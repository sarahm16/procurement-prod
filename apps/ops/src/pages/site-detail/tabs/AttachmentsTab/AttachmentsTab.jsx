// site-details/tabs/SiteAttachmentsTab.jsx
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import FileUploadSection from "../../../../components/Attachments/FileUploadSection";

export default function SiteAttachmentsTab() {
  const { id } = useParams();

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2.5, maxWidth: 900 }}
    >
      <FileUploadSection
        basePath={`/api/sites/${id}/attachments`}
        title="Site Attachments"
        subtitle="Files and documents saved to this site."
        variant="list"
      />
    </Box>
  );
}
