// tabs/documentation/Tabs/Miscellaneous/VendorMiscDocumentsSection.jsx
//
// Files the team uploads to a vendor that don't go through PandaDoc.
// Drag files in (or click), name them, add an optional note, upload.
// PDFs and images preview in place; everything else downloads.
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

import ConfirmDialog from "../../../../../../components/ConfirmDialog";
import useAuthenticatedUser from "../../../../../../*/hooks/useAuthenticatedUser";

// Keep in step with vendorMiscDocumentRoutes.js
const MAX_FILES = 20;
const MAX_FILE_MB = 25;
const ALLOWED = [
  "pdf", "jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tif", "tiff", "bmp",
  "doc", "docx", "rtf", "odt", "txt", "xls", "xlsx", "csv", "ods", "ppt", "pptx",
  "msg", "eml", "zip",
];
const ACCEPT = ALLOWED.map((e) => `.${e}`).join(",");
const SEARCH_FROM = 6; // show the search box once there are this many documents

const ext = (name = "") => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");

// What kind of file, for the icon, the label and whether it can preview.
const KINDS = {
  pdf: { label: "PDF", color: "#dc2626", Icon: PictureAsPdfOutlinedIcon, preview: "pdf" },
  image: { label: "Image", color: "#7c3aed", Icon: ImageOutlinedIcon, preview: "image" },
  sheet: { label: "Spreadsheet", color: "#16a34a", Icon: TableChartOutlinedIcon },
  doc: { label: "Document", color: "#2563eb", Icon: ArticleOutlinedIcon },
  slides: { label: "Slides", color: "#ea580c", Icon: SlideshowOutlinedIcon },
  email: { label: "Email", color: "#0891b2", Icon: MailOutlineIcon },
  zip: { label: "Zip", color: "#6b7280", Icon: FolderZipOutlinedIcon },
  other: { label: "File", color: "#6b7280", Icon: InsertDriveFileOutlinedIcon },
};
// Browsers can't draw HEIC or TIFF, so those are images that download.
const PREVIEWABLE_IMAGES = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];

function kindOf(fileName) {
  const e = ext(fileName);
  if (e === "pdf") return KINDS.pdf;
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tif", "tiff", "bmp"].includes(e)) {
    return PREVIEWABLE_IMAGES.includes(e) ? KINDS.image : { ...KINDS.image, preview: null };
  }
  if (["xls", "xlsx", "csv", "ods"].includes(e)) return KINDS.sheet;
  if (["doc", "docx", "rtf", "odt", "txt"].includes(e)) return KINDS.doc;
  if (["ppt", "pptx"].includes(e)) return KINDS.slides;
  if (["msg", "eml"].includes(e)) return KINDS.email;
  if (e === "zip") return KINDS.zip;
  return KINDS.other;
}

const fmtSize = (bytes) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const fmtDay = (v) =>
  v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

const baseName = (name) => name.replace(/\.[^.]+$/, "");

/** "Bid sheet" + "bid.xlsx" → "Bid sheet.xlsx" */
const downloadName = (doc) => {
  const e = ext(doc.file_name);
  return e && !doc.name.toLowerCase().endsWith(`.${e}`) ? `${doc.name}.${e}` : doc.name;
};

/** Pull the server's message out of an axios error (including blob responses). */
async function errorText(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).error ?? fallback;
    } catch {
      return fallback;
    }
  }
  return data?.error ?? fallback;
}

function problemWith(file) {
  if (!ALLOWED.includes(ext(file.name))) return "This type of file can't be uploaded";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `Over ${MAX_FILE_MB} MB`;
  if (file.size === 0) return "This file is empty";
  return null;
}

function KindAvatar({ fileName, size = 34 }) {
  const k = kindOf(fileName);
  return (
    <Avatar
      variant="rounded"
      sx={{ width: size, height: size, bgcolor: alpha(k.color, 0.1), color: k.color, borderRadius: 1.5 }}
    >
      <k.Icon sx={{ fontSize: size * 0.55 }} />
    </Avatar>
  );
}

/* ── Upload dialog ────────────────────────────────────────────────────── */

