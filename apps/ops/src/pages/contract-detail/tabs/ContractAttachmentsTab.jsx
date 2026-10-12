// contract-detail/tabs/ContractAttachmentsTab.jsx
//
// Placeholder until the ContractAttachments table exists. Addendums and other
// contract documents will be listed and uploaded here.
import { Box, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";

export default function ContractAttachmentsTab() {
  return (
    <Box
      sx={{
        m: { xs: 2, sm: 4 },
        p: 6,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 4,
        textAlign: "center",
        color: "text.secondary",
      }}
    >
      <AttachFileIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
      <Typography sx={{ fontWeight: 600, color: "text.primary" }}>
        Contract attachments
      </Typography>
      <Typography sx={{ fontSize: "0.85rem", mt: 0.5 }}>
        Addendums and other contract documents will go here.
      </Typography>
    </Box>
  );
}
