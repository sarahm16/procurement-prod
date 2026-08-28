// components/Contacts.jsx
import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  TextField,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// primary convention — contact_role_id === 1 (matches the app's convention)
const isPrimary = (c) => c.contact_role_id === 1 || c.is_primary;

const emptyDraft = { name: "", email: "", phone: "" };

function ContactCard({ contact, onUpdate, onDelete, theme }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  });

  const primary = isPrimary(contact);

  const save = async () => {
    await onUpdate?.(contact.id, draft);
    setEditing(false);
  };

  return (
    <Box
      sx={{
        border: `1px solid ${
          primary
            ? alpha(theme.palette.primary.main, 0.4)
            : theme.palette.divider
        }`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Header: avatar, name, role, menu */}
      <Box
        sx={{
          px: 1.75,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: primary
            ? alpha(theme.palette.primary.main, 0.04)
            : "transparent",
        }}
      >
        <Avatar
          sx={{
            width: 38,
            height: 38,
            fontSize: "0.85rem",
            fontWeight: 700,
            bgcolor: primary
              ? "primary.main"
              : alpha(theme.palette.text.primary, 0.15),
            color: primary ? "#fff" : "text.secondary",
          }}
        >
          {initials(contact.name)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {contact.name || "Unnamed contact"}
            </Typography>
            {primary && (
              <Chip
                label="Primary"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  backgroundColor: alpha(theme.palette.primary.main, 0.14),
                  color: "primary.main",
                }}
              />
            )}
          </Box>
          {contact.role_name && (
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
              {contact.role_name}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ p: 0.25 }}
        >
          <MoreVertIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      {/* Body: contact details or edit form */}
      <Box sx={{ px: 1.75, py: 1.5 }}>
        {editing ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              size="small"
              label="Name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Email"
              value={draft.email}
              onChange={(e) =>
                setDraft((d) => ({ ...d, email: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Phone"
              value={draft.phone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, phone: e.target.value }))
              }
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 0.5,
                mt: 0.5,
              }}
            >
              <IconButton size="small" onClick={() => setEditing(false)}>
                <CloseIcon sx={{ fontSize: 17 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={save}
                sx={{ color: "success.main" }}
              >
                <CheckIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EmailOutlinedIcon
                sx={{ fontSize: 16, color: "text.disabled" }}
              />
              {contact.email ? (
                <Typography
                  component="a"
                  href={`mailto:${contact.email}`}
                  sx={{
                    fontSize: "0.82rem",
                    color: "primary.main",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {contact.email}
                </Typography>
              ) : (
                <Typography
                  sx={{ fontSize: "0.82rem", color: "text.disabled" }}
                >
                  —
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PhoneOutlinedIcon
                sx={{ fontSize: 16, color: "text.disabled" }}
              />
              {contact.phone ? (
                <Typography
                  component="a"
                  href={`tel:${contact.phone}`}
                  sx={{
                    fontSize: "0.82rem",
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {contact.phone}
                </Typography>
              ) : (
                <Typography
                  sx={{ fontSize: "0.82rem", color: "text.disabled" }}
                >
                  —
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setEditing(true);
          }}
          sx={{ fontSize: "0.8rem" }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onDelete?.(contact.id);
          }}
          sx={{ fontSize: "0.8rem", color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default function Contacts({
  contacts = [],
  addContact,
  updateContact,
  deleteContact,
}) {
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  // primary first, then the rest
  const sorted = [...contacts].sort(
    (a, b) => (isPrimary(b) ? 1 : 0) - (isPrimary(a) ? 1 : 0),
  );

  const submitNew = async () => {
    if (!draft.name.trim()) return;
    await addContact?.(draft);
    setDraft(emptyDraft);
    setAdding(false);
  };

  return (
    <Box sx={{ mt: 1 }}>
      {/* Section header — prominent, matches the app's section style */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 1,
              backgroundColor: theme.palette.primary.main,
              color: "#fff",
            }}
          >
            <PeopleOutlineIcon sx={{ fontSize: 17 }} />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "0.02em",
            }}
          >
            Contacts
          </Typography>
          {contacts.length > 0 && (
            <Chip
              label={contacts.length}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                backgroundColor: alpha(theme.palette.text.primary, 0.08),
              }}
            />
          )}
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PersonAddAltOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => setAdding(true)}
        >
          Add Contact
        </Button>
      </Box>

      {/* Add form */}
      {adding && (
        <Box
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            p: 1.75,
            mb: 1.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              mb: 1,
            }}
          >
            New Contact
          </Typography>
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}
          >
            <TextField
              size="small"
              label="Name"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Email"
              value={draft.email}
              onChange={(e) =>
                setDraft((d) => ({ ...d, email: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Phone"
              value={draft.phone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, phone: e.target.value }))
              }
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
              mt: 1.25,
            }}
          >
            <Button
              size="small"
              onClick={() => {
                setAdding(false);
                setDraft(emptyDraft);
              }}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={submitNew}
              disabled={!draft.name.trim()}
            >
              Add
            </Button>
          </Box>
        </Box>
      )}

      {/* Contact cards grid */}
      {sorted.length === 0 && !adding ? (
        <Box
          sx={{
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            py: 3,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
            No contacts yet.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 1.5,
          }}
        >
          {sorted.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onUpdate={updateContact}
              onDelete={deleteContact}
              theme={theme}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
