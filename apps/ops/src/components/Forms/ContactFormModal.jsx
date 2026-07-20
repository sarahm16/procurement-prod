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

const digitsOnly = (s) => (s || "").replace(/\D/g, "");
const phoneOk = (p) => {
  if (!p) return true; // optional; return false here to make it required
  const d = digitsOnly(p);
  return d.length === 10 || (d.length === 11 && d.startsWith("1"));
};

const formatPhone = (p) => {
  const d = digitsOnly(p);
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10
    ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
    : p; // leave anything unexpected untouched
};

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
  const [touched, setTouched] = useState({});

  // Reset whenever the modal opens, so a cancelled add doesn't linger
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setTouched({});
    }
  }, [open]);

  const change = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const blur = (k) => setTouched((p) => ({ ...p, [k]: true }));

  const errors = {
    name: !form.name.trim() ? "Name is required" : "",
    email: !emailOk(form.email) ? "Enter a valid email" : "",
    phone: !phoneOk(form.phone) ? "Enter a valid US/CA phone number" : "",
  };
  const isValid = !errors.name && !errors.email && !errors.phone;
  const canSubmit = isValid && !submitting;

  const handleSubmit = async () => {
    setTouched({ name: true, email: true, phone: true }); // surface all errors
    if (!isValid) return;
    await onSubmit?.({
      ...form,
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
            error={touched.name && !!errors.name}
            helperText={touched.name && errors.name ? errors.name : " "}
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
            error={touched.email && !!errors.email}
            helperText={touched.email && errors.email ? errors.email : " "}
          />
        </Box>

        <Box>
          <Typography sx={labelSx}>Phone</Typography>
          <TextField
            size="small"
            fullWidth
            value={form.phone}
            onChange={(e) => change("phone", e.target.value)}
            error={touched.phone && !!errors.phone}
            helperText={touched.phone && errors.phone ? errors.phone : " "}
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
