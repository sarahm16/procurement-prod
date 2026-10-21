// @sarlacc/portal · src/layout/HelpDialog.jsx
//
// "Help & support". Words and contact details come from config.help:
//   { title, body, email?, phone? }
// Email and phone only show when they're filled in.
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";

export default function HelpDialog({ open, onClose, help = {} }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: "1.5rem",
        }}
      >
        {help.title ?? "Help & support"}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "text.secondary", mb: 2 }}>
          {help.body ?? "Contact your NFC representative for help."}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {help.email && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MailOutlineIcon fontSize="small" color="action" />
              <Link href={`mailto:${help.email}`}>{help.email}</Link>
            </Box>
          )}
          {help.phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PhoneOutlinedIcon fontSize="small" color="action" />
              <Link href={`tel:${help.phone.replace(/[^\d+]/g, "")}`}>
                {help.phone}
              </Link>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
