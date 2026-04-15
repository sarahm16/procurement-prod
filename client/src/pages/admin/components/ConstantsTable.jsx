import { useState } from "react";

// MUI Components
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

// MUI Icons
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

/**
 * ConstantsTable
 *
 * Reusable component for displaying and managing a list of constant values
 * (e.g. Softwares, Trades, Services) on the Admin page.
 *
 * Props:
 * @param {string}   title          - Section heading (e.g. "Softwares")
 * @param {Array}    items          - Array of objects with at minimum { id, name }
 * @param {boolean}  hasDescription - Whether items have an editable description field
 * @param {boolean}  loading        - Show skeleton/spinner while fetching
 * @param {string}   error          - Error message string, or null
 * @param {boolean}  saving         - Disable inputs while a mutation is in flight
 * @param {Function} onAdd          - (newItem: { name, description? }) => Promise<void>
 * @param {Function} onUpdate       - (id, changes: { name?, description? }) => Promise<void>
 * @param {Function} onDelete       - (id) => Promise<void>
 */
function ConstantsTable({
  title,
  items = [],
  hasDescription = false,
  loading = false,
  error = null,
  saving = false,
  onAdd,
  onUpdate,
  onDelete,
}) {
  // Which row is being edited (by id)
  const [editingId, setEditingId] = useState(null);
  // Draft values while editing an existing row
  const [editDraft, setEditDraft] = useState({ name: "", description: "" });
  // Whether the add-new row is visible
  const [adding, setAdding] = useState(false);
  // Draft values for new row
  const [newDraft, setNewDraft] = useState({ name: "", description: "" });

  // ── Edit existing row ────────────────────────────────────────────────────────

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditDraft({ name: item.name, description: item.description ?? "" });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditDraft({ name: "", description: "" });
  };

  const handleEditSave = async (id) => {
    if (!editDraft.name.trim()) return;
    await onUpdate(id, {
      name: editDraft.name.trim(),
      ...(hasDescription && { description: editDraft.description.trim() }),
    });
    setEditingId(null);
  };

  // ── Add new row ──────────────────────────────────────────────────────────────

  const handleAddStart = () => {
    setAdding(true);
    setNewDraft({ name: "", description: "" });
  };

  const handleAddCancel = () => {
    setAdding(false);
    setNewDraft({ name: "", description: "" });
  };

  const handleAddSave = async () => {
    if (!newDraft.name.trim()) return;
    await onAdd({
      name: newDraft.name.trim(),
      ...(hasDescription && { description: newDraft.description.trim() }),
    });
    setAdding(false);
    setNewDraft({ name: "", description: "" });
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  const handleEditKeyDown = (e, id) => {
    if (e.key === "Enter") handleEditSave(id);
    if (e.key === "Escape") handleEditCancel();
  };

  const handleAddKeyDown = (e) => {
    if (e.key === "Enter") handleAddSave();
    if (e.key === "Escape") handleAddCancel();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: "text.primary", fontSize: "0.85rem" }}
        >
          {title}
          {!loading && (
            <Typography
              component="span"
              sx={{
                ml: 1,
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "text.secondary",
                letterSpacing: "0.05em",
              }}
            >
              {items.length} {items.length === 1 ? "item" : "items"}
            </Typography>
          )}
        </Typography>

        <Tooltip title={`Add ${title.slice(0, -1) ?? "item"}`}>
          <span>
            <IconButton
              size="small"
              onClick={handleAddStart}
              disabled={adding || saving || loading}
              sx={{
                color: "secondary.main",
                "&:hover": { backgroundColor: "secondary.main", color: "#fff" },
                transition: "all 0.15s",
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Column headers */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: hasDescription ? "1fr 2fr auto" : "1fr auto",
          px: 2.5,
          py: 1,
          backgroundColor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="overline"
          sx={{ fontSize: "0.65rem", color: "text.secondary" }}
        >
          Name
        </Typography>
        {hasDescription && (
          <Typography
            variant="overline"
            sx={{ fontSize: "0.65rem", color: "text.secondary" }}
          >
            Description
          </Typography>
        )}
        <Box /> {/* actions column */}
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} color="primary" />
        </Box>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && !adding && (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No {title.toLowerCase()} yet.{" "}
            <Box
              component="span"
              onClick={handleAddStart}
              sx={{
                color: "secondary.main",
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Add one.
            </Box>
          </Typography>
        </Box>
      )}

      {/* Rows */}
      {!loading &&
        items.map((item, index) => {
          const isEditing = editingId === item.id;

          return (
            <Box key={item.id}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: hasDescription
                    ? "1fr 2fr auto"
                    : "1fr auto",
                  alignItems: "center",
                  px: 2.5,
                  py: isEditing ? 1 : 0,
                  minHeight: 44,
                  gap: 1.5,
                  "&:hover": !isEditing
                    ? { backgroundColor: "action.hover" }
                    : {},
                  transition: "background-color 0.1s",
                }}
              >
                {/* Name cell */}
                {isEditing ? (
                  <TextField
                    size="small"
                    value={editDraft.name}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                    autoFocus={!hasDescription}
                    disabled={saving}
                    placeholder="Name"
                    sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                  />
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: "text.primary", fontSize: "0.875rem" }}
                  >
                    {item.name}
                  </Typography>
                )}

                {/* Description cell */}
                {hasDescription &&
                  (isEditing ? (
                    <TextField
                      size="small"
                      value={editDraft.description}
                      onChange={(e) =>
                        setEditDraft((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                      autoFocus
                      disabled={saving}
                      placeholder="Description"
                      sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: item.description
                          ? "text.secondary"
                          : "text.disabled",
                        fontSize: "0.875rem",
                        fontStyle: item.description ? "normal" : "italic",
                      }}
                    >
                      {item.description || "No description"}
                    </Typography>
                  ))}

                {/* Actions */}
                <Box
                  sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}
                >
                  {isEditing ? (
                    <>
                      <Tooltip title="Save (Enter)">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleEditSave(item.id)}
                            disabled={saving || !editDraft.name.trim()}
                            sx={{ color: "success.main" }}
                          >
                            <CheckIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancel (Esc)">
                        <IconButton
                          size="small"
                          onClick={handleEditCancel}
                          disabled={saving}
                          sx={{ color: "text.secondary" }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditStart(item)}
                          disabled={saving}
                          sx={{
                            color: "transparent",
                            ".MuiBox-root:hover &": { color: "text.secondary" },
                            "&:hover": { color: "primary.main !important" },
                            transition: "color 0.15s",
                          }}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(item.id)}
                          disabled={saving}
                          sx={{
                            color: "transparent",
                            ".MuiBox-root:hover &": { color: "text.secondary" },
                            "&:hover": { color: "error.main !important" },
                            transition: "color 0.15s",
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </Box>

              {index < items.length - 1 && (
                <Divider sx={{ mx: 2.5, borderColor: "divider" }} />
              )}
            </Box>
          );
        })}

      {/* Add new row */}
      {adding && (
        <>
          {items.length > 0 && <Divider sx={{ borderColor: "divider" }} />}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: hasDescription ? "1fr 2fr auto" : "1fr auto",
              alignItems: "center",
              px: 2.5,
              py: 1,
              gap: 1.5,
              backgroundColor: "action.selected",
            }}
          >
            <TextField
              size="small"
              value={newDraft.name}
              onChange={(e) =>
                setNewDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              onKeyDown={handleAddKeyDown}
              autoFocus={!hasDescription}
              disabled={saving}
              placeholder="Name *"
              sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
            />

            {hasDescription && (
              <TextField
                size="small"
                value={newDraft.description}
                onChange={(e) =>
                  setNewDraft((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                onKeyDown={handleAddKeyDown}
                autoFocus
                disabled={saving}
                placeholder="Description"
                sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
              />
            )}

            <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
              <Tooltip title="Add (Enter)">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleAddSave}
                    disabled={saving || !newDraft.name.trim()}
                    sx={{ color: "success.main" }}
                  >
                    <CheckIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Cancel (Esc)">
                <IconButton
                  size="small"
                  onClick={handleAddCancel}
                  disabled={saving}
                  sx={{ color: "text.secondary" }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </>
      )}

      {/* Footer add button — shown when list has items and not currently adding */}
      {!adding && !loading && items.length > 0 && (
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            px: 2.5,
            py: 1,
          }}
        >
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddStart}
            disabled={saving}
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              "&:hover": {
                color: "secondary.main",
                backgroundColor: "transparent",
              },
            }}
          >
            Add {title.replace(/s$/, "")}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default ConstantsTable;
