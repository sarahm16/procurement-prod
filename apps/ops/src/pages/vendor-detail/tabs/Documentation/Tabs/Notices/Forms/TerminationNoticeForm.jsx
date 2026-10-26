// Notices/Forms/TerminationNoticeForm.jsx
//
// Terminate a vendor from some or all of their service lines, with a notice.
//
//   <TerminationNoticeForm vendorId={id} user={user}
//     onClose={…} onIssued={(result) => …} />
//
// Two steps:
//   1. The form: effective date, reason, which sites (and which service lines
//      at each), back charge, and the sender's title and phone.
//   2. A confirm screen that says exactly what will happen.
// Sending: PandaDoc notice to the vendor → their assignments close and lines
// they were primary on are flagged "Resource now" in sourcing → accounting
// is emailed. See vendorTerminationRoutes.js on the server.
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
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import NoticeLinePicker, { chosenLines } from "./NoticeLinePicker";
import { loadSender, saveSender } from "./noticeSender";

const RED = "#dc2626";

/** Today as YYYY-MM-DD, local time (what a date input wants). */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
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

export default function TerminationNoticeForm({ vendorId, user, onClose, onIssued }) {
  const [options, setOptions] = useState(null); // { vendor, sites }
  const [loadError, setLoadError] = useState(null);

  const [effectiveDate, setEffectiveDate] = useState(todayIso);
  const [reason, setReason] = useState("");
  const [selectedSites, setSelectedSites] = useState([]);
  const [excluded, setExcluded] = useState(() => new Set()); // assignment ids unticked
  const [backCharge, setBackCharge] = useState(false);
  const [backChargeDetails, setBackChargeDetails] = useState("");
  const [title, setTitle] = useState(() => loadSender().title);
  const [phone, setPhone] = useState(() => loadSender().phone);

  const [step, setStep] = useState("form"); // form | confirm
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // What the vendor can be terminated from. All sites start selected, as in
  // the old form.
  useEffect(() => {
    let active = true;
    axios
      .get(`/api/vendors/${vendorId}/notice-options`)
      .then(({ data }) => {
        if (!active) return;
        setOptions(data);
        setSelectedSites(data.sites ?? []);
      })
      .catch((e) => active && setLoadError(e.response?.data?.error ?? "Couldn't load the vendor's sites."));
    return () => {
      active = false;
    };
  }, [vendorId]);

  const vendor = options?.vendor;
  const allSites = options?.sites ?? [];

  /** The lines that will actually be terminated. */
  const chosen = useMemo(() => chosenLines(selectedSites, excluded), [selectedSites, excluded]);
  const lineIds = chosen.flatMap((s) => s.lines.map((l) => l.assignment_id));
  const primaryCount = chosen.reduce((n, s) => n + s.lines.filter((l) => l.is_primary).length, 0);
  const totalLines = allSites.reduce((n, s) => n + s.lines.length, 0);
  const everything = lineIds.length > 0 && lineIds.length === totalLines;

  const missing = [
    !effectiveDate && "effective date",
    effectiveDate && effectiveDate < todayIso() && "an effective date that isn't in the past",
    !reason.trim() && "reason",
    !lineIds.length && "at least one service line",
    backCharge && !backChargeDetails.trim() && "back charge details",
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
      const { data } = await axios.post(`/api/vendors/${vendorId}/notices/termination`, {
        effective_date: effectiveDate,
        reason: reason.trim(),
        back_charge: backCharge,
        back_charge_details: backCharge ? backChargeDetails.trim() : "",
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

  const title_ = (
    <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1 }}>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 34,
          height: 34,
          borderRadius: 1,
          color: RED,
          bgcolor: alpha(RED, 0.12),
        }}
      >
        <GavelOutlinedIcon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.2 }}>
          {step === "confirm" ? "Send the termination notice?" : `Terminate ${vendor?.company ?? "vendor"}`}
        </Typography>
        <Typography sx={{ fontSize: "0.76rem", color: "text.secondary" }}>
          {vendor?.recipient
            ? `The notice goes to ${vendor.recipient} through your PandaDoc account.`
            : "Sends a notice of service termination through PandaDoc."}
        </Typography>
      </Box>
    </DialogTitle>
  );

  return (
    <Dialog open onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      {title_}

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
            nothing to terminate them from.
          </Alert>
        </DialogContent>
      ) : step === "form" ? (
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
          {!vendor?.recipient && (
            <Alert severity="error">
              This vendor has no email to send the notice to. Add a primary contact with an email
              on the Details tab first.
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Effective date"
              type="date"
              size="small"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              inputProps={{ min: todayIso() }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 190 }}
              required
            />
            <TextField
              label="Reason for termination"
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 1000))}
              fullWidth
              required
              multiline
              maxRows={4}
              helperText="Shown on the notice the vendor receives"
            />
          </Stack>

          <Section title="Where">
            <NoticeLinePicker
              sites={allSites}
              selectedSites={selectedSites}
              setSelectedSites={setSelectedSites}
              excluded={excluded}
              setExcluded={setExcluded}
              label="Sites to terminate"
              untickHint="Untick a service line to keep them on it."
            />
          </Section>

          <FormControl>
            <FormLabel sx={{ fontSize: "0.85rem" }}>Is there a back charge?</FormLabel>
            <RadioGroup row value={String(backCharge)} onChange={(e) => setBackCharge(e.target.value === "true")}>
              <FormControlLabel value="true" control={<Radio size="small" />} label="Yes" />
              <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
            </RadioGroup>
            {backCharge && (
              <TextField
                label="Brief explanation of the back charge"
                size="small"
                value={backChargeDetails}
                onChange={(e) => setBackChargeDetails(e.target.value.slice(0, 1000))}
                fullWidth
                required
                multiline
                maxRows={4}
                sx={{ mt: 1 }}
              />
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
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <Box
            component="ul"
            sx={{ m: 0, pl: 2.5, "& li": { fontSize: "0.88rem", mb: 0.75 } }}
          >
            <li>
              <strong>{vendor.recipient}</strong> receives the notice, effective{" "}
              <strong>{fmtIso(effectiveDate)}</strong>.
            </li>
            <li>
              {vendor.company} comes off <strong>{lineIds.length} service line{lineIds.length === 1 ? "" : "s"}</strong>{" "}
              at {chosen.length} site{chosen.length === 1 ? "" : "s"} right away.
            </li>
            {primaryCount > 0 && (
              <li>
                <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                  {primaryCount} line{primaryCount === 1 ? "" : "s"} they were the primary vendor on
                  {primaryCount === 1 ? " goes" : " go"} to the top of Sourcing as "Resource now".
                </Box>
              </li>
            )}
            {everything && (
              <li>
                That's every line they have, so their status becomes <strong>Terminated</strong>.
              </li>
            )}
            {backCharge && <li>The notice includes a back charge.</li>}
            <li>Accounting is emailed so they stop paying {vendor.company} for these sites.</li>
          </Box>

          <Box sx={{ maxHeight: 180, overflowY: "auto", pl: 0.5 }}>
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
              color="error"
              disabled={!canContinue}
              onClick={() => {
                setError(null);
                setStep("confirm");
              }}
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
              color="error"
              onClick={send}
              disabled={sending}
              startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <GavelOutlinedIcon />}
            >
              {sending ? "Sending…" : "Send termination notice"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
