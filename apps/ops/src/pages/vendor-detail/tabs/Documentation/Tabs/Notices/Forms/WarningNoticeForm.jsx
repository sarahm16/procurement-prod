// Notices/Forms/WarningNoticeForm.jsx
//
// Send a vendor a warning about a complaint, through PandaDoc.
//
//   <WarningNoticeForm vendorId={id} user={user}
//     onClose={…} onIssued={(result) => …} />
//
// Two steps, like the termination form:
//   1. The form: which sites and service lines it's about, the complaint,
//      the resolution expected, the deadline, photos and PDFs, and the
//      sender's title and phone.
//   2. A confirm screen.
// Nothing is closed: the warning is recorded against those lines so the
// site's Sourcing tab can show how many each vendor has had.
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SendIcon from "@mui/icons-material/Send";

import NoticeLinePicker, { chosenLines } from "./NoticeLinePicker";
import { loadSender, saveSender } from "./noticeSender";

const AMBER = "#d97706";

// Same limits as the server (vendorWarningRoutes.js).
const MAX_IMAGES = 15; // the notice has 15 photo slots
const MAX_PDFS = 10;
const MAX_FILE_MB = 25;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PDF_TYPE = "application/pdf";
const ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf";

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

/* ── Photos and PDFs ──────────────────────────────────────────────────── */

/**
 * Drop files or click to browse. Photos show as thumbnails (in the order
 * they'll fill the notice's slots); PDFs as a list. Anything over the
 * limits is turned away with a message rather than silently dropped.
 */
