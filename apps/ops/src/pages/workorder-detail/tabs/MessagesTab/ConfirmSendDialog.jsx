// workorder-details/tabs/MessagesTab/ConfirmSendDialog.jsx
//
// The last check before a message leaves NFC: who it's going to, where
// they'll see it, and the message itself. The send button names the
// recipient so it can't be confirmed on autopilot.
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

export default function ConfirmSendDialog({
  open,
  recipient, // "Walmart" / "Cascade Paving LLC"
  audience, // "client" | "vendor"
  content,
  sending,
  error,
  onCancel,
  onConfirm,
}) {
  const where =
    audience === "client" ? "the client portal" : "the vendor portal";

  return (
    <Dialog
      open={open}
      onClose={sending ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Send to {recipient}?
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{recipient}</strong> will see this message in {where}. Check
          it doesn&apos;t include anything meant only for our team
          {audience === "client"
            ? " or the vendor (like vendor pricing)"
            : " or the client (like client pricing)"}
          .
        </Alert>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "text.secondary",
            mb: 0.75,
          }}
        >
          Your message
        </Typography>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            border: 1,
            borderColor: "divider",
            bgcolor: "action.hover",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          <Typography sx={{ fontSize: "0.9rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {content}
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onCancel} disabled={sending}>
          Keep editing
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={sending}
          startIcon={sending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {sending ? "Sending…" : `Send to ${recipient}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
