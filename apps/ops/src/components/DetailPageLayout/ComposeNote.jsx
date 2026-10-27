// ComposeNote.jsx
//
// Write a note. Tick "Make it a task" to assign it to someone with an
// optional due date; tagging still works either way (tagged people are
// emailed, the assignee gets the task email).
import { useEffect, useMemo, useRef, useState } from "react";
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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

import { priorityConfig } from "../../*/constants/priorityConfig";
import { QuickDates } from "../Tasks/TaskControls";
import { todayLocal } from "../Tasks/taskUtils";
import { employeeOptionProps } from "../Tasks/employeeOptions";

const FONT = '"Barlow", sans-serif';

function ComposeNote({ employees, saving, error, onSubmit, onCancel, theme, isDark, currentUserId }) {
  const [draft, setDraft] = useState("");
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [priority, setPriority] = useState("Low");
  const [isTask, setIsTask] = useState(false);
  const [assignee, setAssignee] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const textRef = useRef(null);

  const today = todayLocal();
  const people = useMemo(() => employees.filter((e) => !e.terminated), [employees]);
  const pickerProps = useMemo(() => employeeOptionProps(people, currentUserId), [people, currentUserId]);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const dueInPast = Boolean(dueDate) && dueDate < today;
  const canSave = Boolean(draft.trim()) && !saving && (!isTask || (assignee && !dueInPast));

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      draft,
      taggedUsers,
      priority,
      task: isTask ? { assignee_id: assignee.id, due_date: dueDate || null } : null,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
    if (e.key === "Escape") onCancel();
  };

  const fieldSx = {
    "& .MuiInputBase-root": {
      fontFamily: FONT,
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
  };

  const label = (text) => (
    <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.disabled", flexShrink: 0, width: 52 }}>
      {text}
    </Typography>
  );

  return (
    <Box
      sx={{
        flexShrink: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
        p: 1.5,
        backgroundColor: isDark
          ? alpha(theme.palette.primary.main, 0.04)
          : alpha(theme.palette.primary.main, 0.02),
        maxHeight: "70%",
        overflowY: "auto",
      }}
    >
      {/* Note or task */}
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={isTask}
            onChange={(e) => setIsTask(e.target.checked)}
            disabled={saving}
            icon={<TaskAltIcon sx={{ fontSize: 18 }} />}
            checkedIcon={<TaskAltIcon sx={{ fontSize: 18 }} />}
            sx={{ p: 0.5, "&.Mui-checked": { color: "secondary.main" } }}
          />
        }
        label={
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: isTask ? "secondary.main" : "text.secondary",
            }}
          >
            Make it a task
          </Typography>
        }
        sx={{ ml: -0.5, mb: 0.75 }}
      />

      {isTask && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
            bgcolor: alpha(theme.palette.secondary.main, 0.03),
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            {label("Assign to")}
            <Autocomplete
              size="small"
              fullWidth
              options={people}
              value={assignee}
              onChange={(_, v) => setAssignee(v)}
              {...pickerProps}
              disabled={saving}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Who's doing it?"
                  sx={fieldSx}
                  inputProps={{ ...params.inputProps, "aria-label": "Assign to" }}
                />
              )}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ pt: 0.9 }}>{label("Due")}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={saving}
                error={dueInPast}
                helperText={dueInPast ? "That date has passed" : null}
                inputProps={{ min: today, "aria-label": "Due date" }}
                sx={fieldSx}
              />
              <QuickDates value={dueDate} onPick={setDueDate} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Tag employees */}
      <Autocomplete
        multiple
        size="small"
        options={people}
        value={taggedUsers}
        onChange={(_, newValue) => setTaggedUsers(newValue)}
        {...pickerProps}
        disabled={saving}
        renderTags={(selected, getTagProps) =>
          selected.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={pickerProps.getOptionLabel(option)}
              title={option.email ?? ""}
              size="small"
              sx={{
                fontFamily: FONT,
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
            placeholder={taggedUsers.length === 0 ? (isTask ? "Also notify…" : "Tag employees…") : ""}
            size="small"
            variant="outlined"
            sx={{ mb: 1, ...fieldSx }}
          />
        )}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.disabled", flexShrink: 0 }}>
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
            const { label: text, color } = priorityConfig[key];
            return (
              <ToggleButton
                key={key}
                value={key}
                sx={{
                  fontFamily: FONT,
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
                {text}
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
        placeholder={isTask ? "What needs to be done? (⌘↵ to save)" : "Write a note… (⌘↵ to save)"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        size="small"
        variant="outlined"
        inputProps={{ maxLength: 1000 }}
        sx={fieldSx}
      />

      {error && (
        <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "error.main", mt: 0.75 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        {isTask && !assignee && draft.trim() && (
          <Typography sx={{ fontFamily: FONT, fontSize: "0.68rem", color: "text.disabled", flex: 1 }}>
            Choose who it's for
          </Typography>
        )}
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <IconButton size="small" onClick={onCancel} disabled={saving} sx={{ color: "text.disabled" }} aria-label="Cancel">
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
          <Tooltip title={isTask ? "Assign task (⌘↵)" : "Save (⌘↵)"}>
            <span>
              <IconButton
                size="small"
                onClick={submit}
                disabled={!canSave}
                aria-label={isTask ? "Assign task" : "Save note"}
                sx={{
                  color: canSave ? "secondary.main" : "text.disabled",
                  "&:hover": { backgroundColor: alpha(theme.palette.secondary.main, 0.1) },
                }}
              >
                {saving ? <CircularProgress size={14} color="secondary" /> : <SendIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

export default ComposeNote;
