// vendor-detail/components/VendorTextMessages.jsx
//
// Every text with the vendor in Text Request, as one thread: search,
// received/sent filter, and a CSV export of the whole thread.
//
// Ported from the old app's TextRequest component. What changed:
//   ─ The Text Request calls run on our server (/api/text-request), so the
//     API key isn't in the browser.
//   ─ All of the vendor's numbers are searched (main, secondary and every
//     contact), not just one. With more than one, a picker narrows the
//     thread to a single number.
//   ─ The export names the vendor by company, not by phone number.
//
//   <VendorTextMessages vendorId={id} company={details.company} />
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";

import SectionCard from "../../../components/SectionCard";

const LIST_MAX_HEIGHT = 480;

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

// Export uses fixed en-US formats so Excel recognizes the columns as real
// dates/times (sortable, filterable) whatever the viewer's browser locale.
const exportDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});
const exportTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const exportZoneFormatter = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" });

/** "(555) 123-4567". Plain digits would get turned into numbers by Excel. */
function formatPhone(value) {
  const raw = String(value ?? "");
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* ── Export ───────────────────────────────────────────────────────────── */

/**
 * Downloads the whole thread as a CSV that opens directly in Excel. The
 * vendor appears by company name in From/To; their number has its own
 * column, since a vendor can have several.
 */
function exportThreadCsv(messages, company) {
  const vendorName = company?.trim() || "Vendor";

  const headers = [
    "Date",
    "Time",
    "Time Zone",
    "Direction",
    "From",
    "To",
    "Message",
    "Vendor Number",
    "Dashboard",
    "Delivery Status",
    "Timestamp (UTC)",
    "Message ID",
  ];

  // Oldest first so the file reads top to bottom like a conversation.
  const ordered = [...messages].sort((a, b) =>
    (a.sent_at ?? "").localeCompare(b.sent_at ?? ""),
  );

  const rows = ordered.map((m) => {
    const at = m.sent_at ? new Date(m.sent_at) : null;
    const received = m.direction === "received";
    // Our side: the dashboard's number when Text Request gives it, else its name.
    const ourSide = formatPhone(m.dashboard_phone) || m.dashboard || "Our team";

    return [
      at ? exportDateFormatter.format(at) : "",
      at ? exportTimeFormatter.format(at) : "",
      at ? zoneName(at) : "",
      received ? "Received" : "Sent",
      received ? vendorName : ourSide,
      received ? ourSide : vendorName,
      m.body ?? "",
      formatPhone(m.phone),
      m.dashboard ?? "",
      m.delivery_status === "error" ? "Not delivered" : (m.delivery_status ?? ""),
      at ? at.toISOString() : "",
      m.id ?? "",
    ];
  });

  // CRLF line endings + a UTF-8 BOM so Excel keeps emoji/accents intact.
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  const slug =
    vendorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "vendor";
  downloadFile(`﻿${csv}`, `text-thread_${slug}_${today}.csv`, "text/csv;charset=utf-8");
}

function zoneName(date) {
  return (
    exportZoneFormatter.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

/**
 * Quotes a value for CSV. Also neutralizes cells starting with = + - @ —
 * these texts come from outside, and Excel would otherwise run something
 * like "=HYPERLINK(...)" as a formula when the file is opened.
 */
function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Defer revoking so the browser has a chance to start the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ── Pieces ───────────────────────────────────────────────────────────── */

/** Wraps every case-insensitive occurrence of `query` in a <mark>. */
function Highlighted({ text, query }) {
  const body = text ?? "";
  if (!query) return body;
  // Typed "(" or "*" would break the RegExp; escape user input first.
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = body.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <Box
        key={i}
        component="mark"
        sx={{
          bgcolor: "rgba(255, 213, 79, 0.55)", // readable on both bubble colours
          color: "inherit",
          px: 0.25,
          borderRadius: 0.5,
        }}
      >
        {part}
      </Box>
    ) : (
      part
    ),
  );
}

function EmptyState({ children }) {
  return (
    <Box
      sx={{
        py: 5,
        px: 2,
        textAlign: "center",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        color: "text.secondary",
      }}
    >
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}

/* ── The component ────────────────────────────────────────────────────── */

export default function VendorTextMessages({ vendorId, company }) {
  const [data, setData] = useState(null); // the server's response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all"); // "all" | "received" | "sent"
  const [number, setNumber] = useState("all");

  const listRef = useRef(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!vendorId) return;
    const mine = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const { data: body } = await axios.get(`/api/text-request/vendors/${vendorId}/messages`);
      // A slow response for a previous vendor can't overwrite this one.
      if (mine === reqId.current) setData(body);
    } catch (e) {
      if (mine === reqId.current) {
        setError(e.response?.data?.error ?? "Couldn't load messages from Text Request.");
      }
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Switching vendors resets the filters, so a leftover search can't
  // silently hide the new vendor's messages.
  useEffect(() => {
    setQuery("");
    setDirection("all");
    setNumber("all");
  }, [vendorId]);

  const messages = data?.messages ?? [];
  const numbers = data?.numbers ?? [];
  const multipleNumbers = numbers.length > 1;
  const labelFor = (phone) => numbers.find((n) => n.phone === phone);

  const search = query.trim().toLowerCase();
  const isFiltering = Boolean(search) || direction !== "all" || number !== "all";

  const filtered = messages.filter((m) => {
    if (direction !== "all" && m.direction !== direction) return false;
    if (number !== "all" && m.phone !== number) return false;
    return !search || m.body?.toLowerCase().includes(search);
  });

  // One owner for the scroll position: newest at the bottom normally, the
  // first match at the top while filtering.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = isFiltering ? 0 : el.scrollHeight;
  }, [messages, search, direction, number, isFiltering]);

  /* ── Body ─────────────────────────────────────────────────────────── */

  let body;
  if (loading && !data) {
    body = (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 3 }}>
        <CircularProgress size={18} thickness={5} />
        <Typography variant="body2" color="text.secondary">
          Loading messages from Text Request…
        </Typography>
      </Box>
    );
  } else if (error) {
    body = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={load}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  } else if (numbers.length === 0) {
    body = (
      <EmptyState>
        No usable phone number on file for this vendor
        {data?.unusable?.length
          ? ` (${data.unusable.map((u) => `"${u.value}"`).join(", ")} isn't a full 10-digit number).`
          : ". Add one to the vendor or a contact to see their texts."}
      </EmptyState>
    );
  } else if (messages.length === 0) {
    body = (
      <EmptyState>
        No texts with {numbers.map((n) => n.display).join(", ")} in Text Request.
      </EmptyState>
    );
  } else {
    body = (
      <Stack spacing={1.5}>
        {/* Toolbar sits outside the scroll area so it stays put. */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery("")} aria-label="Clear search">
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          {multipleNumbers && (
            <TextField
              select
              size="small"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              sx={{ minWidth: 210, flexShrink: 0 }}
            >
              <MenuItem value="all">All {numbers.length} numbers</MenuItem>
              {numbers.map((n) => (
                <MenuItem key={n.phone} value={n.phone}>
                  {n.display}
                  {n.label ? ` · ${n.label}` : ""}
                </MenuItem>
              ))}
            </TextField>
          )}

          <ToggleButtonGroup
            value={direction}
            exclusive
            size="small"
            // null means the active button was clicked again; keep one selected.
            onChange={(_, next) => next !== null && setDirection(next)}
            sx={{ flexShrink: 0, "& .MuiToggleButton-root": { px: 1.5, textTransform: "none" } }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="received">Received</ToggleButton>
            <ToggleButton value="sent">Sent</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {isFiltering
            ? `${filtered.length} of ${messages.length} messages`
            : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
          {!multipleNumbers && numbers[0] ? ` with ${numbers[0].display}` : ""}
        </Typography>

        <Box
          ref={listRef}
          sx={{
            maxHeight: LIST_MAX_HEIGHT,
            overflowY: "auto",
            overscrollBehavior: "contain", // don't scroll the page at the end
            pr: 1,
          }}
        >
          {filtered.length === 0 ? (
            <EmptyState>No messages match your search.</EmptyState>
          ) : (
            <Stack spacing={1.25} sx={{ py: 0.5 }}>
              {filtered.map((m, i) => {
                const at = m.sent_at ? new Date(m.sent_at) : null;
                const day = at ? dayFormatter.format(at) : "Unknown date";
                const prev = filtered[i - 1];
                const prevDay = prev?.sent_at ? dayFormatter.format(new Date(prev.sent_at)) : null;
                const showDay = i === 0 || day !== prevDay;
                const received = m.direction === "received";
                const who = multipleNumbers ? labelFor(m.phone) : null;

                return (
                  <Box key={m.id}>
                    {showDay && (
                      <Divider sx={{ my: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {day}
                        </Typography>
                      </Divider>
                    )}
                    <Box sx={{ display: "flex", justifyContent: received ? "flex-start" : "flex-end" }}>
                      <Box
                        sx={{
                          maxWidth: "78%",
                          px: 1.75,
                          py: 1.25,
                          borderRadius: 2,
                          bgcolor: received ? "action.hover" : "primary.main",
                          color: received ? "text.primary" : "primary.contrastText",
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          <Highlighted text={m.body} query={query.trim()} />
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.75, opacity: 0.8 }}
                        >
                          <Typography variant="caption">{at ? timeFormatter.format(at) : ""}</Typography>
                          {who && received && (
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {who.label || who.display}
                            </Typography>
                          )}
                          {m.dashboard && (
                            <Chip
                              label={m.dashboard}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 11,
                                ...(received ? {} : { color: "inherit", bgcolor: "rgba(255,255,255,0.18)" }),
                              }}
                            />
                          )}
                          {m.delivery_status === "error" && (
                            <Typography
                              variant="caption"
                              sx={{ color: received ? "error.main" : "#ffcdd2", fontWeight: 600 }}
                            >
                              Not delivered
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Stack>
    );
  }

  return (
    <SectionCard
      title="Text Messages"
      icon={<SmsOutlinedIcon />}
      count={messages.length || null}
      actions={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {/* Always the FULL thread, ignoring search and filters: the export
              is a complete record, not whatever happens to be on screen. */}
          {messages.length > 0 && (
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => exportThreadCsv(messages, company ?? data?.company)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Export
            </Button>
          )}
          <Tooltip title="Reload from Text Request">
            <span>
              <IconButton size="small" onClick={load} disabled={loading}>
                {loading && data ? <CircularProgress size={16} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      }
    >
      {data?.partial && !error && (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0 }}>
          Some of our Text Request numbers couldn't be checked, so this thread
          may be missing messages. Try reloading.
        </Alert>
      )}
      {body}
    </SectionCard>
  );
}
