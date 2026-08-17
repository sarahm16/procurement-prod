import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import { workOrderTypes } from "../../*/constants/workorderTypes";

// Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";
import CreateWorkorderForm from "./CreateWorkorderForm";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";

// MUI
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";

const typeColor = (name) =>
  workOrderTypes.find((t) => t.name === name)?.color ?? "#6b7280";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

function Workorders() {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [workorders, setWorkorders] = useState([]);
  const [statuses, setStatuses] = useState([]); // from the DB
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [woRes, statusRes] = await Promise.all([
        axios.get("/api/workorders"),
        axios.get("/api/workorders/statuses"),
      ]);
      console.log("workorders", woRes.data);
      console.log("statuses", statusRes.data);
      setWorkorders(woRes.data);
      setStatuses(statusRes.data);
    } catch (error) {
      console.error("Error fetching work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Color lookup from the FETCHED statuses (each has name + color from the DB)
  const statusColorMap = useMemo(() => {
    const map = {};
    for (const s of statuses) map[s.name] = s.color;
    return map;
  }, [statuses]);

  const onCreated = (created) => {
    setWorkorders((prev) => [created, ...prev]);
    setFormOpen(false);
  };

  const statusOptions = useMemo(
    () =>
      [...new Set(workorders.map((w) => w.status?.name).filter(Boolean))].map(
        (s) => ({
          value: s,
          label: s,
        }),
      ),
    [workorders],
  );

  const typeOptions = useMemo(
    () =>
      [...new Set(workorders.map((w) => w.type).filter(Boolean))].map((t) => ({
        value: t,
        label: t,
      })),
    [workorders],
  );

  const filteredWorkorders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workorders.filter((w) => {
      if (q) {
        const hay = `${w.work_order_number ?? ""} ${w.Site?.store ?? ""} ${
          w.Site?.Client?.client ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && w.status?.name !== statusFilter)
        return false;
      if (typeFilter !== "all" && w.type !== typeFilter) return false;
      return true;
    });
  }, [workorders, search, statusFilter, typeFilter]);

  const columns = useMemo(
    () => [
      {
        field: "work_order_number",
        headerName: "WO #",
        flex: 0.9,
        minWidth: 120,
      },
      {
        field: "client",
        headerName: "Client",
        flex: 1.2,
        minWidth: 150,
        valueGetter: (value, row) => row.Site?.Client?.client ?? "—",
      },
      {
        field: "site",
        headerName: "Site",
        flex: 1,
        minWidth: 140,
        valueGetter: (value, row) => row.Site?.store ?? "—",
      },
      {
        field: "type",
        headerName: "Type",
        flex: 0.9,
        minWidth: 120,
        renderCell: (params) => {
          const t = params.row.type;
          if (!t) return "—";
          const c = typeColor(t);
          return (
            <Chip
              label={t}
              size="small"
              sx={{
                backgroundColor: c + "22",
                color: c,
                border: `1px solid ${c}55`,
                fontWeight: 600,
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 130,
        renderCell: (params) => {
          const name = params.row.Status?.name;
          if (!name) return "—";
          const c = statusColorMap[name] ?? "#6b7280";
          return (
            <Chip
              label={name}
              size="small"
              sx={{
                backgroundColor: c + "22",
                color: c,
                border: `1px solid ${c}55`,
                fontWeight: 600,
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          );
        },
      },
      {
        field: "start_date",
        headerName: "Start",
        flex: 0.8,
        minWidth: 110,
        valueGetter: (value, row) => fmtDate(row.start_date),
      },
      {
        field: "due_date",
        headerName: "Due",
        flex: 0.8,
        minWidth: 110,
        valueGetter: (value, row) => fmtDate(row.due_date),
      },
    ],
    [],
  );

  const onRowClick = (row) => navigate(`/workorders/${row.id}`);

  return (
    <>
      <SlideOutPanel
        title="Create New Work Order"
        open={formOpen}
        onClose={() => setFormOpen(false)}
      >
        <CreateWorkorderForm
          user={user}
          submitting={submitting}
          onClose={() => setFormOpen(false)}
          onCreated={onCreated}
        />
      </SlideOutPanel>

      <ListPageLayout
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search work orders…"
            filters={[
              {
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
              {
                label: "Type",
                value: typeFilter,
                onChange: setTypeFilter,
                options: typeOptions,
              },
            ]}
            actions={
              <>
                <Tooltip title="Refresh">
                  <span>
                    <IconButton
                      size="small"
                      onClick={fetchData}
                      disabled={loading}
                      sx={{ color: "text.secondary" }}
                    >
                      <RefreshIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
                  onClick={() => setFormOpen(true)}
                >
                  Create New
                </Button>
              </>
            }
          />
        }
      >
        <ListDataGrid
          rows={filteredWorkorders}
          columns={columns}
          onRowClick={onRowClick}
          loading={loading}
        />
      </ListPageLayout>
    </>
  );
}

export default Workorders;