function FileDrop({ files, setFiles, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState(null);

  const photos = files.filter((f) => IMAGE_TYPES.includes(f.file.type));
  const pdfs = files.filter((f) => f.file.type === PDF_TYPE);

  // Thumbnails are object URLs; release whatever's left when the form
  // closes. The ref keeps the cleanup looking at the latest list.
  const latest = useRef(files);
  latest.current = files;
  useEffect(
    () => () => latest.current.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)),
    [],
  );

  const add = (list) => {
    const incoming = Array.from(list ?? []);
    let photoRoom = MAX_IMAGES - photos.length;
    let pdfRoom = MAX_PDFS - pdfs.length;
    const turnedAway = [];
    const accepted = [];

    for (const file of incoming) {
      const isPhoto = IMAGE_TYPES.includes(file.type);
      const isPdf = file.type === PDF_TYPE;
      if (!isPhoto && !isPdf) {
        turnedAway.push(`${file.name} (not a photo or PDF)`);
      } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
        turnedAway.push(`${file.name} (over ${MAX_FILE_MB} MB)`);
      } else if (isPhoto && photoRoom <= 0) {
        turnedAway.push(`${file.name} (the notice holds ${MAX_IMAGES} photos)`);
      } else if (isPdf && pdfRoom <= 0) {
        turnedAway.push(`${file.name} (up to ${MAX_PDFS} PDFs)`);
      } else {
        if (isPhoto) photoRoom -= 1;
        else pdfRoom -= 1;
        accepted.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          preview: isPhoto ? URL.createObjectURL(file) : null,
        });
      }
    }

    if (accepted.length) setFiles((cur) => [...cur, ...accepted]);
    setNotice(turnedAway.length ? `Not added: ${turnedAway.join(", ")}` : null);
  };

  const remove = (id) =>
    setFiles((cur) => {
      const gone = cur.find((f) => f.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return cur.filter((f) => f.id !== id);
    });

  return (
    <Box>
      <Box
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) add(e.dataTransfer.files);
        }}
        sx={(t) => ({
          border: "2px dashed",
          borderColor: over ? AMBER : t.palette.divider,
          bgcolor: over ? alpha(AMBER, 0.06) : "transparent",
          borderRadius: 1.5,
          py: 2,
          px: 2,
          textAlign: "center",
          cursor: disabled ? "default" : "pointer",
          transition: "border-color .12s, background-color .12s",
          "&:hover": disabled ? {} : { borderColor: AMBER },
        })}
      >
        <CloudUploadOutlinedIcon sx={{ color: "text.secondary" }} />
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Drop photos or PDFs here, or click to browse
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          Photos {photos.length}/{MAX_IMAGES} go on the notice · PDFs are attached ·{" "}
          {MAX_FILE_MB} MB each
        </Typography>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            add(e.target.files);
            e.target.value = ""; // so picking the same file again still fires
          }}
        />
      </Box>

      {notice && (
        <Alert severity="warning" sx={{ mt: 1, py: 0 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {photos.length > 0 && (
        <Box
          sx={{
            mt: 1.25,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 1,
          }}
        >
          {photos.map((f, i) => (
            <Box
              key={f.id}
              sx={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 1,
                overflow: "hidden",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Box
                component="img"
                src={f.preview}
                alt={f.file.name}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <Typography
                sx={{
                  position: "absolute",
                  left: 3,
                  bottom: 2,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#fff",
                  textShadow: "0 0 3px rgba(0,0,0,.8)",
                }}
              >
                {i + 1}
              </Typography>
              <Tooltip title={`Remove ${f.file.name}`}>
                <IconButton
                  size="small"
                  onClick={() => remove(f.id)}
                  disabled={disabled}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    p: 0.25,
                    bgcolor: "rgba(0,0,0,.55)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(0,0,0,.75)" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      {pdfs.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1.25 }}>
          {pdfs.map((f) => (
            <Stack key={f.id} direction="row" spacing={1} alignItems="center">
              <PictureAsPdfOutlinedIcon sx={{ fontSize: 18, color: "error.main" }} />
              <Typography sx={{ fontSize: "0.8rem", flex: 1, minWidth: 0 }} noWrap>
                {f.file.name}
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                {(f.file.size / 1024 / 1024).toFixed(1)} MB
              </Typography>
              <IconButton size="small" onClick={() => remove(f.id)} disabled={disabled}>
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

/* ── The form ─────────────────────────────────────────────────────────── */

export default function WarningNoticeForm({ vendorId, user, onClose, onIssued }) {
  const [options, setOptions] = useState(null); // { vendor, sites }
  const [loadError, setLoadError] = useState(null);

  // Nothing pre-selected: a warning is usually about one or two sites.
  const [selectedSites, setSelectedSites] = useState([]);
  const [excluded, setExcluded] = useState(() => new Set());
  const [complaint, setComplaint] = useState("");
  const [resolution, setResolution] = useState("");
  const [deadline, setDeadline] = useState("");
  const [files, setFiles] = useState([]); // [{ id, file, preview }]
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
      .then(({ data }) => active && setOptions(data))
      .catch(
        (e) => active && setLoadError(e.response?.data?.error ?? "Couldn't load the vendor's sites."),
      );
    return () => {
      active = false;
    };
  }, [vendorId]);

  const vendor = options?.vendor;
  const allSites = options?.sites ?? [];
  const chosen = useMemo(() => chosenLines(selectedSites, excluded), [selectedSites, excluded]);
  const lineIds = chosen.flatMap((s) => s.lines.map((l) => l.assignment_id));
  const photoCount = files.filter((f) => IMAGE_TYPES.includes(f.file.type)).length;
  const pdfCount = files.length - photoCount;

  const missing = [
    !lineIds.length && "at least one service line",
    !complaint.trim() && "the complaint",
    !resolution.trim() && "the resolution expected",
    !deadline.trim() && "a deadline",
    !title.trim() && "your title",
    !phone.trim() && "your phone number",
  ].filter(Boolean);
  const canContinue = Boolean(vendor?.recipient) && missing.length === 0;

  const send = async () => {
    setSending(true);
    setError(null);
    setNeedsAuth(false);
    saveSender(title.trim(), phone.trim());

    const form = new FormData();
    form.append("complaint", complaint.trim());
    form.append("resolution", resolution.trim());
    form.append("deadline", deadline.trim());
    form.append("sender_title", title.trim());
    form.append("sender_phone", phone.trim());
    form.append("assignment_ids", JSON.stringify(lineIds));
    form.append("user_id", String(user?.id ?? ""));
    // Photos first, in the order shown — that's the slot order on the notice.
    [...files]
      .sort((a, b) => Number(b.file.type !== PDF_TYPE) - Number(a.file.type !== PDF_TYPE))
      .forEach((f) => form.append("files", f.file, f.file.name));

    try {
      const { data } = await axios.post(`/api/vendors/${vendorId}/notices/warning`, form);
      onIssued?.(data);
    } catch (e) {
      const body = e.response?.data;
      if (body?.needsPandaDocAuth) setNeedsAuth(true);
      setError(body?.error ?? "Couldn't send the warning.");
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
            color: AMBER,
            bgcolor: alpha(AMBER, 0.12),
          }}
        >
          <ReportProblemOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.2 }}>
            {step === "confirm" ? "Send the warning?" : `Warn ${vendor?.company ?? "vendor"}`}
          </Typography>
          <Typography sx={{ fontSize: "0.76rem", color: "text.secondary" }}>
            {vendor?.recipient
              ? `The notice goes to ${vendor.recipient} through your PandaDoc account.`
              : "Sends a warning notice through PandaDoc."}
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
            nothing to warn them about here.
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
              label="Sites the warning is about"
            />
          </Section>

          <Section title="What happened">
            <Stack spacing={2}>
              <TextField
                label="The complaint received"
                size="small"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value.slice(0, 1000))}
                multiline
                minRows={2}
                fullWidth
                required
              />
              <TextField
                label="The resolution expected"
                size="small"
                value={resolution}
                onChange={(e) => setResolution(e.target.value.slice(0, 1000))}
                multiline
                minRows={2}
                fullWidth
                required
              />
              <TextField
                label="Deadline to resolve it"
                placeholder="e.g. 1 hour, by end of day Friday"
                size="small"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value.slice(0, 100))}
                fullWidth
                required
                helperText="Printed on the notice as typed"
              />
            </Stack>
          </Section>

          <Section title="Photos & documents">
            <FileDrop files={files} setFiles={setFiles} disabled={sending} />
          </Section>

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
              <strong>{vendor.recipient}</strong> receives a warning about{" "}
              <strong>
                {lineIds.length} service line{lineIds.length === 1 ? "" : "s"}
              </strong>{" "}
              at {chosen.length} site{chosen.length === 1 ? "" : "s"}.
            </li>
            <li>
              Deadline to resolve: <strong>{deadline.trim()}</strong>
            </li>
            <li>
              {photoCount
                ? `${photoCount} photo${photoCount === 1 ? "" : "s"} on the notice`
                : "No photos"}
              {pdfCount ? `, ${pdfCount} PDF${pdfCount === 1 ? "" : "s"} attached` : ""}.
            </li>
            <li>They stay on these lines. The warning is added to each line's history.</li>
          </Box>

          <Box sx={{ maxHeight: 160, overflowY: "auto", pl: 0.5 }}>
            {chosen.map((s) => (
              <Typography key={s.site_id} sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                • {s.client} - {s.store}: {s.lines.map((l) => l.service_line).join(", ")}
              </Typography>
            ))}
          </Box>

          {sending && (photoCount > 0 || pdfCount > 0) && (
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              Uploading the files and building the notice can take a few seconds…
            </Typography>
          )}

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
              color="warning"
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
              color="warning"
              onClick={send}
              disabled={sending}
              startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
            >
              {sending ? "Sending…" : "Send warning"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
