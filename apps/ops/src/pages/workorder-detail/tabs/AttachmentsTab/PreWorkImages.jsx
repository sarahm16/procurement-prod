// workorder-details/tabs/AttachmentsTab/PreWorkImages.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import useAuthenticatedUser from "../../../../*/hooks/useAuthenticatedUser";

const CATEGORY = "pre_work";

export default function PreWorkImages() {
  const theme = useTheme();
  const { id } = useParams();
  const { user } = useAuthenticatedUser();
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/workorders/${id}/attachments?category=${CATEGORY}`,
      );
      setImages(data);
    } catch (e) {
      console.error("Error fetching pre-work images:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadFiles = async (files) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    setUploading(true);
    try {
      const form = new FormData();
      imageFiles.forEach((f) => form.append("files", f));
      form.append("category", CATEGORY);
      form.append("user_id", user?.id ?? "");

      const { data } = await axios.post(
        `/api/workorders/${id}/attachments`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setImages((prev) => [...data, ...prev]);
    } catch (e) {
      console.error("Error uploading pre-work images:", e);
    } finally {
      setUploading(false);
    }
  };

  const onFilesChosen = (e) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = ""; // allow re-selecting the same file
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const deleteImage = async (attachmentId) => {
    setDeletingId(attachmentId);
    try {
      await axios.delete(`/api/workorders/${id}/attachments/${attachmentId}`);
      setImages((prev) => prev.filter((img) => img.id !== attachmentId));
    } catch (e) {
      console.error("Error deleting image:", e);
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
          Pre-Work Images
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          Photos of the site or equipment before work begins.
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
              Drop images here or click to upload
            </Typography>
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.5 }}
            >
              JP, PNG, HEIC — multiple allowed
            </Typography>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onFilesChosen}
        />
      </Box>

      {/* Image grid */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : images.length === 0 ? (
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "text.disabled",
            textAlign: "center",
            py: 3,
          }}
        >
          No pre-work images uploaded yet.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 1.5,
          }}
        >
          {images.map((img) => (
            <Box
              key={img.id}
              sx={{
                position: "relative",
                borderRadius: 1.5,
                overflow: "hidden",
                border: `1px solid ${theme.palette.divider}`,
                aspectRatio: "1",
                backgroundColor: alpha(theme.palette.text.primary, 0.03),
                "&:hover .overlay": { opacity: 1 },
              }}
            >
              <Box
                component="img"
                src={img.blob_url}
                alt={img.file_name}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {/* Hover overlay with actions */}
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
                    "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 40%)",
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
                  sx={{
                    color: "#fff",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 15 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => deleteImage(img.id)}
                  disabled={deletingId === img.id}
                  sx={{
                    color: "#fff",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    "&:hover": { backgroundColor: "rgba(211,47,47,0.7)" },
                  }}
                >
                  {deletingId === img.id ? (
                    <CircularProgress size={14} sx={{ color: "#fff" }} />
                  ) : (
                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                  )}
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
