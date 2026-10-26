// tabs/documentation/VendorNoticesSection.jsx
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Link,
  useTheme,
  alpha,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import NotificationImportantOutlinedIcon from "@mui/icons-material/NotificationImportantOutlined";

import useAuthenticatedUser from "../../../../../../*/hooks/useAuthenticatedUser";
import { fmtDate } from "../../../../../../utils/date";
// Type-specific form modals — build these out as you define each form.
import ComplianceNoticeForm from "./Forms/ComplianceNoticeForm";
import WarningNoticeForm from "./Forms/WarningNoticeForm";
import TerminationNoticeForm from "./Forms/TerminationNoticeForm";
import { NOTICES_CHANGED } from "../../../../components/VendorNoticesSummary";

// Which types have a working form yet.
const READY = new Set(["compliance", "warning", "termination"]);

const money = (v) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

const pandadocUrl = (n) =>
  n.pandadoc_url ??
  (n.pandadoc_id ? `https://app.pandadoc.com/a/#/documents/${n.pandadoc_id}` : null);

/** Effective dates are date-only; read them without a time-zone shift. */
const fmtDay = (v) => {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// The three notice types, in ascending severity, each with its own color + form.
const NOTICE_TYPES = [
  {
    type: "compliance",
    label: "Compliance Notice",
    endpoint: "compliance",
    color: "#2563eb",
    icon: <NotificationImportantOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  {
    type: "warning",
    label: "Warning",
    endpoint: "warning",
    color: "#d97706",
    icon: <ReportProblemOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  {
    type: "termination",
    label: "Termination",
    endpoint: "termination",
    color: "#dc2626",
    icon: <GavelOutlinedIcon sx={{ fontSize: 16 }} />,
  },
];

const NOTICE_META = Object.fromEntries(NOTICE_TYPES.map((t) => [t.type, t]));

const STATUS_COLORS = {
  sent: "#2563eb",
  viewed: "#d97706",
  completed: "#16a34a",
  declined: "#dc2626",
  voided: "#6b7280",
};

// A single notice row in the history list.
function NoticeRow({ notice }) {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const meta = NOTICE_META[notice.notice_type] ?? {};
  const statusColor = STATUS_COLORS[notice.status] ?? "#6b7280";
  const url = pandadocUrl(notice);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderBottom: `1px solid ${theme.palette.divider}`,
        "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.02) },
      }}
    >
      {/* Type indicator */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 1,
          flexShrink: 0,
          color: meta.color,
          backgroundColor: alpha(meta.color ?? "#666", 0.12),
        }}
      >
        {meta.icon}
      </Box>

      {/* Type + date */}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
          {meta.label ?? notice.notice_type}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          Sent {fmtDate(notice.date_sent)}
          {notice.SentBy?.name ? ` · by ${notice.SentBy.name}` : ""}
          {notice.effective_date ? ` · effective ${fmtDay(notice.effective_date)}` : ""}
          {notice.back_charge ? " · back charge" : ""}
          {notice.deadline ? ` · deadline: ${notice.deadline}` : ""}
          {notice.penalty_amount != null ? ` · penalty ${money(notice.penalty_amount)}` : ""}
          {notice.photo_count ? ` · ${notice.photo_count} photo${notice.photo_count === 1 ? "" : "s"}` : ""}
          {notice.attachment_count
            ? ` · ${notice.attachment_count} PDF${notice.attachment_count === 1 ? "" : "s"}`
            : ""}
        </Typography>
        {notice.reason && (
          <Typography
            sx={{ fontSize: "0.75rem", color: "text.primary", mt: 0.25 }}
            title={
              notice.resolution
                ? `${notice.reason}\n\nExpected: ${notice.resolution}`
                : notice.reason
            }
            noWrap
          >
            {notice.reason}
          </Typography>
        )}
      </Box>

      {/* Status */}
      <Chip
        label={notice.status}
        size="small"
        sx={{
          height: 20,
          fontSize: "0.65rem",
          textTransform: "capitalize",
          fontWeight: 600,
          backgroundColor: alpha(statusColor, 0.14),
          color: statusColor,
        }}
      />

      {/* Open link */}
      {url && (
        <Link
          href={url}
          target="_blank"
          rel="noopener"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: "0.72rem",
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Link>
      )}

      {/* Row menu (void if sent in error, etc.) */}
      <IconButton
        size="small"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        sx={{ p: 0.25 }}
      >
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => setMenuAnchor(null)}
          sx={{ fontSize: "0.8rem" }}
        >
          Void (sent in error)
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default function VendorNoticesSection({ vendorId }) {
  const { user } = useAuthenticatedUser();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null); // which notice type's form is open
  const [lastResult, setLastResult] = useState(null); // what the last send did

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/vendors/${vendorId}/notices`);
      setNotices(data);
    } catch (e) {
      console.error("Error fetching notices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [vendorId]);

  // All notices, newest first — the full history.
  const sortedNotices = useMemo(
    () =>
      [...notices].sort(
        (a, b) => new Date(b.date_sent) - new Date(a.date_sent),
      ),
    [notices],
  );

  // Called by each type's form on successful send.
  const handleIssued = (result) => {
    const newNotice = result?.notice ?? result;
    setNotices((prev) => [newNotice, ...prev]);
    setLastResult(result?.notice ? result : null);
    setActiveForm(null);
    // The Details tab card and the header chip listen for this.
    window.dispatchEvent(new CustomEvent(NOTICES_CHANGED, { detail: { vendorId } }));
  };

  return (
    <Box>
      {/* Header + issue buttons */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: "1.1rem",
              mb: 0.25,
            }}
          >
            Notices & Warnings
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            Compliance notices, warnings, and termination notices issued to this
            vendor.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {NOTICE_TYPES.map((t) => (
            <Button
              key={t.type}
              size="small"
              variant="outlined"
              startIcon={t.icon}
              onClick={() => setActiveForm(t.type)}
              disabled={!READY.has(t.type)}
              title={READY.has(t.type) ? undefined : "Coming soon"}
              sx={{
                fontSize: "0.75rem",
                color: t.color,
                borderColor: alpha(t.color, 0.5),
                "&:hover": {
                  borderColor: t.color,
                  backgroundColor: alpha(t.color, 0.04),
                },
              }}
            >
              {t.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* What the last send did, so nobody has to go check. */}
      {lastResult?.notice?.notice_type === "termination" && (
        <Alert
          severity={lastResult.email?.failed || lastResult.email?.skipped ? "warning" : "success"}
          onClose={() => setLastResult(null)}
          sx={{ mb: 2 }}
        >
          Termination notice sent to <strong>{lastResult.recipient}</strong>.{" "}
          {lastResult.closed} service line{lastResult.closed === 1 ? "" : "s"} closed
          {lastResult.flagged
            ? `, ${lastResult.flagged} flagged "Resource now" in Sourcing`
            : ""}
          .{lastResult.vendor_terminated ? " Vendor status is now Terminated." : ""}{" "}
          {lastResult.email?.skipped
            ? "Accounting wasn't emailed: no recipients are set up on the server."
            : lastResult.email?.failed
              ? `The accounting email failed for ${lastResult.email.failed} recipient(s); let them know directly.`
              : "Accounting has been emailed."}
        </Alert>
      )}
      {lastResult?.notice?.notice_type === "compliance" && (
        <Alert
          severity={lastResult.email?.failed || lastResult.email?.skipped ? "warning" : "success"}
          onClose={() => setLastResult(null)}
          sx={{ mb: 2 }}
        >
          Compliance notice sent to <strong>{lastResult.recipient}</strong> about {lastResult.lines}{" "}
          service line{lastResult.lines === 1 ? "" : "s"} at {lastResult.sites} site
          {lastResult.sites === 1 ? "" : "s"}
          {lastResult.penalty != null ? `, with a ${money(lastResult.penalty)} penalty` : ""}.{" "}
          {lastResult.email?.skipped
            ? "Accounting wasn't emailed: no recipients are set up on the server."
            : lastResult.email?.failed
              ? `The accounting email failed for ${lastResult.email.failed} recipient(s); let them know directly.`
              : "Accounting has been emailed."}
        </Alert>
      )}
      {lastResult?.notice?.notice_type === "warning" && (
        <Alert severity="success" onClose={() => setLastResult(null)} sx={{ mb: 2 }}>
          Warning sent to <strong>{lastResult.recipient}</strong> about {lastResult.lines} service
          line{lastResult.lines === 1 ? "" : "s"} at {lastResult.sites} site
          {lastResult.sites === 1 ? "" : "s"}
          {lastResult.photos ? `, with ${lastResult.photos} photo${lastResult.photos === 1 ? "" : "s"}` : ""}
          {lastResult.attachments
            ? ` and ${lastResult.attachments} PDF${lastResult.attachments === 1 ? "" : "s"} attached`
            : ""}
          . It's on each line's history in Sourcing.
        </Alert>
      )}

      {/* History list */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : sortedNotices.length === 0 ? (
        <Box
          sx={{
            py: 5,
            textAlign: "center",
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
            No notices have been issued to this vendor.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {sortedNotices.map((notice) => (
            <NoticeRow key={notice.id} notice={notice} />
          ))}
        </Box>
      )}

      {/* Each notice type has its own form; each posts to
          /api/vendors/:id/notices/:type and hands handleIssued the result. */}
      {activeForm === "compliance" && (
        <ComplianceNoticeForm
          vendorId={vendorId}
          user={user}
          onClose={() => setActiveForm(null)}
          onIssued={handleIssued}
        />
      )}
      {activeForm === "warning" && (
        <WarningNoticeForm
          vendorId={vendorId}
          user={user}
          onClose={() => setActiveForm(null)}
          onIssued={handleIssued}
        />
      )}
      {activeForm === "termination" && (
        <TerminationNoticeForm
          vendorId={vendorId}
          user={user}
          onClose={() => setActiveForm(null)}
          onIssued={handleIssued}
        />
      )}

    </Box>
  );
}
