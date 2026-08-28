// workorder-details/tabs/AttachmentsTab/Attachments.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Link,
  useTheme,
  alpha,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

import useAuthenticatedUser from "../../../../*/hooks/useAuthenticatedUser";

const CATEGORY = "attachment";

// pick an icon based on the file's content type / extension
const fileIcon = (contentType = "", fileName = "") => {
  const ct = contentType.toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ct.startsWith("image/")) return <ImageOutlinedIcon />;
  if (ct === "application/pdf" || ext === "pdf")
    return <PictureAsPdfOutlinedIcon />;
  if (ct.includes("word") || ["doc", "docx"].includes(ext))
    return <DescriptionOutlinedIcon />;
  if (
    ct.includes("sheet") ||
    ct.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  )
    return <TableChartOutlinedIcon />;
  return <InsertDriveFileOutlinedIcon />;
};

const fmtBytes = (bytes) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

export default function Attachments() {
  const theme = useTheme();
  const { id } = useParams();
  const { user } = useAuthenticatedUser();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/workorders/${id}/attachments?category=${CATEGORY}`,
      );
      setFiles(data);
    } catch (e) {
      console.error("Error fetching attachments:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFiles = async (fileList) => {
    const chosen = Array.from(fileList);
    if (chosen.length === 0) return;

    setUploading(true);
    try {
      const form = new FormData();
      chosen.forEach((f) => form.append("files", f));
      form.append("category", CATEGORY);
      form.append("user_id", user?.id ?? "");

      const { data } = await axios.post(
        `/api/workorders/${id}/attachments`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setFiles((prev) => [...data, ...prev]);
    } catch (e) {
      console.error("Error uploading attachments:", e);
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

  const deleteFile = async (attachmentId) => {
    setDeletingId(attachmentId);
    try {
      await axios.delete(`/api/workorders/${id}/attachments/${attachmentId}`);
      setFiles((prev) => prev.filter((f) => f.id !== attachmentId));
    } catch (e) {
      console.error("Error deleting attachment:", e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: "1.1rem",
          }}
        >
          Attachments
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          Files and documents saved to this work order.
        </Typography>
      </Box>

      {/* Dropzone */}
      <Box
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        sx={{
          border: `1.5px dashed ${
            dragActive ? theme.palette.primary.main : theme.palette.divider
          }`,
          borderRadius: 2,
          p: 3,
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dragActive
            ? alpha(theme.palette.primary.main, 0.04)
            : "transparent",
          transition: "all 0.15s",
          mb: 2.5,
          "&:hover": {
            borderColor: "primary.main",
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          },
        }}
      >
        {uploading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CircularProgress size={24} />
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
              Uploading…
            </Typography>
          </Box>
        ) : (
          <>
            <CloudUploadOutlinedIcon
              sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }}
            />
            <Typography sx={{ fontSize: "0.88rem", fontWeight: 500 }}>
              Drop files here or click to upload
            </Typography>
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.5 }}
            >
              Any file type — multiple allowed
            </Typography>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={onFilesChosen}
        />
      </Box>

      {/* File list */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : files.length === 0 ? (
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "text.disabled",
            textAlign: "center",
            py: 3,
          }}
        >
          No attachments uploaded yet.
        </Typography>
      ) : (
        <Box
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {files.map((file) => (
            <Box
              key={file.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${theme.palette.divider}`,
                "&:last-of-type": { borderBottom: "none" },
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                },
              }}
            >
              <Box sx={{ color: "text.secondary", display: "flex" }}>
                {fileIcon(file.content_type, file.file_name)}
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.file_name}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.72rem", color: "text.disabled" }}
                >
                  {fmtDate(file.created_at)}
                  {file.file_size ? ` · ${fmtBytes(file.file_size)}` : ""}
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
                <DownloadIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => deleteFile(file.id)}
                disabled={deletingId === file.id}
                sx={{
                  color: "text.disabled",
                  "&:hover": { color: "error.main" },
                }}
              >
                {deletingId === file.id ? (
                  <CircularProgress size={14} />
                ) : (
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