function UploadDialog({ files, onChange, onClose, onUpload, uploading, progress, error }) {
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (files.length === 0) setNotes("");
  }, [files.length]);

  const tooMany = files.length > MAX_FILES;
  const bad = files.some((f) => f.problem) || files.some((f) => !f.name.trim());
  const canUpload = files.length > 0 && !tooMany && !bad && !uploading;

  return (
    <Dialog open={files.length > 0} onClose={uploading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem", pb: 0.5 }}>
        Upload {files.length === 1 ? "a document" : `${files.length} documents`}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 2 }}>
          Give each one a name the team will recognize.
        </Typography>

        {files.map((f, i) => (
          <Box
            key={f.key}
            sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, mb: 1.5 }}
          >
            <Box sx={{ pt: 0.5 }}>
              <KindAvatar fileName={f.file.name} size={30} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TextField
                size="small"
                fullWidth
                value={f.name}
                disabled={uploading}
                error={!!f.problem || !f.name.trim()}
                onChange={(e) =>
                  onChange(files.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                inputProps={{ maxLength: 255, "aria-label": `Name for ${f.file.name}` }}
              />
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  mt: 0.25,
                  color: f.problem ? "error.main" : "text.disabled",
                  wordBreak: "break-word",
                }}
              >
                {f.file.name} · {fmtSize(f.file.size)}
                {f.problem ? ` · ${f.problem}` : ""}
              </Typography>
            </Box>
            <IconButton
              size="small"
              disabled={uploading}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              aria-label={`Remove ${f.file.name}`}
              sx={{ mt: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}

        {tooMany && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
            Up to {MAX_FILES} files at a time. Remove {files.length - MAX_FILES} to continue.
          </Alert>
        )}

        <TextField
          label="Note (optional)"
          placeholder="What these are, or why they're here"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={notes}
          disabled={uploading}
          onChange={(e) => setNotes(e.target.value)}
          inputProps={{ maxLength: 1000 }}
          InputLabelProps={{ shrink: true }}
          helperText={files.length > 1 ? "Added to every file in this upload" : " "}
          sx={{ mt: 1 }}
        />

        {uploading && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress variant={progress < 100 ? "determinate" : "indeterminate"} value={progress} />
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.5 }}>
              {progress < 100 ? `Uploading… ${progress}%` : "Saving…"}
            </Typography>
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.8rem" }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={uploading} sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canUpload}
          onClick={() => onUpload(notes)}
          startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadOutlinedIcon />}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Edit dialog ──────────────────────────────────────────────────────── */

function EditDialog({ doc, onClose, onSave }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (doc) {
      setName(doc.name);
      setNotes(doc.notes ?? "");
      setError("");
    }
  }, [doc]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(doc, { name: name.trim(), notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(await errorText(err, "Couldn't save the changes. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!doc} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem" }}>Edit document</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          size="small"
          fullWidth
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 255 }}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label="Note"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          inputProps={{ maxLength: 1000 }}
        />
        {doc && (
          <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 1 }}>
            Uploaded as {doc.file_name}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.8rem" }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: "text.secondary" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Preview dialog ───────────────────────────────────────────────────── */

function PreviewDialog({ preview, onClose, onDownload }) {
  const theme = useTheme();
  const doc = preview?.doc;
  const kind = doc ? kindOf(doc.file_name) : null;

  return (
    <Dialog open={!!preview} onClose={onClose} maxWidth="lg" fullWidth>
      {doc && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <KindAvatar fileName={doc.file_name} size={28} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }} noWrap>
                {doc.name}
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }} noWrap>
                {doc.file_name} · {fmtSize(doc.size_bytes)}
              </Typography>
            </Box>
            <Tooltip title="Open in a new tab">
              <span>
                <IconButton
                  size="small"
                  disabled={!preview.url}
                  onClick={() => window.open(preview.url, "_blank", "noopener")}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton size="small" onClick={() => onDownload(doc)}>
                <DownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box
            sx={{
              height: "75vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.text.primary, 0.04),
            }}
          >
            {preview.error ? (
              <Typography sx={{ color: "error.main", fontSize: "0.85rem" }}>{preview.error}</Typography>
            ) : !preview.url ? (
              <CircularProgress size={26} />
            ) : kind.preview === "pdf" ? (
              <iframe
                title={doc.name}
                src={preview.url}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              <Box
                component="img"
                src={preview.url}
                alt={doc.name}
                sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            )}
          </Box>
        </>
      )}
    </Dialog>
  );
}

/* ── One row ──────────────────────────────────────────────────────────── */

