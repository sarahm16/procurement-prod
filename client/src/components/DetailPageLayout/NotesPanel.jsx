import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import axios from "axios";

import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
  Chip,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

// Constants
import { ENTITY_TYPES } from "../../*/constants/entityTypes";
import { priorityConfig } from "../../*/constants/priorityConfig";

// Local functions
import { generateEmailRecipients } from "../../*/utilities/generateEmailRecipients";
import { sendEmailFromHTML } from "../../*/api/microsoftApi";

const PANEL_WIDTH = 300;

/**
 * NotesPanel
 *
 * Persistent collapsible notes panel that lives on the right side of all
 * detail pages regardless of which tab is active.
 *
 * Props:
 *   notes       {Array}         — [{ id, author, content, createdAt }]
 *   loading     {boolean}
 *   onAddNote   {fn}            — (content: string) => Promise<void>
 *   currentUser {string}        — display name for new notes
 */
export default function NotesPanel({
  notes = [],
  loading = false,
  onAddNote,
  currentUser = "You",
  entityName = "",
}) {
  const location = useLocation();
  // Entity ID:
  const { id } = useParams();

  const href = window.location.href; // This is for the email body so users can click through to the relevant page from the email notification
  const urlSegments = location.pathname.split("/").filter(Boolean);
  const entity_type = urlSegments[0]; // Assuming the first segment indicates the entity type, e.g., "vendors"
  const entity_type_id = ENTITY_TYPES[entity_type]; // Update this to match the entity in the url, or pass as a prop if NotesPanel is used in multiple places

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(true);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);
  const textRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [priority, setPriority] = useState("Low");

  console.log("NotesPanel notes:", notes);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get("/api/employees");
        const data = response.data;
        console.log("Fetched employees:", data);
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  // Scroll to bottom when new notes arrive
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes, open]);

  useEffect(() => {
    if (composing && textRef.current) {
      textRef.current.focus();
    }
  }, [composing]);

  const sendEmailNotification = async () => {
    const subject = `${currentUser} tagged you in a note in ${entity_type.slice(0, -1)} ${entityName}`;

    const recipients = generateEmailRecipients(taggedUsers.map((u) => u.email));
    const bccRecipients = [];

    const p = priorityConfig[priority] || priorityConfig["Low"];
    const entityLabel = entity_type.slice(0, -1);

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:20px 28px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1px;color:#9a9ab0;text-transform:uppercase;">${entityLabel}</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ffffff;">${entityName}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">
              <strong style="color:#111827;">${currentUser}</strong> tagged you in a note
            </p>

            <!-- Priority badge -->
            <p style="margin:0 0 20px;">
              <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;color:${p.color};background:${p.bg};border:1px solid ${alpha ? "" : ""}${p.color}33;">
                ${p.value} Priority
              </span>
            </p>

            <!-- Note content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:14px 16px;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap;">${draft.trim()}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr>
                <td style="background:#1976d2;border-radius:6px;">
                  <a href="${href}" style="display:inline-block;padding:10px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;">
                    View ${entityLabel} →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:14px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">You received this because you were tagged in a note. Do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;
    try {
      await sendEmailFromHTML(
        priority,
        subject,
        htmlBody,
        recipients,
        bccRecipients,
      );
      console.log("Email notification sent successfully");
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  };

  const handleSubmit = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await onAddNote?.({
        body: draft.trim(),
        tagged_user_ids: taggedUsers.map((u) => u.id),
        priority,
        author_id: 1,
        entity_id: Number(id),
        entity_type_id: entity_type_id, // Update this to match the entity in the url
      });

      if (taggedUsers.length > 0) {
        await sendEmailNotification();
      }
      setDraft("");
      setComposing(false);
      setTaggedUsers([]);
      setPriority("Low");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === "Escape") {
      setComposing(false);
      setDraft("");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  };

  const getNotePriority = (note) => {
    if (!note.priority) {
      return "Low";
    }
    if (note.priority === "Medium") {
      return "Normal";
    }
    return note.priority;
  };

  // ── Collapsed strip ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <Box
        sx={{
          width: 44,
          flexShrink: 0,
          borderLeft: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 2,
          gap: 1.5,
          backgroundColor: isDark
            ? alpha(theme.palette.background.paper, 0.6)
            : theme.palette.background.paper,
          transition: "width 0.2s ease",
        }}
      >
        <Tooltip title="Open notes" placement="left">
          <IconButton
            size="small"
            onClick={() => setOpen(true)}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "secondary.main" },
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Notes" placement="left">
          <Box sx={{ position: "relative", display: "flex" }}>
            <NoteAltOutlinedIcon
              sx={{
                fontSize: 18,
                color: notes.length > 0 ? "secondary.main" : "text.disabled",
              }}
            />
            {notes.length > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -4,
                  right: -5,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: "secondary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{ fontSize: "0.5rem", color: "#fff", fontWeight: 700 }}
                >
                  {notes.length > 9 ? "9+" : notes.length}
                </Typography>
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        borderLeft: `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: isDark
          ? alpha(theme.palette.background.paper, 0.6)
          : theme.palette.background.paper,
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NoteAltOutlinedIcon sx={{ fontSize: 16, color: "secondary.main" }} />
          <Typography
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 600,
              fontSize: "0.78rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Notes
          </Typography>
          {notes.length > 0 && (
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: "99px",
                backgroundColor: alpha(theme.palette.secondary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "secondary.main",
                }}
              >
                {notes.length}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Add note">
            <IconButton
              size="small"
              onClick={() => setComposing(true)}
              disabled={composing}
              sx={{
                color: "text.secondary",
                "&:hover": { color: "secondary.main" },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse">
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Notes list */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 0,
          py: 0,
          display: "flex",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 2,
          },
        }}
      >
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} color="secondary" />
          </Box>
        )}

        {!loading && notes.length === 0 && !composing && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
              px: 2,
              gap: 1,
            }}
          >
            <NoteAltOutlinedIcon
              sx={{ fontSize: 32, color: "text.disabled" }}
            />
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: "text.disabled",
                fontFamily: '"Barlow", sans-serif',
                textAlign: "center",
              }}
            >
              No notes yet
            </Typography>
            <Typography
              onClick={() => setComposing(true)}
              sx={{
                fontSize: "0.72rem",
                color: "secondary.main",
                fontFamily: '"Barlow", sans-serif',
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Add the first one
            </Typography>
          </Box>
        )}

        {!loading &&
          notes.map((note, i) => {
            const notePriority = getNotePriority(note);
            const priority = priorityConfig[notePriority];
            const { label, color, bg } = priority;
            return (
              <Box key={note.id ?? i}>
                <Box sx={{ px: 2, py: 1.75 }}>
                  {/* Note header */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.75,
                      alignItems: "baseline",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"Barlow", sans-serif',
                        fontWeight: 600,
                        fontSize: "0.72rem",
                        color: "text.primary",
                      }}
                    >
                      {note.author_name ?? note.changed_by ?? "Unknown"}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        ml: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"Barlow", sans-serif',
                          fontSize: "0.62rem",
                          fontWeight: 600,
                          color: color,
                          backgroundColor: alpha(color, 0.1),
                          border: `1px solid ${alpha(color, 0.25)}`,
                          borderRadius: "20px",
                          px: 0.85,
                          py: 0.15,
                          lineHeight: 1.6,
                        }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: '"Barlow", sans-serif',
                          fontSize: "0.65rem",
                          color: "text.disabled",
                          flexShrink: 0,
                        }}
                      >
                        {formatDate(note.date ?? note.changed_at)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Note body */}
                  <Typography
                    sx={{
                      fontFamily: '"Barlow", sans-serif',
                      fontSize: "0.82rem",
                      color: "text.secondary",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {note.body ?? note.new_value}
                  </Typography>
                  {/* Tagged users */}
                  {note.tagged_users?.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 0.75,
                      }}
                    >
                      {note.tagged_users.map((name) => (
                        <Typography
                          key={name}
                          sx={{
                            fontFamily: '"Barlow", sans-serif',
                            fontSize: "0.68rem",
                            color: "primary.main",
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              0.08,
                            ),
                            borderRadius: "4px",
                            px: 0.75,
                            py: 0.25,
                            lineHeight: 1.5,
                          }}
                        >
                          @{name}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>

                {i < notes.length - 1 && (
                  <Divider sx={{ borderColor: theme.palette.divider }} />
                )}
              </Box>
            );
          })}
      </Box>

      {/* Compose area */}
      {composing && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
            p: 1.5,
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.04)
              : alpha(theme.palette.primary.main, 0.02),
          }}
        >
          {/* Tag employees */}
          <Autocomplete
            multiple
            size="small"
            options={employees}
            value={taggedUsers}
            onChange={(_, newValue) => setTaggedUsers(newValue)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={saving}
            renderTags={(selected, getTagProps) =>
              selected.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  size="small"
                  sx={{
                    fontFamily: '"Barlow", sans-serif',
                    fontSize: "0.68rem",
                    height: 20,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    color: "primary.main",
                    "& .MuiChip-deleteIcon": { fontSize: 13 },
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={taggedUsers.length === 0 ? "Tag employees…" : ""}
                size="small"
                variant="outlined"
                sx={{
                  mb: 1,
                  "& .MuiInputBase-root": {
                    fontFamily: '"Barlow", sans-serif',
                    fontSize: "0.82rem",
                    backgroundColor: "background.paper",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.secondary.main, 0.3),
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.secondary.main, 0.6),
                  },
                  "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "secondary.main",
                  },
                }}
              />
            )}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography
              sx={{
                fontFamily: '"Barlow", sans-serif',
                fontSize: "0.72rem",
                color: "text.disabled",
                flexShrink: 0,
              }}
            >
              Priority
            </Typography>
            <ToggleButtonGroup
              value={priority}
              exclusive
              onChange={(_, val) => val && setPriority(val)}
              size="small"
              disabled={saving}
              sx={{ height: 24 }}
            >
              {Object.keys(priorityConfig).map((key) => {
                const { label, color, bg } = priorityConfig[key];
                return (
                  <ToggleButton
                    key={key}
                    value={key}
                    sx={{
                      fontFamily: '"Barlow", sans-serif',
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      px: 1.25,
                      textTransform: "none",
                      color: "text.disabled",
                      borderColor: alpha(theme.palette.secondary.main, 0.3),
                      "&.Mui-selected": {
                        color,
                        backgroundColor: alpha(color, 0.1),
                        borderColor: alpha(color, 0.4),
                        "&:hover": { backgroundColor: alpha(color, 0.15) },
                      },
                    }}
                  >
                    {label}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>
          <TextField
            inputRef={textRef}
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            placeholder="Write a note… (⌘↵ to save)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            size="small"
            variant="outlined"
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: '"Barlow", sans-serif',
                fontSize: "0.82rem",
                backgroundColor: "background.paper",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: alpha(theme.palette.secondary.main, 0.3),
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: alpha(theme.palette.secondary.main, 0.6),
              },
              "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "secondary.main",
              },
            }}
          />
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}
          >
            <IconButton
              size="small"
              onClick={() => {
                setComposing(false);
                setDraft("");
              }}
              disabled={saving}
              sx={{ color: "text.disabled" }}
            >
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
            <Tooltip title="Save (⌘↵)">
              <span>
                <IconButton
                  size="small"
                  onClick={handleSubmit}
                  disabled={!draft.trim() || saving}
                  sx={{
                    color: draft.trim() ? "secondary.main" : "text.disabled",
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    },
                  }}
                >
                  {saving ? (
                    <CircularProgress size={14} color="secondary" />
                  ) : (
                    <SendIcon sx={{ fontSize: 15 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Footer add button when not composing and has notes */}
      {!composing && notes.length > 0 && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 1,
          }}
        >
          <Typography
            onClick={() => setComposing(true)}
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "text.disabled",
              cursor: "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              "&:hover": { color: "secondary.main" },
              transition: "color 0.15s",
            }}
          >
            + Add note
          </Typography>
        </Box>
      )}
    </Box>
  );
}
