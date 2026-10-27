// Dashboard.jsx
//
// The signed-in person's page: what they need to do today. Company-wide
// numbers belong on a separate Reports page.
//
// For now: task counts and the task list (assigned to me / by me).
// Next: the work orders, sites and vendors they're responsible for.
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Snackbar, Typography, alpha, useTheme } from "@mui/material";

import GeneralPageLayout from "../../components/GeneralPageLayout";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import { useEmployees } from "../../*/hooks/useEmployees";
import { TASKS_CHANGED, TASK_COLORS } from "../../components/Tasks/taskUtils";
import MyTasksCard from "./MyTasksCard";

const FONT = '"Barlow", sans-serif';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function StatTile({ label, value, color, hint }) {
  const theme = useTheme();
  const active = value > 0;
  return (
    <Box
      sx={{
        flex: "1 1 150px",
        minWidth: 140,
        border: `1px solid ${active ? alpha(color, 0.35) : theme.palette.divider}`,
        borderLeft: `4px solid ${active ? color : theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: "background.paper",
        px: 2,
        py: 1.5,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: "2rem",
          fontWeight: 700,
          lineHeight: 1.15,
          color: active ? color : "text.disabled",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value ?? "–"}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: "0.7rem", color: "text.disabled" }}>{hint}</Typography>
    </Box>
  );
}

function Dashboard() {
  const { user } = useAuthenticatedUser();
  const { data: employees = [] } = useEmployees();
  const userId = user?.id;

  const [view, setView] = useState("assigned");
  const [status, setStatus] = useState("open");
  const [tasks, setTasks] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const get = (v, s) =>
      axios.get("/api/notes/tasks", { params: { user_id: userId, view: v, status: s } }).then((r) => r.data);
    try {
      // The list being shown, plus open counts for both tabs.
      const [current, assigned, created] = await Promise.all([
        get(view, status),
        view === "assigned" && status === "open" ? null : get("assigned", "open"),
        view === "created" && status === "open" ? null : get("created", "open"),
      ]);
      setTasks(current.tasks);
      setCounts({
        assigned: (assigned ?? current).counts,
        created: (created ?? current).counts,
      });
      setError("");
    } catch (e) {
      console.error("Error loading tasks:", e);
      setError("Couldn't load your tasks.");
    } finally {
      setLoading(false);
    }
  }, [userId, view, status]);

  useEffect(() => {
    setTasks(null);
    load();
  }, [load]);

  // Refresh after a change here or in a notes panel, and when coming back to the tab.
  useEffect(() => {
    const refresh = () => load();
    const onVisible = () => document.visibilityState === "visible" && load();
    window.addEventListener(TASKS_CHANGED, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(TASKS_CHANGED, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Tick a box: update the row in place now; the TASKS_CHANGED refresh
  // then moves it out of the Open list.
  const replace = (updated) => setTasks((prev) => prev?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));

  const mine = counts.assigned ?? {};
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <GeneralPageLayout>
      <Box sx={{ maxWidth: 1100, mx: "auto", pt: 3 }}>
        <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: "1.8rem" }}>
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "0.85rem", color: "text.secondary", mb: 2.5 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
          <StatTile label="Overdue" value={mine.overdue} color={TASK_COLORS.overdue} hint="Past their due date" />
          <StatTile label="Due today" value={mine.due_today} color={TASK_COLORS.today} hint="Assigned to you" />
          <StatTile label="Due this week" value={mine.due_this_week} color={TASK_COLORS.soon} hint="Next 7 days, including today" />
          <StatTile label="Done this week" value={mine.done_this_week} color={TASK_COLORS.done} hint="Last 7 days" />
        </Box>

        <MyTasksCard
          view={view}
          status={status}
          onViewChange={setView}
          onStatusChange={setStatus}
          tasks={tasks}
          counts={counts}
          loading={loading}
          error={error}
          userId={userId}
          employees={employees}
          onChange={replace}
          onError={setToast}
        />
      </Box>

      <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast("")}>
        <Alert severity="error" onClose={() => setToast("")} sx={{ fontSize: "0.8rem" }}>
          {toast}
        </Alert>
      </Snackbar>
    </GeneralPageLayout>
  );
}

export default Dashboard;
