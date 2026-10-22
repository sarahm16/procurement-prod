// workorder-details/tabs/MessagesTab/MessageThread.jsx
//
// One conversation on a work order: our team ↔ the client, or our team ↔
// the vendor. A coloured banner says who can read it, and every message is
// confirmed in a dialog before it's sent.
//
//   <MessageThread channel="client" recipient="Walmart" … />
import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import BlockIcon from "@mui/icons-material/Block";

import ConfirmSendDialog from "./ConfirmSendDialog";
import {
  useFieldActivity,
  useWorkOrderActions,
} from "../../WorkOrderDetailProvider";

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
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

/** "Mike Dunn · Cascade Paving", "Sarah Carter", "Jane Doe · Walmart". */
const whoLabel = (m, clientName) => {
  const a = m.author ?? {};
  if (a.kind === "vendor")
    return [a.name, a.company ?? m.vendor_company].filter(Boolean).join(" · ");
  if (a.kind === "client") return [a.name, clientName].filter(Boolean).join(" · ");
  return a.name ?? "NFC";
};

function Bubble({ m, clientName }) {
  const theme = useTheme();
  const ours = m.author?.kind === "nfc";
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: ours ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 1,
        mb: 1.5,
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          fontSize: "0.68rem",
          fontWeight: 700,
          bgcolor: ours ? "primary.main" : alpha(theme.palette.text.primary, 0.14),
          color: ours ? "primary.contrastText" : "text.secondary",
        }}
      >
        {initials(m.author?.name)}
      </Avatar>
      <Box sx={{ maxWidth: "78%", minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.75,
            mb: 0.25,
            flexDirection: ours ? "row-reverse" : "row",
          }}
        >
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700 }}>
            {whoLabel(m, clientName)}
          </Typography>
          <Typography sx={{ fontSize: "0.66rem", color: "text.disabled" }}>
            {fmtTime(m.created_at)}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            borderTopRightRadius: ours ? 4 : 16,
            borderTopLeftRadius: ours ? 16 : 4,
            bgcolor: ours ? "primary.main" : alpha(theme.palette.text.primary, 0.06),
            color: ours ? "primary.contrastText" : "text.primary",
          }}
        >
          <Typography sx={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {m.content}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function MessageThread({
  channel, // "client" | "vendor"
  recipient, // who reads it: "Walmart" / "Cascade Paving LLC"
  clientName,
  accent, // theme colour key for the banner: "secondary" | "info"
  emptyText,
  blockedReason, // when set, nobody can send here (and why)
}) {
  const theme = useTheme();
  const fieldActivity = useFieldActivity();
  const { addCommunication } = useWorkOrderActions();

  const messages = (fieldActivity?.communications ?? []).filter(
    (m) => m.channel === channel,
  );

  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, channel]);

  // Switching conversations never carries a half-written message across.
  useEffect(() => {
    setDraft("");
    setConfirming(false);
    setError(null);
  }, [channel]);

  const content = draft.trim();
  const color = theme.palette[accent]?.main ?? theme.palette.primary.main;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await addCommunication?.({ channel, content });
      setDraft("");
      setConfirming(false);
    } catch (e) {
      setError(e?.response?.data?.error ?? "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: alpha(color, 0.45),
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Who can read this */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: alpha(color, 0.1),
          borderBottom: 1,
          borderColor: alpha(color, 0.3),
        }}
      >
        {blockedReason ? (
          <BlockIcon sx={{ fontSize: 18, color: "text.secondary" }} />
        ) : (
          <VisibilityOutlinedIcon sx={{ fontSize: 18, color }} />
        )}
        <Typography sx={{ fontSize: "0.85rem" }}>
          {blockedReason ? (
            blockedReason
          ) : (
            <>
              Visible to <strong>{recipient}</strong> and our team
            </>
          )}
        </Typography>
      </Box>

      <Box
        ref={listRef}
        sx={{ p: 2, height: { xs: 340, md: 420 }, overflowY: "auto" }}
      >
        {messages.length === 0 ? (
          <Box sx={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.85rem", color: "text.disabled", maxWidth: 280 }}>
              {emptyText}
            </Typography>
          </Box>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} clientName={clientName} />)
        )}
      </Box>

      {!blockedReason && (
        <Box
          sx={{
            p: 1.5,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "flex-end",
            gap: 1,
          }}
        >
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder={`Message ${recipient}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          {/* No Enter-to-send: sending always goes through the check. */}
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            disabled={!content}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            sx={{ flexShrink: 0, minHeight: 40 }}
          >
            Review
          </Button>
        </Box>
      )}

      <ConfirmSendDialog
        open={confirming}
        recipient={recipient}
        audience={channel}
        content={content}
        sending={sending}
        error={error}
        onCancel={() => setConfirming(false)}
        onConfirm={send}
      />
    </Box>
  );
}
