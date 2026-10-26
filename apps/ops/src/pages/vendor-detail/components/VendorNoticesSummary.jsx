// vendor-detail/components/VendorNoticesSummary.jsx
//
// At-a-glance notices for the vendor's Details tab, so ops sees a warning
// before assigning the vendor more work.
//
//   <VendorNoticesSummary vendorId={id} />     the card (Details tab)
//   <VendorNoticeBadge vendorId={id} />        a small chip (page header)
//
// Both render nothing for a vendor with no notices. Voided notices (sent in
// error) are ignored. They refresh by themselves when a notice is sent from
// the Documentation tab (it fires NOTICES_CHANGED).
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import NotificationImportantOutlinedIcon from "@mui/icons-material/NotificationImportantOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import SectionCard from "../../../components/SectionCard";

/** Fired on window after any notice is sent, so other views can refresh. */
export const NOTICES_CHANGED = "vendor-notices-changed";

const AMBER = "#d97706";
const BLUE = "#2563eb";
const RED = "#dc2626";
const RECENT_DAYS = 365; // "warnings in the last year"
const SHOW = 3; // newest warnings / compliance notices listed on the card

const TYPE = {
  warning: { label: "Warning", color: AMBER },
  compliance: { label: "Compliance", color: BLUE },
};

const money = (v) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const DAY = 86400000;

const STATUS_COLORS = {
  sent: "#2563eb",
  viewed: "#d97706",
  completed: "#16a34a",
  declined: "#dc2626",
};

const fmt = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

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

const urlOf = (n) =>
  n.pandadoc_url ?? (n.pandadoc_id ? `https://app.pandadoc.com/a/#/documents/${n.pandadoc_id}` : null);

