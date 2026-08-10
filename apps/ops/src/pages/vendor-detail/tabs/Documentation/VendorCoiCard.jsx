// tabs/documentation/VendorCoiCard.jsx
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogContent,
  TextField,
  Checkbox,
  FormControlLabel,
  Link,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

// Is the COI expired (or missing)?
const isExpired = (coi) => !coi || new Date(coi.expiration_date) < new Date();

export default function VendorCoiCard({ vendorId, coi, user, onUploaded }) {
  console.log("coi card", coi);
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [menuAnchor, setMenuAnchor] = useState(null);

  // verify-modal state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [expiration, setExpiration] = useState("");
  const [verified, setVerified] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Clean up the object URL when the modal closes / file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pickFile = () => fileInputRef.current?.click();

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // open the verify modal with a client-side preview (not uploaded yet)
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setExpiration("");
    setVerified(false);
    // reset the input so re-selecting the same file still fires onChange
    e.target.value = "";
  };

  const closeModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setExpiration("");
    setVerified(false);
  };

  const canSave = !!expiration && verified && !uploading;

  const handleSave = async () => {
    if (!canSave || !selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("expiration_date", expiration);
      form.append("additionally_insured_verified", "true");
      form.append("user_id", user?.id);

      const { data } = await axios.post(`/api/vendors/${vendorId}/coi`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded?.(data); // let the parent update its state
      closeModal();
    } catch (err) {
      console.error("COI upload failed:", err);
      // TODO: surface error
    } finally {
      setUploading(false);
    }
  };

  const expired = isExpired(coi);

  return (
    <>
      {/* Card */}
      <Box
        sx={{
          width: 200,
          border: `1px solid ${coi && !expired ? theme.palette.divider : alpha(theme.palette.warning.main, 0.4)}`,
          borderRadius: 2,
          backgroundColor: "background.paper",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
              COI
            </Typography>
          </Box>
          {coi && (
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ p: 0.25 }}
            >
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>

        {/* Body */}
        <Box sx={{ px: 1.5, py: 1.25, flex: 1 }}>
          {coi ? (
            <>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: expired ? "warning.main" : "text.secondary",
                  mb: 0.5,
                }}
              >
                {expired ? "Expired" : "Valid"} · exp{" "}
                {fmtDate(coi.expiration_date)}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  color: "text.disabled",
                  mb: 0.75,
                  wordBreak: "break-word",
                }}
              >
                {coi.file_name}
              </Typography>
              {coi.blob_url && (
                <Link
                  href={coi.blob_url}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.25,
                    fontSize: "0.72rem",
                  }}
                >
                  Open <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Link>
              )}
            </>
          ) : (
            <Box
              onClick={pickFile}
              sx={{
                border: `1.5px dashed ${theme.palette.divider}`,
                borderRadius: 1.5,
                py: 2,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: alpha(theme.palette.primary.main, 0.03),
                },
              }}
            >
              <CloudUploadOutlinedIcon
                sx={{ fontSize: 22, color: "text.disabled" }}
              />
              <Typography
                sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.5 }}
              >
                Upload COI
              </Typography>
            </Box>
          )}
        </Box>

        {/* Replace action for an existing COI */}
        <Menu
          anchorEl={menuAnchor}
          open={!!menuAnchor}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              pickFile();
            }}
            sx={{ fontSize: "0.8rem" }}
          >
            Replace COI
          </MenuItem>
        </Menu>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          hidden
          onChange={onFileChosen}
        />
      </Box>

      {/* Verify modal */}
      <Dialog
        open={!!selectedFile}
        onClose={uploading ? undefined : closeModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: "flex", minHeight: 520 }}>
            {/* Left: verify form */}
            <Box
              sx={{
                width: 360,
                flexShrink: 0,
                p: 3,
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                sx={{ fontWeight: 700, fontSize: "1.05rem", mb: 0.5 }}
              >
                Review and verify the COI
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  mb: 2.5,
                  wordBreak: "break-word",
                }}
              >
                {selectedFile?.name}
              </Typography>

              <TextField
                label="COI Expiration Date"
                type="date"
                size="small"
                fullWidth
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography sx={{ fontSize: "0.82rem" }}>
                    I have reviewed and verified that this document lists our
                    company as additionally insured.
                  </Typography>
                }
                sx={{ alignItems: "flex-start", mb: 3 }}
              />

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  onClick={closeModal}
                  disabled={uploading}
                  sx={{ color: "text.secondary" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={!canSave}
                  startIcon={
                    uploading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : null
                  }
                >
                  {uploading ? "Saving…" : "Save COI"}
                </Button>
              </Box>

              {!canSave && !uploading && (
                <Typography
                  sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 1.5 }}
                >
                  Set an expiration date and confirm additionally insured to
                  save.
                </Typography>
              )}
            </Box>

            {/* Right: client-side preview */}
            <Box
              sx={{
                flex: 1,
                backgroundColor: alpha(theme.palette.text.primary, 0.03),
              }}
            >
              {previewUrl && (
                <iframe
                  title="COI preview"
                  src={previewUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    minHeight: 520,
                  }}
                />
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
