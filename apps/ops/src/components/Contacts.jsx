import { useEffect, useState } from "react";
import axios from "axios";

// Local components
import { FieldRow, InfoCard } from "./InfoGrid";
import ContactFormModal from "./Forms/ContactFormModal";
import ConfirmDialog from "./ConfirmDialog";

// MUI Components
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";

function Contacts({ contacts, updateContact, addContact, deleteContact }) {
  const [addingContact, setAddingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [contactRoles, setContactRoles] = useState([]);

  const fetchAllContactRoles = async () => {
    try {
      const response = await axios.get("/api/contactRoles");
      console.log("All contact roles response:", response.data);
      setContactRoles(response.data);
    } catch (error) {
      console.error("Error fetching contact roles:", error);
    }
  };
  useEffect(() => {
    fetchAllContactRoles();
  }, []);

  const handleAddContact = async (form) => {
    setSavingContact(true);
    try {
      await addContact(form);
      setAddingContact(false);
    } catch (error) {
      console.error("Error adding contact:", error);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    setDeletingContact(true);
    try {
      await deleteContact(contactId);
      setContactToDelete(null);
    } catch (error) {
      console.error("Error deleting contact:", error);
    } finally {
      setDeletingContact(false);
    }
  };

  const handleSaveContact = async (contactId, draft) => {
    try {
      await updateContact(contactId, draft);
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  return (
    <>
      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.disabled",
          }}
        >
          Contacts
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddingContact(true)}
        >
          Add Contact
        </Button>
      </Box>
      {contacts?.length > 0 &&
        contacts.map((contact) => (
          <InfoCard
            key={contact.id}
            title={`${contact.contact_role} Contact`}
            collapsible
            defaultOpen
            editable
            editValues={contact}
            span="half"
            onSave={(draft) => handleSaveContact(contact.id, draft)}
            actions={
              <Tooltip title="Remove contact">
                <IconButton
                  size="small"
                  onClick={() => {
                    setContactToDelete(contact);
                  }}
                  sx={{
                    color: "text.disabled",
                    "&:hover": { color: "error.main" },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            }
          >
            <FieldRow
              label="Contact Name"
              value={contact.name}
              fieldKey="name"
            />
            <FieldRow
              label="Contact Email"
              value={contact.email}
              fieldKey="email"
            />
            <FieldRow
              label="Contact Phone"
              value={contact.phone}
              fieldKey="phone"
            />
          </InfoCard>
        ))}

      <ContactFormModal
        open={addingContact}
        onClose={() => setAddingContact(false)}
        onSubmit={handleAddContact}
        roles={contactRoles}
        submitting={savingContact}
      />
      <ConfirmDialog
        open={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={() => handleDeleteContact(contactToDelete.id)}
        title="Remove contact"
        message={
          contactToDelete
            ? `Remove ${contactToDelete.name || "this contact"}? This can't be undone.`
            : ""
        }
        confirmLabel="Remove"
        loading={deletingContact}
      />
    </>
  );
}

export default Contacts;
