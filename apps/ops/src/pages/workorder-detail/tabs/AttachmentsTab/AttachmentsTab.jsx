// workorder-details/tabs/AttachmentsTab/AttachmentsTab.jsx
import { Box } from "@mui/material";
import FileUploadSection from "./FileUploadSection";

export default function AttachmentsTab() {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2.5, maxWidth: 900 }}
    >
      <FileUploadSection
        category="pre_work"
        title="Pre-Work Images"
        subtitle="Photos of the site or equipment before work begins."
        variant="grid"
      />

      <FileUploadSection
        category="attachment"
        title="Attachments"
        subtitle="Files and documents saved to this work order."
        variant="list"
      />
    </Box>
  );
}
