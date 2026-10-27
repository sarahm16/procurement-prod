// Dashboard/MyTasksCard.jsx
//
// Tasks across every work order, vendor, site, client and contract:
// "Assigned to me" (what I need to do) and "Assigned by me" (what I'm
// waiting on). Open tasks are grouped Overdue / Today / This week / Later.
import { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  Link,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import { priorityConfig } from "../../*/constants/priorityConfig";
import { TaskCheckbox, TaskDueChip, TaskMenu } from "../../components/Tasks/TaskControls";
import { dueInfo, fmtStamp, todayLocal } from "../../components/Tasks/taskUtils";

const FONT = '"Barlow", sans-serif';
const GROUPS = ["Overdue", "Today", "This week", "Later", "No due date"];

const ENTITY_ICONS = {
  1: EngineeringOutlinedIcon,
  2: StorefrontOutlinedIcon,
  3: BusinessOutlinedIcon,
  4: AssignmentOutlinedIcon,
  5: DescriptionOutlinedIcon,
};

function TaskRow({ note, view, userId, employees, today, onChange, onError }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const task = note.task;
  const done = Boolean(task.completed_at);
  const Icon = ENTITY_ICONS[note.entity_type_id] ?? DescriptionOutlinedIcon;
  const pr = !done && note.priority !== "Low" ? priorityConfig[note.priority] : null;
  const who =
    view === "assigned"
      ? note.author_id === userId
        ? "Note to self"
        : `From ${note.author_name}`
      : task.assignee_id === userId
        ? "To you"
        : `To ${task.assignee_name}`;

  const go = () => note.entity?.path && navigate(note.entity.path);

  return (
    <Box
      onClick={go}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        px: 1.5,
        py: 1.1,
        cursor: note.entity?.path ? "pointer" : "default",
        borderTop: `1px solid ${theme.palette.divider}`,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box sx={{ pt: 0.1 }}>
        <TaskCheckbox note={note} userId={userId} onChange={onChange} onError={onError} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: "0.86rem",
            fontWeight: 500,
            color: done ? "text.disabled" : "text.primary",
            textDecoration: done ? "line-through" : "none",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {note.body}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mt: 0.4,
            flexWrap: "wrap",
            fontFamily: FONT,
            fontSize: "0.72rem",
            color: "text.secondary",
          }}
        >
          <Icon sx={{ fontSize: 14, color: "text.disabled" }} />
          {note.entity?.path ? (
            <Link
              component={RouterLink}
              to={note.entity.path}
              onClick={(e) => e.stopPropagation()}
              underline="hover"
              sx={{ fontWeight: 600, color: "text.primary" }}
            >
              {note.entity.label}
            </Link>
          ) : (
            <span>{note.entity?.label}</span>
          )}
          {note.entity?.sublabel && <span>· {note.entity.sublabel}</span>}
          <Box component="span" sx={{ color: "text.disabled" }}>
            · {who}
            {done && task.completed_by_name ? ` · done by ${task.completed_by_name}` : ""}
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, pt: 0.25 }}>
        {pr && (
          <Tooltip title={`${pr.label} priority`}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: pr.color }} />
          </Tooltip>
        )}
        <TaskDueChip task={task} today={today} />
        <TaskMenu note={note} userId={userId} employees={employees} onChange={onChange} onError={onError} />
      </Box>
    </Box>
  );
}

export default function MyTasksCard({
  view,
  status,
  onViewChange,
  onStatusChange,
  tasks,
  counts,
  loading,
  error,
  userId,
  employees,
  onChange,
  onError,
}) {
  const theme = useTheme();
  const today = todayLocal();

  const groups = useMemo(() => {
    if (!tasks) return [];
    if (status === "done") return [["Done", tasks]];
    const map = new Map(GROUPS.map((g) => [g, []]));
    for (const t of tasks) map.get(dueInfo(t.task, today).group)?.push(t);
    return [...map].filter(([, list]) => list.length);
  }, [tasks, status, today]);

  const tabLabel = (text, n) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      {text}
      {n > 0 && (
        <Box
          component="span"
          sx={{
            fontSize: "0.62rem",
            fontWeight: 700,
            px: 0.7,
            borderRadius: "99px",
            bgcolor: alpha(theme.palette.secondary.main, 0.12),
            color: "secondary.main",
          }}
        >
          {n}
        </Box>
      )}
    </Box>
  );

  const emptyText =
    status === "done"
      ? "Nothing completed yet."
      : view === "assigned"
        ? "You're all caught up. Tasks people assign you from any notes panel show up here."
        : "You haven't assigned any open tasks. Add one from the notes panel on any record.";

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          px: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TaskAltIcon sx={{ fontSize: 18, color: "secondary.main" }} />
          <Tabs
            value={view}
            onChange={(_, v) => onViewChange(v)}
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                minHeight: 44,
                fontFamily: FONT,
                fontSize: "0.8rem",
                textTransform: "none",
                fontWeight: 600,
                px: 1.25,
              },
            }}
          >
            <Tab value="assigned" label={tabLabel("Assigned to me", counts.assigned?.open)} />
            <Tab value="created" label={tabLabel("Assigned by me", counts.created?.open)} />
          </Tabs>
        </Box>
        <ToggleButtonGroup
          value={status}
          exclusive
          size="small"
          onChange={(_, v) => v && onStatusChange(v)}
          sx={{
            height: 26,
            "& .MuiToggleButton-root": {
              fontFamily: FONT,
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "none",
              px: 1.25,
            },
          }}
        >
          <ToggleButton value="open">Open</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1.5, fontSize: "0.8rem" }}>
          {error}
        </Alert>
      )}

      {loading && !tasks ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={22} color="secondary" />
        </Box>
      ) : tasks && tasks.length === 0 ? (
        <Box sx={{ py: 5, px: 3, textAlign: "center" }}>
          <TaskAltIcon sx={{ fontSize: 30, color: "text.disabled" }} />
          <Typography sx={{ fontFamily: FONT, fontSize: "0.82rem", color: "text.secondary", mt: 1 }}>
            {emptyText}
          </Typography>
        </Box>
      ) : (
        groups.map(([group, list]) => (
          <Box key={group}>
            <Box
              sx={{
                px: 1.5,
                py: 0.6,
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: alpha(theme.palette.text.primary, 0.025),
                borderTop: `1px solid ${theme.palette.divider}`,
                "&:first-of-type": { borderTop: 0 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: group === "Overdue" ? "error.main" : "text.secondary",
                }}
              >
                {group}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: "0.66rem", color: "text.disabled" }}>
                {list.length}
                {group === "Done" && list.length >= 100 ? " most recent" : ""}
              </Typography>
            </Box>
            {list.map((t) => (
              <TaskRow
                key={t.id}
                note={t}
                view={view}
                userId={userId}
                employees={employees}
                today={today}
                onChange={onChange}
                onError={onError}
              />
            ))}
          </Box>
        ))
      )}

      {status === "done" && counts[view]?.done_this_week > 0 && (
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: "0.7rem",
            color: "text.disabled",
            px: 1.5,
            py: 1,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          {counts[view].done_this_week} done in the last 7 days · as of {fmtStamp(new Date())}
        </Typography>
      )}
    </Box>
  );
}
