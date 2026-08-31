// components/attachments/FileUploadSection.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

const fileIcon = (contentType = "", fileName = "") => {
  const ct = (contentType || "").toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ct.startsWith("image/")) return <ImageOutlinedIcon fontSize="small" />;
  if (ct === "application/pdf" || ext === "pdf")
    return <PictureAsPdfOutlinedIcon fontSize="small" />;
  if (ct.includes("word") || ["doc", "docx"].includes(ext))
    return <DescriptionOutlinedIcon fontSize="small" />;
  if (
    ct.includes("sheet") ||
    ct.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  )
    return <TableChartOutlinedIcon fontSize="small" />;
  return <InsertDriveFileOutlinedIcon fontSize="small" />;
};

/**
 * Reusable attachment upload section.
 *
 * Props:
 *  - basePath:  the attachments endpoint base, e.g. `/api/sites/12/attachments`
 *               or `/api/workorders/5/attachments`
 *  - category:  optional - appended as ?category= on GET and sent on POST.
 *               Omit for endpoints without categories (e.g. sites).
 *  - title, subtitle: section header text
 *  - variant:   "grid" (image thumbnails) | "list" (file rows)
 *  - accept:    input accept string
 *  - readOnly:  hide the dropzone
 *  - maxContentHeight: px cap before the content scrolls (default 340)
 */
export default function FileUploadSection({
  basePath,
  category,
  title,
  subtitle,
  variant = "list",
  accept,
  readOnly = false,
  maxContentHeight = 340,
}) {
  const theme = useTheme();
  const { user } = useAuthenticatedUser();
  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const url = category ? `${basePath}?category=${category}` : basePath;
      const { data } = await axios.get(url);
      setItems(data);
    } catch (e) {
      console.error(`Error fetching attachments:`, e);
    } finally {
      setLoading(false);
    }
  }, [basePath, category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const uploadFiles = async (fileList) => {
    let chosen = Array.from(fileList);
    if (variant === "grid")
      chosen = chosen.filter((f) => f.type.startsWith("image/"));
    if (chosen.length === 0) return;

    setUploading(true);
    try {
      const form = new FormData();
      chosen.forEach((f) => form.append("files", f));
      if (category) form.append("category", category);
      form.append("user_id", user?.id ?? "");

      const { data } = await axios.post(basePath, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setItems((prev) => [...data, ...prev]);
    } catch (e) {
      console.error(`Error uploading attachments:`, e);
    } finally {
      setUploading(false);
    }
  };

  const onFilesChosen = (e) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const deleteItem = async (itemId) => {
    setDeletingId(itemId);
    try {
      await axios.delete(`${basePath}/${itemId}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      console.error("Error deleting:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const count = items.length;

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {count > 0 && (
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "text.secondary",
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
              px: 1,
              py: 0.25,
              borderRadius: 1,
            }}
          >
            {count}
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Dropzone */}
        {!readOnly && (
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              border: `1.5px dashed ${
                dragActive ? theme.palette.primary.main : theme.palette.divider
              }`,
              borderRadius: 1.5,
              py: 1.25,
              px: 2,
              cursor: "pointer",
              backgroundColor: dragActive
                ? alpha(theme.palette.primary.main, 0.04)
                : alpha(theme.palette.text.primary, 0.015),
              transition: "all 0.15s",
              mb: count > 0 || loading ? 2 : 0,
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
              },
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={16} />
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                >
                  Uploading...
                </Typography>
              </>
            ) : (
              <>
                <CloudUploadOutlinedIcon
                  sx={{ fontSize: 18, color: "text.disabled" }}
                />
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                >
                  Drop {variant === "grid" ? "images" : "files"} here or{" "}
                  <Box
                    component="span"
                    sx={{ color: "primary.main", fontWeight: 600 }}
                  >
                    browse
                  </Box>
                </Typography>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={accept ?? (variant === "grid" ? "image/*" : undefined)}
              multiple
              hidden
              onChange={onFilesChosen}
            />
          </Box>
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : count === 0 ? (
          readOnly && (
            <Typography
              sx={{ fontSize: "0.8rem", color: "text.disabled", py: 1 }}
            >
              None yet.
            </Typography>
          )
        ) : variant === "grid" ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 1,
              maxHeight: maxContentHeight,
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {items.map((img) => (
              <Box
                key={img.id}
                sx={{
                  position: "relative",
                  borderRadius: 1,
                  overflow: "hidden",
                  aspectRatio: "1",
                  backgroundColor: alpha(theme.palette.text.primary, 0.03),
                  "&:hover .overlay": { opacity: 1 },
                }}
              >
                <Box
                  component="img"
                  src={img.blob_url}
                  alt={img.file_name}
                  loading="lazy"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <Box
                  className="overlay"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    p: 0.5,
                    gap: 0.5,
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 45%)",
                    opacity: 0,
                    transition: "opacity 0.15s",
                  }}
                >
                  <IconButton
                    size="small"
                    component="a"
                    href={img.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: "#fff", p: 0.25 }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => deleteItem(img.id)}
                      disabled={deletingId === img.id}
                      sx={{ color: "#fff", p: 0.25 }}
                    >
                      {deletingId === img.id ? (
                        <CircularProgress size={12} sx={{ color: "#fff" }} />
                      ) : (
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      )}
                    </IconButton>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              maxHeight: maxContentHeight,
              overflowY: "auto",
            }}
          >
            {items.map((file, idx) => (
              <Box
                key={file.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  py: 1,
                  borderTop:
                    idx === 0 ? "none" : `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box sx={{ color: "text.secondary", display: "flex" }}>
                  {fileIcon(file.content_type, file.file_name)}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.file_name}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.7rem", color: "text.disabled" }}
                  >
                    {fmtDate(file.created_at)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  component="a"
                  href={file.blob_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "text.secondary" }}
                >
                  <DownloadIcon sx={{ fontSize: 17 }} />
                </IconButton>
                {!readOnly && (
                  <IconButton
                    size="small"
                    onClick={() => deleteItem(file.id)}
                    disabled={deletingId === file.id}
                    sx={{
                      color: "text.disabled",
                      "&:hover": { color: "error.main" },
                    }}
                  >
                    {deletingId === file.id ? (
                      <CircularProgress size={13} />
                    ) : (
                      <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                    )}
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