const ago = (v) => {
  const days = Math.floor((Date.now() - new Date(v).getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} month${months === 1 ? "" : "s"} ago` : `over a year ago`;
};

/**
 * The vendor's notices, newest first, split the way the summary needs them.
 * Two components using it means two requests; it's a small list.
 */
export function useVendorNotices(vendorId) {
  const [notices, setNotices] = useState(null);

  const load = useCallback(async () => {
    if (!vendorId) return;
    try {
      const { data } = await axios.get(`/api/vendors/${vendorId}/notices`);
      setNotices(
        (data ?? [])
          .filter((n) => n.status !== "voided")
          .sort((a, b) => new Date(b.date_sent) - new Date(a.date_sent)),
      );
    } catch (e) {
      console.error("Error loading vendor notices:", e);
      setNotices([]);
    }
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when a notice is sent anywhere on the page.
  useEffect(() => {
    const onChange = (e) => {
      if (!e.detail?.vendorId || Number(e.detail.vendorId) === Number(vendorId)) load();
    };
    window.addEventListener(NOTICES_CHANGED, onChange);
    return () => window.removeEventListener(NOTICES_CHANGED, onChange);
  }, [vendorId, load]);

  const all = notices ?? [];
  const recent = (n) => Date.now() - new Date(n.date_sent).getTime() <= RECENT_DAYS * DAY;
  const warnings = all.filter((n) => n.notice_type === "warning");
  const compliance = all.filter((n) => n.notice_type === "compliance");
  const terminations = all.filter((n) => n.notice_type === "termination");

  return {
    loading: notices === null,
    warnings,
    recentWarnings: warnings.filter(recent),
    compliance,
    recentCompliance: compliance.filter(recent),
    // Warnings and compliance notices together, newest first.
    issues: all.filter((n) => TYPE[n.notice_type]),
    terminations,
    latestTermination: terminations[0] ?? null,
    refresh: load,
  };
}

/* ── Header chip ──────────────────────────────────────────────────────── */

export function VendorNoticeBadge({ vendorId }) {
  const { loading, recentWarnings, recentCompliance, latestTermination } =
    useVendorNotices(vendorId);
  if (loading) return null;

  if (latestTermination) {
    return (
      <Tooltip
        arrow
        title={`Termination notice sent ${fmt(latestTermination.date_sent)}${
          latestTermination.reason ? `: ${latestTermination.reason}` : ""
        }`}
      >
        <Chip
          size="small"
          icon={<GavelOutlinedIcon sx={{ fontSize: "15px !important" }} />}
          // A notice can cover only some lines, so don't claim more than that.
          label="Termination notice"
          sx={{
            height: 22,
            fontWeight: 700,
            fontSize: "0.68rem",
            color: RED,
            bgcolor: alpha(RED, 0.1),
            "& .MuiChip-icon": { color: RED },
          }}
        />
      </Tooltip>
    );
  }

  // Warnings outrank compliance notices (that's the notices' own order).
  const list = recentWarnings.length ? recentWarnings : recentCompliance;
  if (!list.length) return null;
  const isWarning = list === recentWarnings;
  const color = isWarning ? AMBER : BLUE;
  const Icon = isWarning ? ReportProblemOutlinedIcon : NotificationImportantOutlinedIcon;
  const label = isWarning
    ? plural(list.length, "warning")
    : plural(list.length, "compliance notice");
  const extra =
    isWarning && recentCompliance.length
      ? ` · plus ${plural(recentCompliance.length, "compliance notice")}`
      : "";
  return (
    <Tooltip
      arrow
      title={`Last ${isWarning ? "warning" : "compliance notice"} ${ago(list[0].date_sent)}${
        list[0].reason ? `: ${list[0].reason}` : ""
      }${extra}`}
    >
      <Chip
        size="small"
        icon={<Icon sx={{ fontSize: "15px !important" }} />}
        label={label}
        sx={{
          height: 22,
          fontWeight: 700,
          fontSize: "0.68rem",
          color,
          bgcolor: alpha(color, 0.12),
          "& .MuiChip-icon": { color },
        }}
      />
    </Tooltip>
  );
}

/* ── Details tab card ─────────────────────────────────────────────────── */

function OpenLink({ notice }) {
  const url = urlOf(notice);
  if (!url) return null;
  return (
    <Tooltip title="Open the notice">
      <IconButton size="small" component="a" href={url} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25 }}>
        <OpenInNewIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  );
}

function WarningRow({ notice }) {
  const statusColor = STATUS_COLORS[notice.status] ?? "#6b7280";
  const type = TYPE[notice.notice_type] ?? TYPE.warning;
  return (
    <Box sx={{ py: 1, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: 0 } }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontSize: "0.66rem", fontWeight: 700, color: type.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {type.label}
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{fmt(notice.date_sent)}</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", flex: 1, minWidth: 0 }} noWrap>
          {notice.SentBy?.name ? `by ${notice.SentBy.name}` : ""}
          {notice.deadline ? ` · deadline: ${notice.deadline}` : ""}
        </Typography>
        <Chip
          label={notice.status}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            textTransform: "capitalize",
            color: statusColor,
            bgcolor: alpha(statusColor, 0.12),
          }}
        />
        <OpenLink notice={notice} />
      </Stack>
      {notice.reason && (
        <Typography sx={{ fontSize: "0.8rem", mt: 0.25 }}>{notice.reason}</Typography>
      )}
      {notice.resolution && (
        <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>
          Expected: {notice.resolution}
        </Typography>
      )}
      {notice.penalty_amount != null && (
        <Typography sx={{ fontSize: "0.74rem", color: "error.main", fontWeight: 600 }}>
          Penalty {money(notice.penalty_amount)}
          {notice.penalty_reason ? ` · ${notice.penalty_reason}` : ""}
        </Typography>
      )}
    </Box>
  );
}

export default function VendorNoticesSummary({ vendorId }) {
  const { loading, issues, recentWarnings, recentCompliance, latestTermination } =
    useVendorNotices(vendorId);

  // Nothing to flag: no card at all, so a clean vendor's page stays clean.
  if (loading || (!issues.length && !latestTermination)) return null;

  const nW = recentWarnings.length;
  const nC = recentCompliance.length;
  const tone = latestTermination ? RED : nW ? AMBER : BLUE;
  const headline = [
    nW && plural(nW, "warning"),
    nC && plural(nC, "compliance notice"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SectionCard
      title="Notices"
      icon={
        latestTermination ? (
          <GavelOutlinedIcon sx={{ color: `${RED} !important` }} />
        ) : (
          <ReportProblemOutlinedIcon sx={{ color: `${tone} !important` }} />
        )
      }
      collapsible={false}
      sx={{ borderColor: alpha(tone, 0.5), borderLeft: `4px solid ${tone}` }}
      badge={
        headline ? (
          <Chip
            size="small"
            label={`${headline} in the last year`}
            sx={{
              height: 20,
              fontSize: "0.66rem",
              fontWeight: 700,
              color: nW ? AMBER : BLUE,
              bgcolor: alpha(nW ? AMBER : BLUE, 0.12),
            }}
          />
        ) : null
      }
    >
      {latestTermination && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            p: 1.25,
            mb: issues.length ? 1.5 : 0,
            borderRadius: 1,
            bgcolor: alpha(RED, 0.07),
          }}
        >
          <GavelOutlinedIcon sx={{ fontSize: 18, color: RED, mt: 0.2 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: RED }}>
              Termination notice sent {fmt(latestTermination.date_sent)}
              {latestTermination.effective_date
                ? `, effective ${fmtDay(latestTermination.effective_date)}`
                : ""}
            </Typography>
            {latestTermination.reason && (
              <Typography sx={{ fontSize: "0.8rem" }}>{latestTermination.reason}</Typography>
            )}
          </Box>
          <OpenLink notice={latestTermination} />
        </Box>
      )}

      {issues.length > 0 && (
        <>
          {!headline && (
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1 }}>
              Nothing in the last year. Most recent:
            </Typography>
          )}
          {issues.slice(0, SHOW).map((w) => (
            <WarningRow key={w.id} notice={w} />
          ))}
        </>
      )}

      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 1 }}>
        {issues.length > SHOW ? `${issues.length - SHOW} more. ` : ""}
        Full history and new notices are under Documentation → Notices.
      </Typography>
    </SectionCard>
  );
}
