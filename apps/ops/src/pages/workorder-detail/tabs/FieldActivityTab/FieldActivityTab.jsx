// workorder-details/tabs/FieldActivityTab/FieldActivityTab.jsx
import { Box, Typography } from "@mui/material";
import CheckInOutCard from "./CheckInOutCard";
import CommunicationsThread from "./CommunicationsThread";
import FileUploadSection from "../AttachmentsTab/FileUploadSection";

export default function FieldActivityTab() {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2.5, maxWidth: 900 }}
    >
      {/* 1. Check-in / check-out */}
      <CheckInOutCard />

      {/* 2. Before / after images (vendor-uploaded; team can also upload as fallback) */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <FileUploadSection
          category="vendor_before"
          title="Before Images"
          subtitle="Site condition on arrival."
          variant="grid"
        />
        <FileUploadSection
          category="vendor_after"
          title="After Images"
          subtitle="Work completed."
          variant="grid"
        />
      </Box>

      {/* 3. Communications thread */}
      <CommunicationsThread />
    </Box>
  );
}
