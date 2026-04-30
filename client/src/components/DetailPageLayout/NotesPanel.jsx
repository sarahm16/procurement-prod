import { useState, useRef, useEffect } from "react";
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
} from "@mui/material";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

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
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(true);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);
  const textRef = useRef(null);

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

  const handleSubmit = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await onAddNote?.(draft.trim());
      setDraft("");
      setComposing(false);
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
          notes.map((note, i) => (
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
                  <Typography
                    sx={{
                      fontFamily: '"Barlow", sans-serif',
                      fontSize: "0.65rem",
                      color: "text.disabled",
                      flexShrink: 0,
                      ml: 1,
                    }}
                  >
                    {formatDate(note.date ?? note.changed_at)}
                  </Typography>
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
          ))}
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
