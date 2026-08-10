// tabs/documentation/VendorComplianceSection.jsx
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Collapse,
  Link,
  useTheme,
  alpha,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import ConfirmDialog from "../../../../components/ConfirmDialog";
import useAuthenticatedUser from "../../../../*/hooks/useAuthenticatedUser";
import VendorCoiCard from "./VendorCoiCard";

const COMPLIANCE_TYPES = [
  { type: "MSA", label: "MSA", endpoint: "msa" },
  { type: "W9", label: "W-9", endpoint: "w9" },
  { type: "ACH", label: "ACH", endpoint: "ach" },
];

// muted status colors — kept subtle so the cards don't shout
const STATUS_COLORS = {
  sent: "#2563eb",
  viewed: "#d97706",
  completed: "#16a34a",
  declined: "#dc2626",
  voided: "#6b7280",
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

// Compact card for one document TYPE — shows the active doc + history.
function DocumentCard({
  docType,
  active,
  history,
  busy,
  onSend,
  onResend,
  onSendNew,
}) {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const openMenu = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const state = !active
    ? "none"
    : active.status === "completed"
      ? "completed"
      : "in_progress";

  const statusColor = active
    ? (STATUS_COLORS[active.status] ?? "#6b7280")
    : null;

  return (
    <Box
      sx={{
        width: 200,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header: type + status + menu */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}
        >
          <DescriptionOutlinedIcon
            sx={{ fontSize: 16, color: "text.disabled" }}
          />
          <Typography
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 700,
              fontSize: "0.8rem",
            }}
          >
            {docType.label}
          </Typography>
        </Box>

        {busy ? (
          <CircularProgress size={14} />
        ) : (
          <IconButton size="small" onClick={openMenu} sx={{ p: 0.25 }}>
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ px: 1.5, py: 1.25, flex: 1 }}>
        {active ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                mb: 0.75,
              }}
            >
              <Chip
                label={active.status}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  textTransform: "capitalize",
                  fontWeight: 600,
                  backgroundColor: alpha(statusColor, 0.14),
                  color: statusColor,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
              Sent {fmtDate(active.date_sent)}
            </Typography>
            {active.date_completed && (
              <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                Completed {fmtDate(active.date_completed)}
              </Typography>
            )}
            {active.pandadoc_url && (
              <Link
                href={active.pandadoc_url}
                target="_blank"
                rel="noopener"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.25,
                  fontSize: "0.72rem",
                  mt: 0.75,
                }}
              >
                Open <OpenInNewIcon sx={{ fontSize: 12 }} />
              </Link>
            )}
          </>
        ) : (
          <Box sx={{ py: 0.5 }}>
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.disabled", mb: 1 }}
            >
              Not sent
            </Typography>
            <Button
              size="small"
              variant="contained"
              fullWidth
              disabled={busy}
              startIcon={<SendIcon sx={{ fontSize: 14 }} />}
              onClick={() => onSend(docType)}
              sx={{ fontSize: "0.72rem", py: 0.4 }}
            >
              Send
            </Button>
          </Box>
        )}

        {/* History toggle */}
        {history.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Box
              onClick={() => setShowHistory((v) => !v)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.25,
                cursor: "pointer",
                color: "text.disabled",
                "&:hover": { color: "text.secondary" },
              }}
            >
              <ExpandMoreIcon
                sx={{
                  fontSize: 14,
                  transform: showHistory ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              />
              <Typography sx={{ fontSize: "0.65rem" }}>
                {history.length} previous
              </Typography>
            </Box>
            <Collapse in={showHistory}>
              <Box sx={{ mt: 0.5, pl: 0.5 }}>
                {history.map((h) => (
                  <Box
                    key={h.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 0.35,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.65rem", color: "text.secondary" }}
                    >
                      {fmtDate(h.date_sent)} · {h.status}
                    </Typography>
                    {h.pandadoc_url && (
                      <Link
                        href={h.pandadoc_url}
                        target="_blank"
                        rel="noopener"
                        sx={{ display: "inline-flex", fontSize: "0.65rem" }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 11 }} />
                      </Link>
                    )}
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>

      {/* Actions menu */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        {state === "in_progress" && (
          <MenuItem
            onClick={() => {
              closeMenu();
              onResend(docType, active);
            }}
            sx={{ fontSize: "0.8rem" }}
          >
            Resend
          </MenuItem>
        )}
        {(state === "in_progress" || state === "completed") && (
          <MenuItem
            onClick={() => {
              closeMenu();
              onSendNew(docType);
            }}
            sx={{ fontSize: "0.8rem" }}
          >
            Send new copy
          </MenuItem>
        )}
        {state === "none" && (
          <MenuItem
            onClick={() => {
              closeMenu();
              onSend(docType);
            }}
            sx={{ fontSize: "0.8rem" }}
          >
            Send
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

export default function VendorComplianceSection({ vendorId }) {
  const { user } = useAuthenticatedUser();
  const [documents, setDocuments] = useState([]);
  const [busyType, setBusyType] = useState(null);
  const [confirmNew, setConfirmNew] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coi, setCoi] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/vendors/${vendorId}/documents`);
      setDocuments(data);
    } catch (e) {
      console.error("Error fetching documents:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoi = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/vendors/${vendorId}/coi`);
      setCoi(data);
    } catch (e) {
      console.error("Error fetching documents:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCoi();
  }, [vendorId]);

  // Group by type → { active: most recent, history: the rest } per type.
  const byType = useMemo(() => {
    const map = {};
    for (const t of COMPLIANCE_TYPES) map[t.type] = [];
    for (const d of documents) {
      if (map[d.document_type]) map[d.document_type].push(d);
    }
    const result = {};
    for (const t of COMPLIANCE_TYPES) {
      const sorted = [...map[t.type]].sort(
        (a, b) => new Date(b.date_sent) - new Date(a.date_sent),
      );
      result[t.type] = { active: sorted[0] ?? null, history: sorted.slice(1) };
    }
    return result;
  }, [documents]);

  const runSend = async (docType, path) => {
    setBusyType(docType.type);
    try {
      const { data } = await axios.post(
        `/api/vendors/${vendorId}/documents/${path}`,
        { user_id: user?.id },
      );
      setDocuments((prev) => [data, ...prev.filter((d) => d.id !== data.id)]);
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response.data?.needsPandaDocAuth
      ) {
        window.location.href = "/api/pandadoc/oauth/initiate";
      } else {
        console.error(`Error (${docType.type}):`, err);
      }
    } finally {
      setBusyType(null);
    }
  };

  const sendDocument = (docType) => runSend(docType, docType.endpoint);
  const sendNewCopy = (docType) => runSend(docType, `${docType.endpoint}/new`);
  const resendDocument = (docType, doc) =>
    runSend(docType, `${doc.pandadoc_id}/resend`);

  const handleConfirmNew = () => {
    if (confirmNew) sendNewCopy(confirmNew);
    setConfirmNew(null);
  };

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.1rem",
          mb: 0.25,
        }}
      >
        Compliance Documents
      </Typography>
      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 2 }}>
        Standard documents required for every vendor.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {COMPLIANCE_TYPES.map((docType) => (
            <DocumentCard
              key={docType.type}
              docType={docType}
              active={byType[docType.type].active}
              history={byType[docType.type].history}
              busy={busyType === docType.type}
              onSend={sendDocument}
              onSendNew={(dt) => setConfirmNew(dt)}
              onResend={resendDocument}
            />
          ))}
          <VendorCoiCard
            vendorId={vendorId}
            user={user}
            onUploaded={fetchCoi}
            coi={coi}
          />
        </Box>
      )}

      <ConfirmDialog
        open={!!confirmNew}
        onClose={() => setConfirmNew(null)}
        onConfirm={handleConfirmNew}
        title="Send a new copy?"
        message={
          confirmNew
            ? `This will void the current ${confirmNew.label} (if it's still open) and send a fresh copy to the vendor.`
            : ""
        }
        confirmLabel="Void & Send New"
      />
    </Box>
  );
}
