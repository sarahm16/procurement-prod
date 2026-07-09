// components/ContactFormModal.jsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Box,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const EMPTY = { name: "", email: "", phone: "", contact_role_id: "" };
const emailOk = (e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function ContactFormModal({
  open,
  onClose,
  onSubmit, // (form) => Promise|void
  roles = [], // [{ id, name }]
  submitting = false,
  title = "Add Contact",
}) {
  const theme = useTheme();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);

  // Reset whenever the modal opens, so a cancelled add doesn't linger
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setTouched(false);
    }
  }, [open]);

  const change = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const nameError = touched && !form.name.trim();
  const emailError = touched && !emailOk(form.email);
  const canSubmit = form.name.trim() && emailOk(form.email) && !submitting;

  const handleSubmit = async () => {
    setTouched(true);
    if (!form.name.trim() || !emailOk(form.email)) return;
    await onSubmit?.({
      ...form,
      // send null rather than "" for the optional/relational fields
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      contact_role_id: form.contact_role_id || null,
    });
  };

  const labelSx = {
    fontFamily: '"Barlow", sans-serif',
    fontWeight: 600,
    fontSize: "0.65rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "text.disabled",
    mb: 0.75,
    display: "block",
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
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
          justifyContent: "space-between",
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.35rem",
          letterSpacing: "-0.01em",
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          py: 1.5,
        }}
      >
        {title}
        <IconButton
          size="small"
          onClick={onClose}
          disabled={submitting}
          sx={{ color: "text.disabled" }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          pt: "20px !important",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={labelSx}>Name</Typography>
          <TextField
            size="small"
            fullWidth
            autoFocus
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            error={nameError}
            helperText={nameError ? "Name is required" : " "}
          />
        </Box>

        <Box>
          <Typography sx={labelSx}>Role</Typography>
          <TextField
            size="small"
            fullWidth
            select
            value={form.contact_role_id}
            onChange={(e) => change("contact_role_id", e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box>
          <Typography sx={labelSx}>Email</Typography>
          <TextField
            size="small"
            fullWidth
            type="email"
            value={form.email}
            onChange={(e) => change("email", e.target.value)}
            error={emailError}
            helperText={emailError ? "Enter a valid email" : " "}
          />
        </Box>

        <Box>
          <Typography sx={labelSx}>Phone</Typography>
          <TextField
            size="small"
            fullWidth
            value={form.phone}
            onChange={(e) => change("phone", e.target.value)}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}
      >
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSubmit}
        >
          {submitting ? "Saving…" : "Add Contact"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
