// components/ConfirmDialog.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  alpha,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
}) {
  const theme = useTheme();
  const accent = destructive
    ? theme.palette.error.main
    : theme.palette.primary.main;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, border: `1px solid ${theme.palette.divider}` },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.3rem",
          letterSpacing: "-0.01em",
          pb: 1,
        }}
      >
        {destructive && (
          <Box sx={{ display: "flex", color: accent }}>
            <WarningAmberIcon sx={{ fontSize: 22 }} />
          </Box>
        )}
        {title}
      </DialogTitle>

      <DialogContent>
        <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ color: "text.secondary" }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          sx={{
            backgroundColor: accent,
            "&:hover": { backgroundColor: alpha(accent, 0.85) },
          }}
        >
          {loading ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