function DocumentRow({ doc, busy, onOpen, onDownload, onEdit, onDelete }) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState(null);
  const kind = kindOf(doc.file_name);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderTop: `1px solid ${theme.palette.divider}`,
        "&:first-of-type": { borderTop: 0 },
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <KindAvatar fileName={doc.file_name} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="button"
          onClick={() => onOpen(doc)}
          sx={{
            all: "unset",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            wordBreak: "break-word",
            "&:hover": { color: "primary.main", textDecoration: "underline" },
            "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, borderRadius: 0.5 },
          }}
        >
          {doc.name}
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.25 }}>
          {kind.label} · {fmtSize(doc.size_bytes)} · {doc.UploadedBy?.name ?? "Unknown"} ·{" "}
          {fmtDay(doc.created_at)}
        </Typography>
        {doc.notes && (
          <Typography sx={{ fontSize: "0.78rem", mt: 0.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {doc.notes}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {busy ? (
          <CircularProgress size={16} sx={{ m: 1 }} />
        ) : (
          <>
            {kind.preview && (
              <Tooltip title="Preview">
                <IconButton size="small" onClick={() => onOpen(doc)}>
                  <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Download">
              <IconButton size="small" onClick={() => onDownload(doc)}>
                <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="More">
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </>
        )}
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <MenuItem
            sx={{ fontSize: "0.8rem" }}
            onClick={() => {
              setAnchor(null);
              onEdit(doc);
            }}
          >
            Rename or edit note
          </MenuItem>
          <MenuItem
            sx={{ fontSize: "0.8rem", color: "error.main" }}
            onClick={() => {
              setAnchor(null);
              onDelete(doc);
            }}
          >
            Delete
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

/* ── Section ──────────────────────────────────────────────────────────── */

export default function VendorMiscDocumentsSection({ vendorId }) {
  const theme = useTheme();
  const { user } = useAuthenticatedUser();
  const inputRef = useRef(null);
  const keyRef = useRef(0);

  const [docs, setDocs] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);

  const [pending, setPending] = useState([]); // files waiting in the upload dialog
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const [preview, setPreview] = useState(null); // { doc, url, error }
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null); // { severity, message }

  const base = `/api/vendors/${vendorId}/misc-documents`;

  const load = async () => {
    try {
      const { data } = await axios.get(base);
      setDocs(data);
      setLoadError("");
    } catch (e) {
      console.error("Error loading vendor documents:", e);
      setDocs((d) => d ?? []);
      setLoadError("Couldn't load the documents.");
    }
  };

  useEffect(() => {
    setDocs(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // Free the preview's object URL when it closes.
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !docs) return docs ?? [];
    return docs.filter((d) =>
      [d.name, d.file_name, d.notes, d.UploadedBy?.name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [docs, search]);

  /* adding files */

  const addFiles = (list) => {
    const added = Array.from(list ?? []).map((file) => ({
      key: ++keyRef.current,
      file,
      name: baseName(file.name),
      problem: problemWith(file),
    }));
    if (!added.length) return;
    setUploadError("");
    setPending((p) => [...p, ...added]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const dragProps = {
    onDragOver: (e) => {
      e.preventDefault();
      if (!dragging) setDragging(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop,
  };

  const upload = async (notes) => {
    setUploading(true);
    setProgress(0);
    setUploadError("");
    try {
      const form = new FormData();
      pending.forEach((p) => form.append("files", p.file));
      form.append("names", JSON.stringify(pending.map((p) => p.name.trim())));
      form.append("notes", notes.trim());
      form.append("user_id", user?.id ?? "");
      const { data } = await axios.post(base, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      setDocs((d) => [...data.documents, ...(d ?? [])]);
      setPending([]);
      const n = data.documents.length;
      setToast(
        data.failed?.length
          ? {
              severity: "warning",
              message: `Uploaded ${n}. These didn't upload, so try them again: ${data.failed.join(", ")}`,
            }
          : { severity: "success", message: `Uploaded ${n === 1 ? "1 document" : `${n} documents`}` },
      );
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(await errorText(err, "The upload failed. Try again."));
    } finally {
      setUploading(false);
    }
  };

  /* reading files */

  const fetchFile = async (doc, download) => {
    const { data } = await axios.get(`${base}/${doc.id}/file`, {
      params: download ? { download: 1 } : undefined,
      responseType: "blob",
    });
    return URL.createObjectURL(new Blob([data], { type: doc.content_type }));
  };

  const download = async (doc) => {
    setBusyId(doc.id);
    try {
      const url = await fetchFile(doc, true);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName(doc);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Download failed:", err);
      setToast({ severity: "error", message: await errorText(err, "Couldn't download that file.") });
    } finally {
      setBusyId(null);
    }
  };

  const open = async (doc) => {
    if (!kindOf(doc.file_name).preview) return download(doc);
    setPreview({ doc, url: null });
    try {
      const url = await fetchFile(doc, false);
      setPreview((p) => (p?.doc.id === doc.id ? { ...p, url } : (URL.revokeObjectURL(url), p)));
    } catch (err) {
      console.error("Preview failed:", err);
      const message = await errorText(err, "Couldn't open that file.");
      setPreview((p) => (p?.doc.id === doc.id ? { ...p, error: message } : p));
    }
  };

  /* editing and deleting */

  const saveEdit = async (doc, changes) => {
    const { data } = await axios.patch(`${base}/${doc.id}`, { ...changes, user_id: user?.id });
    setDocs((d) => d.map((x) => (x.id === data.id ? data : x)));
  };

  const confirmDelete = async () => {
    const doc = deleting;
    setDeleting(null);
    if (!doc) return;
    setBusyId(doc.id);
    try {
      await axios.delete(`${base}/${doc.id}`, { data: { user_id: user?.id } });
      setDocs((d) => d.filter((x) => x.id !== doc.id));
      setToast({ severity: "success", message: `Deleted ${doc.name}` });
    } catch (err) {
      console.error("Delete failed:", err);
      setToast({ severity: "error", message: await errorText(err, "Couldn't delete that document.") });
    } finally {
      setBusyId(null);
    }
  };

  const hasDocs = docs?.length > 0;

  return (
    <Box {...dragProps} sx={{ position: "relative", minHeight: 240 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography
            sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: "1.1rem", mb: 0.25 }}
          >
            Miscellaneous Documents
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            Other files kept on this vendor that aren't sent through PandaDoc.
          </Typography>
        </Box>
        {docs?.length >= SEARCH_FROM && (
          <TextField
            size="small"
            placeholder="Search documents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
        )}
        {hasDocs && (
          <Button
            variant="contained"
            size="small"
            startIcon={<CloudUploadOutlinedIcon />}
            onClick={() => inputRef.current?.click()}
          >
            Upload
          </Button>
        )}
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2, fontSize: "0.8rem" }}>
          {loadError}{" "}
          <Button size="small" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      {docs === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : !hasDocs ? (
        /* Empty: the drop zone is the whole content */
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: `1.5px dashed ${dragging ? theme.palette.primary.main : theme.palette.divider}`,
            borderRadius: 2,
            py: 6,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: dragging ? alpha(theme.palette.primary.main, 0.04) : "transparent",
            "&:hover": { borderColor: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.03) },
          }}
        >
          <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: "text.disabled" }} />
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, mt: 1 }}>
            Drop files here or click to choose
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.5 }}>
            PDFs, images, Office files, emails or zips · up to {MAX_FILE_MB} MB each
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              bgcolor: "background.paper",
              overflow: "hidden",
            }}
          >
            {shown.length ? (
              shown.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  busy={busyId === doc.id}
                  onOpen={open}
                  onDownload={download}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))
            ) : (
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", p: 2, textAlign: "center" }}>
                No documents match "{search}".
              </Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 1 }}>
            {docs.length} document{docs.length === 1 ? "" : "s"} · drag files anywhere here to upload
          </Typography>
        </>
      )}

      {/* Drag overlay once there's a list */}
      {hasDocs && dragging && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            border: `2px dashed ${theme.palette.primary.main}`,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.88),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <CloudUploadOutlinedIcon sx={{ fontSize: 34, color: "primary.main" }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "primary.main", mt: 0.5 }}>
            Drop to upload
          </Typography>
        </Box>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // so choosing the same file again still fires
        }}
      />

      <UploadDialog
        files={pending}
        onChange={setPending}
        onClose={() => {
          setPending([]);
          setUploadError("");
        }}
        onUpload={upload}
        uploading={uploading}
        progress={progress}
        error={uploadError}
      />
      <EditDialog doc={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      <PreviewDialog preview={preview} onClose={() => setPreview(null)} onDownload={download} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete this document?"
        message={
          deleting
            ? `${deleting.name} will be removed from this vendor. The file itself is kept in storage, so an admin can bring it back.`
            : ""
        }
        confirmLabel="Delete"
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={toast?.severity === "success" ? 3000 : 8000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ fontSize: "0.8rem" }}>
            {toast.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </Box>
  );
}
