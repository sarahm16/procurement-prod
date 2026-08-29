// workorder-details/tabs/FieldActivityTab/CommunicationsThread.jsx
import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

import {
  useWorkOrderDetails,
  useWorkOrderActions,
} from "../../WorkOrderDetailProvider";

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

function MessageBubble({ message, theme }) {
  const isInternal = message.sender_type === "internal";
  const senderName = isInternal
    ? message.employee_name || "Team"
    : message.vendor_company || "Vendor";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isInternal ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 1,
        mb: 1.5,
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          fontSize: "0.7rem",
          fontWeight: 700,
          bgcolor: isInternal
            ? "primary.main"
            : alpha(theme.palette.text.primary, 0.15),
          color: isInternal ? "#fff" : "text.secondary",
        }}
      >
        {initials(senderName)}
      </Avatar>

      <Box sx={{ maxWidth: "72%", minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 0.25,
            flexDirection: isInternal ? "row-reverse" : "row",
          }}
        >
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700 }}>
            {senderName}
          </Typography>
          <Typography sx={{ fontSize: "0.66rem", color: "text.disabled" }}>
            {fmtTime(message.created_at)}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            borderTopRightRadius: isInternal ? 4 : 16,
            borderTopLeftRadius: isInternal ? 16 : 4,
            backgroundColor: isInternal
              ? "primary.main"
              : alpha(theme.palette.text.primary, 0.06),
            color: isInternal ? "#fff" : "text.primary",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.85rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {message.content}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function CommunicationsThread() {
  const theme = useTheme();
  const details = useWorkOrderDetails();
  const { addCommunication } = useWorkOrderActions();

  const messages = details?.communications ?? [];

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // scroll to newest when the thread grows
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      // our team is sending, so sender_type = internal
      await addCommunication?.({ content, sender_type: "internal" });
      setDraft("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 17, color: "text.secondary" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          Communications
        </Typography>
        {messages.length > 0 && (
          <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </Typography>
        )}
      </Box>

      {/* Message list */}
      <Box
        sx={{
          p: 2,
          maxHeight: 420,
          overflowY: "auto",
          backgroundColor: alpha(theme.palette.text.primary, 0.01),
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <ChatBubbleOutlineIcon
              sx={{ fontSize: 28, color: "text.disabled", mb: 0.5 }}
            />
            <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
              No messages yet. Start the conversation with the vendor.
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} theme={theme} />
            ))}
            <div ref={endRef} />
          </>
        )}
      </Box>

      {/* Composer */}
      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
        }}
      >
        <TextField
          size="small"
          fullWidth
          multiline
          maxRows={4}
          placeholder="Message the vendor…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <IconButton
          onClick={send}
          disabled={!draft.trim() || sending}
          sx={{
            bgcolor: "primary.main",
            color: "#fff",
            "&:hover": { bgcolor: "primary.dark" },
            "&.Mui-disabled": {
              bgcolor: alpha(theme.palette.text.primary, 0.12),
              color: "#fff",
            },
          }}
        >
          {sending ? (
            <CircularProgress size={16} sx={{ color: "#fff" }} />
          ) : (
            <SendIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
