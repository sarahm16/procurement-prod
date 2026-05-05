import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Autocomplete,
} from "@mui/material";

import { alpha } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

import { priorityConfig } from "../../*/constants/priorityConfig";

// ComposeNote.jsx
function ComposeNote({ employees, saving, onSubmit, onCancel, theme, isDark }) {
  const [draft, setDraft] = useState("");
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [priority, setPriority] = useState("Low");
  const textRef = useRef(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      onSubmit({ draft, taggedUsers, priority });
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <>
      <Box
        sx={{
          flexShrink: 0,
          borderTop: `1px solid ${theme.palette.divider}`,
          p: 1.5,
          backgroundColor: isDark
            ? alpha(theme.palette.primary.main, 0.04)
            : alpha(theme.palette.primary.main, 0.02),
        }}
      >
        {/* Tag employees */}
        <Autocomplete
          multiple
          size="small"
          options={employees}
          value={taggedUsers}
          onChange={(_, newValue) => setTaggedUsers(newValue)}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          disabled={saving}
          renderTags={(selected, getTagProps) =>
            selected.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                size="small"
                sx={{
                  fontFamily: '"Barlow", sans-serif',
                  fontSize: "0.68rem",
                  height: 20,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                  "& .MuiChip-deleteIcon": { fontSize: 13 },
                }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={taggedUsers.length === 0 ? "Tag employees…" : ""}
              size="small"
              variant="outlined"
              sx={{
                mb: 1,
                "& .MuiInputBase-root": {
                  fontFamily: '"Barlow", sans-serif',
                  fontSize: "0.82rem",
                  backgroundColor: "background.paper",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(theme.palette.secondary.main, 0.6),
                },
                "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "secondary.main",
                },
              }}
            />
          )}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontSize: "0.72rem",
              color: "text.disabled",
              flexShrink: 0,
            }}
          >
            Priority
          </Typography>
          <ToggleButtonGroup
            value={priority}
            exclusive
            onChange={(_, val) => val && setPriority(val)}
            size="small"
            disabled={saving}
            sx={{ height: 24 }}
          >
            {Object.keys(priorityConfig).map((key) => {
              const { label, color, bg } = priorityConfig[key];
              return (
                <ToggleButton
                  key={key}
                  value={key}
                  sx={{
                    fontFamily: '"Barlow", sans-serif',
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    px: 1.25,
                    textTransform: "none",
                    color: "text.disabled",
                    borderColor: alpha(theme.palette.secondary.main, 0.3),
                    "&.Mui-selected": {
                      color,
                      backgroundColor: alpha(color, 0.1),
                      borderColor: alpha(color, 0.4),
                      "&:hover": { backgroundColor: alpha(color, 0.15) },
                    },
                  }}
                >
                  {label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>
        <TextField
          inputRef={textRef}
          multiline
          minRows={3}
          maxRows={8}
          fullWidth
          placeholder="Write a note… (⌘↵ to save)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          size="small"
          variant="outlined"
          sx={{
            "& .MuiInputBase-root": {
              fontFamily: '"Barlow", sans-serif',
              fontSize: "0.82rem",
              backgroundColor: "background.paper",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(theme.palette.secondary.main, 0.3),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(theme.palette.secondary.main, 0.6),
            },
            "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "secondary.main",
            },
          }}
        />
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}
        >
          <IconButton
            size="small"
            onClick={onCancel}
            disabled={saving}
            sx={{ color: "text.disabled" }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
          <Tooltip title="Save (⌘↵)">
            <span>
              <IconButton
                size="small"
                onClick={onSubmit}
                disabled={!draft.trim() || saving}
                sx={{
                  color: draft.trim() ? "secondary.main" : "text.disabled",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  },
                }}
              >
                {saving ? (
                  <CircularProgress size={14} color="secondary" />
                ) : (
                  <SendIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </>
  );
}

export default ComposeNote;
