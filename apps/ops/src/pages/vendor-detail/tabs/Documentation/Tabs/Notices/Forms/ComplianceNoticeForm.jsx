// Notices/Forms/ComplianceNoticeForm.jsx
//
// Send a vendor a compliance (default) notice through PandaDoc, optionally
// assessing a penalty.
//
//   <ComplianceNoticeForm vendorId={id} user={user}
//     onClose={…} onIssued={(result) => …} />
//
// Two steps, like the other notices: the form, then a confirm screen.
// Nothing is closed; the notice is recorded against the lines it's about,
// and accounting is emailed (so a penalty gets withheld).
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import NotificationImportantOutlinedIcon from "@mui/icons-material/NotificationImportantOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";

import NoticeLinePicker, { chosenLines } from "./NoticeLinePicker";
import { loadSender, saveSender } from "./noticeSender";

const BLUE = "#2563eb";
const PENALTY_PATTERN = /^\d*\.?\d{0,2}$/; // what can be typed
const PENALTY_VALID = /^\d+(\.\d{1,2})?$/; // what can be sent

const money = (v) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** A date from the server (ISO) as YYYY-MM-DD for a date input. */
const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");
const fmtIso = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const Section = ({ title, children }) => (
  <Box>
    <Typography
      sx={{
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "text.secondary",
        mb: 1,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

export default function ComplianceNoticeForm({ vendorId, user, onClose, onIssued }) {
  const [options, setOptions] = useState(null); // { vendor, sites }
  const [loadError, setLoadError] = useState(null);

  const [selectedSites, setSelectedSites] = useState([]);
  const [excluded, setExcluded] = useState(() => new Set());
  const [natureOfDefault, setNatureOfDefault] = useState("");
  const [impact, setImpact] = useState("");
  const [deadline, setDeadline] = useState("");
  const [msaDate, setMsaDate] = useState("");
  const [penalize, setPenalize] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [title, setTitle] = useState(() => loadSender().title);
  const [phone, setPhone] = useState(() => loadSender().phone);

  const [step, setStep] = useState("form"); // form | confirm
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get(`/api/vendors/${vendorId}/notice-options`)
      .then(({ data }) => {
        if (!active) return;
        setOptions(data);
        // The signed MSA on file is usually the right date; it stays editable.
        setMsaDate(toDateInput(data?.vendor?.msa_last_updated));
      })
      .catch(
        (e) => active && setLoadError(e.response?.data?.error ?? "Couldn't load the vendor's sites."),
      );
    return () => {
      active = false;
    };
  }, [vendorId]);

  const vendor = options?.vendor;
  const allSites = options?.sites ?? [];
  const msaOnFile = Boolean(vendor?.msa_last_updated);
  const chosen = useMemo(() => chosenLines(selectedSites, excluded), [selectedSites, excluded]);
  const lineIds = chosen.flatMap((s) => s.lines.map((l) => l.assignment_id));
  const penaltyOk = PENALTY_VALID.test(penaltyAmount) && Number(penaltyAmount) > 0;

  const missing = [
    !lineIds.length && "at least one service line",
    !natureOfDefault.trim() && "the nature of the default",
    !impact.trim() && "the impact",
    !deadline.trim() && "a deadline",
    !msaDate && "the MSA date",
    penalize && !penaltyOk && "a penalty amount",
    penalize && !penaltyReason.trim() && "the penalty basis",
    !title.trim() && "your title",
    !phone.trim() && "your phone number",
  ].filter(Boolean);
  const canContinue = Boolean(vendor?.recipient) && missing.length === 0;

  const send = async () => {
    setSending(true);
    setError(null);
    setNeedsAuth(false);
    saveSender(title.trim(), phone.trim());
    try {
      const { data } = await axios.post(`/api/vendors/${vendorId}/notices/compliance`, {
        nature_of_default: natureOfDefault.trim(),
        impact: impact.trim(),
        deadline: deadline.trim(),
        msa_last_updated: msaDate || null,
        penalty: penalize ? { amount: penaltyAmount, reason: penaltyReason.trim() } : null,
        sender_title: title.trim(),
        sender_phone: phone.trim(),
        assignment_ids: lineIds,
        user_id: user?.id,
      });
      onIssued?.(data);
    } catch (e) {
      const body = e.response?.data;
      if (body?.needsPandaDocAuth) setNeedsAuth(true);
      setError(body?.error ?? "Couldn't send the notice.");
    } finally {
      setSending(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <Dialog open onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1 }}>
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: 1,
            color: BLUE,
            bgcolor: alpha(BLUE, 0.12),
          }}
        >
          <NotificationImportantOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.2 }}>
            {step === "confirm"
              ? "Send the compliance notice?"
              : `Compliance notice to ${vendor?.company ?? "vendor"}`}
          </Typography>
          <Typography sx={{ fontSize: "0.76rem", color: "text.secondary" }}>
            {vendor?.recipient
              ? `The notice goes to ${vendor.recipient} through your PandaDoc account.`
              : "Sends a compliance notice through PandaDoc."}
          </Typography>
        </Box>
      </DialogTitle>

      {!options && !loadError ? (
        <DialogContent sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={26} />
        </DialogContent>
      ) : loadError ? (
        <DialogContent>
          <Alert severity="error">{loadError}</Alert>
        </DialogContent>
      ) : allSites.length === 0 ? (
        <DialogContent>
          <Alert severity="info">
            {vendor?.company ?? "This vendor"} isn't on any service lines right now, so there's
            nothing to send a compliance notice about.
          </Alert>
        </DialogContent>
      ) : step === "form" ? (
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}
        >
          {!vendor?.recipient && (
            <Alert severity="error">
              This vendor has no email to send the notice to. Add a primary contact with an email
              on the Details tab first.
            </Alert>
          )}

          <Section title="Where">
            <NoticeLinePicker
              sites={allSites}
              selectedSites={selectedSites}
              setSelectedSites={setSelectedSites}
              excluded={excluded}
              setExcluded={setExcluded}
              label="Sites the notice is about"
            />
          </Section>

          <Section title="The default">
            <Stack spacing={2}>
              <TextField
                label="Nature of the default"
                size="small"
                value={natureOfDefault}
                onChange={(e) => setNatureOfDefault(e.target.value.slice(0, 1000))}
                multiline
                minRows={2}
                fullWidth
                required
                helperText="Delayed work, substandard quality, safety non-compliance, missed schedule, abandonment… With several sites, say what happened at each."
              />
              <TextField
                label="Impact"
                size="small"
                value={impact}
                onChange={(e) => setImpact(e.target.value.slice(0, 1000))}
                multiline
                minRows={2}
                fullWidth
                required
                helperText="Project delays, added costs, disruption to other vendors, missed client deadlines…"
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Deadline to cure"
                  placeholder="e.g. 1 hour, 48 hours"
                  size="small"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value.slice(0, 100))}
                  fullWidth
                  required
                  helperText="Printed on the notice as typed"
                />
                <TextField
                  label="MSA last updated"
                  type="date"
                  size="small"
                  value={msaDate}
                  onChange={(e) => setMsaDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 200 }}
                  required
                  helperText={
                    msaOnFile ? "From the signed MSA on file" : "No signed MSA on file; check the contract"
                  }
                  FormHelperTextProps={{ sx: { color: msaOnFile ? undefined : "warning.main" } }}
                />
              </Stack>
            </Stack>
          </Section>

          <FormControl>
            <FormLabel sx={{ fontSize: "0.85rem" }}>Assess a penalty for this failure?</FormLabel>
            <RadioGroup
              row
              value={String(penalize)}
              onChange={(e) => {
                const yes = e.target.value === "true";
                setPenalize(yes);
                // A switch to "No" and back never carries a stale amount.
                if (!yes) {
                  setPenaltyAmount("");
                  setPenaltyReason("");
                }
              }}
            >
              <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
              <FormControlLabel value="true" control={<Radio size="small" />} label="Yes" />
            </RadioGroup>
            {penalize && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Penalty amount"
                  size="small"
                  value={penaltyAmount}
                  onChange={(e) =>
                    PENALTY_PATTERN.test(e.target.value) && setPenaltyAmount(e.target.value)
                  }
                  placeholder="0.00"
                  inputProps={{ inputMode: "decimal" }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{ maxWidth: 220 }}
                  required
                  error={Boolean(penaltyAmount) && !penaltyOk}
                />
                <TextField
                  label="Basis for the penalty"
                  size="small"
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value.slice(0, 1000))}
                  multiline
                  minRows={2}
                  fullWidth
                  required
                  helperText="The contract provision or standard relied on, and how the amount was worked out"
                />
              </Stack>
            )}
          </FormControl>

          <Section title="From">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Name" size="small" value={user?.name ?? ""} disabled fullWidth />
              <TextField
                label="Your title"
                size="small"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Your phone"
                size="small"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                required
              />
            </Stack>
          </Section>
        </DialogContent>
      ) : (
        /* ── Confirm ── */
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}
        >
          <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { fontSize: "0.88rem", mb: 0.75 } }}>
            <li>
              <strong>{vendor.recipient}</strong> receives a compliance notice about{" "}
              <strong>
                {lineIds.length} service line{lineIds.length === 1 ? "" : "s"}
              </strong>{" "}
              at {chosen.length} site{chosen.length === 1 ? "" : "s"}.
            </li>
            <li>
              Deadline to cure: <strong>{deadline.trim()}</strong>. MSA last updated{" "}
              {fmtIso(msaDate)}.
            </li>
            {penalize ? (
              <li>
                <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                  A {money(penaltyAmount)} penalty is assessed
                </Box>
                , and accounting is emailed to withhold it.
              </li>
            ) : (
              <li>No penalty. Accounting is emailed a copy for their records.</li>
            )}
            <li>They stay on these lines. The notice is added to each line's history.</li>
          </Box>

          <Box sx={{ maxHeight: 160, overflowY: "auto", pl: 0.5 }}>
            {chosen.map((s) => (
              <Typography key={s.site_id} sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                • {s.client} - {s.store}: {s.lines.map((l) => l.service_line).join(", ")}
              </Typography>
            ))}
          </Box>

          {error && (
            <Alert severity="error">
              {error}
              {needsAuth && user?.id && (
                <>
                  {" "}
                  <Link
                    href={`/api/pandadoc/oauth/initiate/${user.id}`}
                    target="_blank"
                    rel="noopener"
                    sx={{ fontWeight: 600 }}
                  >
                    Reconnect PandaDoc
                  </Link>
                  , then send again.
                </>
              )}
            </Alert>
          )}
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {step === "form" ? (
          <>
            {options && missing.length > 0 && allSites.length > 0 && vendor?.recipient && (
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mr: "auto" }}>
                Still needed: {missing.join(", ")}
              </Typography>
            )}
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!canContinue}
              onClick={() => {
                setError(null);
                setStep("confirm");
              }}
              sx={{ bgcolor: BLUE, "&:hover": { bgcolor: "#1d4ed8" } }}
            >
              Review
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setStep("form")}
              color="inherit"
              disabled={sending}
              startIcon={<ArrowBackIcon />}
              sx={{ mr: "auto" }}
            >
              Back
            </Button>
            <Button onClick={onClose} color="inherit" disabled={sending}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={send}
              disabled={sending}
              startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
              sx={{ bgcolor: BLUE, "&:hover": { bgcolor: "#1d4ed8" } }}
            >
              {sending ? "Sending…" : "Send compliance notice"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
