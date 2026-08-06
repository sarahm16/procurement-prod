// Libraries
import { useState, useMemo, useEffect } from "react";
import axios from "axios";

import {
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";

import ConfirmDialog from "../../../../components/ConfirmDialog";

import useAuthenticatedUser from "../../../../*/hooks/useAuthenticatedUser";

// Fixed set of compliance docs, each mapped to its send endpoint slug.
// Add W9 here and it appears with working buttons — no handler changes.
const COMPLIANCE_TYPES = [
  { type: "MSA", label: "Master Service Agreement", endpoint: "msa" },
  { type: "ACH", label: "ACH Authorization", endpoint: "ach" },
  { type: "W9", label: "W-9", endpoint: "w9" },
];

const STATUS_COLORS = {
  sent: "#2563eb",
  viewed: "#d97706",
  completed: "#16a34a",
  declined: "#dc2626",
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

function ComplianceCard({
  docType,
  document,
  busy,
  onSend,
  onResend,
  onSendNew,
}) {
  const theme = useTheme();

  const state = !document
    ? "none"
    : document.status === "completed"
      ? "completed"
      : "in_progress";

  const statusColor = document
    ? (STATUS_COLORS[document.status] ?? "#6b7280")
    : null;

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        p: 2,
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: "1.05rem",
              }}
            >
              {docType.label}
            </Typography>
            <Chip
              label={docType.type}
              size="small"
              variant="outlined"
              sx={{ height: 20 }}
            />
            {document && (
              <Chip
                label={document.status}
                size="small"
                sx={{
                  height: 20,
                  textTransform: "capitalize",
                  backgroundColor: alpha(statusColor, 0.15),
                  color: statusColor,
                  fontWeight: 600,
                }}
              />
            )}
          </Box>

          {document ? (
            <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
              <Detail label="Sent" value={fmtDate(document.date_sent)} />
              <Detail
                label="Completed"
                value={fmtDate(document.date_completed)}
              />
            </Box>
          ) : (
            <Typography
              sx={{ fontSize: "0.85rem", color: "text.disabled", mt: 0.5 }}
            >
              Not yet sent
            </Typography>
          )}
        </Box>

        <Box
          sx={{ display: "flex", gap: 1, flexShrink: 0, alignItems: "center" }}
        >
          {busy && <CircularProgress size={18} />}

          {state === "none" && (
            <Button
              size="small"
              variant="contained"
              disabled={busy}
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={() => onSend(docType)}
            >
              Send
            </Button>
          )}

          {state === "in_progress" && (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                onClick={() => onResend(docType, document)}
              >
                Resend
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => onSendNew(docType)}
              >
                Send New
              </Button>
            </>
          )}

          {state === "completed" && (
            <Button
              size="small"
              variant="outlined"
              disabled={busy}
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => onSendNew(docType)}
            >
              Send New
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Detail({ label, value }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: "0.62rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.disabled",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.85rem" }}>{value}</Typography>
    </Box>
  );
}

export default function VendorComplianceTab({ vendorId }) {
  const { user } = useAuthenticatedUser();
  const [documents, setDocuments] = useState([]);
  const [busyType, setBusyType] = useState(null); // which doc type is mid-send

  const [confirmNew, setConfirmNew] = useState(null); // the docType awaiting confirmation

  // button calls this instead of sendNewCopy directly:
  const requestSendNew = (docType) => setConfirmNew(docType);

  // dialog confirm runs the actual send:
  const handleConfirmNew = () => {
    if (confirmNew) handleSendNew(confirmNew);
    setConfirmNew(null);
  };

  const fetchDocuments = async () => {
    const response = await axios.get(`/api/vendors/${vendorId}/documents`);
    setDocuments(response.data);
  };

  useEffect(() => {
    fetchDocuments();
  }, [vendorId]);

  const docByType = useMemo(() => {
    const map = {};
    for (const d of documents) {
      const existing = map[d.document_type];
      if (!existing || new Date(d.date_sent) > new Date(existing.date_sent)) {
        map[d.document_type] = d;
      }
    }
    return map;
  }, [documents]);

  // One generic sender — endpoint comes from the type's config.
  const sendDocument = async (docType) => {
    setBusyType(docType.type);
    try {
      const { data } = await axios.post(
        `/api/vendors/${vendorId}/documents/${docType.endpoint}`,
        { user_id: user?.id },
      );
      // insert/replace the record for this type so the card updates immediately
      setDocuments((prev) => [data, ...prev.filter((d) => d.id !== data.id)]);
    } catch (error) {
      console.error(`Error sending ${docType.type}:`, error);
      // TODO: surface error to user
    } finally {
      setBusyType(null);
    }
  };

  // Resend the SAME existing document (different endpoint/verb on the server)
  const resendDocument = async (docType, document) => {
    setBusyType(docType.type);
    try {
      const { data } = await axios.post(
        `/api/vendors/${vendorId}/documents/${document.pandadoc_id}/resend`,
        { user_id: user?.id },
      );
      setDocuments((prev) => prev.map((d) => (d.id === data.id ? data : d)));
    } catch (error) {
      console.error(`Error resending ${docType.type}:`, error);
    } finally {
      setBusyType(null);
    }
  };

  const handleSendNew = async (docType) => {
    setBusyType(docType.type);
    try {
      const { data } = await axios.post(
        `/api/vendors/${vendorId}/documents/${docType.endpoint}/new`,
        { user_id: user?.id },
      );
      // replace the type's record in state with the new one
      setDocuments((prev) => [data, ...prev.filter((d) => d.id !== data.id)]);
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response.data?.needsPandaDocAuth
      ) {
        window.location.href = "/api/pandadoc/oauth/initiate";
      } else {
        console.error(`Error sending new ${docType.type}:`, err);
      }
    } finally {
      setBusyType(null);
    }
  };

  return (
    <>
      {" "}
      <Box sx={{ pb: 4 }}>
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.disabled",
            mb: 1.5,
          }}
        >
          Compliance Documents
        </Typography>

        {COMPLIANCE_TYPES.map((docType) => (
          <ComplianceCard
            key={docType.type}
            docType={docType}
            document={docByType[docType.type]}
            busy={busyType === docType.type}
            onSend={sendDocument}
            onSendNew={requestSendNew} // open dialog to confirm user wants to send a NEW copy
            onResend={resendDocument} // resend = re-send the existing one
          />
        ))}
      </Box>
      <ConfirmDialog
        open={!!confirmNew}
        onClose={() => setConfirmNew(null)}
        onConfirm={handleConfirmNew}
        title="Send a new copy?"
        message={
          confirmNew
            ? `This will void the current ${confirmNew.label} and send a new copy to the vendor. The previous document will no longer be valid.`
            : ""
        }
        confirmLabel="Void & Send New"
      />
    </>
  );
}
