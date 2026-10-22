import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import { workOrderTypes } from "../../*/constants/workorderTypes";
import { workOrderPriorityConfig } from "../../*/constants/workOrderPriorityConfig";
import { useWorkOrderStatuses } from "../../*/hooks/useWorkOrderStatuses";

import ListDataGrid, {
  TREE_GROUP_FIELD,
} from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";
import CreateWorkorderForm from "./CreateWorkorderForm";
import ClientSegmentChip from "../../components/ClientSegmentChip/ClientSegmentChip";

import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

/* ── Helpers ──────────────────────────────────────────────────────────── */

const ageInDays = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

const fmtAge = (iso) => {
  const days = ageInDays(iso);
  if (days == null) return "—";
  return days === 0 ? "Today" : `${days}d`;
};

const fmtMoney = (n) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

const typeColor = (name) =>
  workOrderTypes.find((t) => t.name === name)?.color ?? "#6b7280";

/** Sum a price field across a work order's service lines. */
const sumServices = (wo, field) =>
  (wo.Services ?? []).reduce((total, s) => total + (Number(s[field]) || 0), 0);

/**
 * Gross margin as a percentage of the client price, or null when it can't
 * be worked out honestly: no client price, or no vendor cost yet (a margin
 * of 100% on an unpriced job would look great and mean nothing).
 */
const marginPercent = (client, vendor) =>
  client > 0 && vendor != null ? ((client - vendor) / client) * 100 : null;

/** Margin colours: 50%+ good, 47–50% watch, under 47% a problem. */
const MARGIN_GOOD = 50;
const MARGIN_WATCH = 47;
const marginColor = (pct) =>
  pct == null
    ? "text.secondary"
    : pct >= MARGIN_GOOD
      ? "success.main"
      : pct >= MARGIN_WATCH
        ? "warning.main"
        : "error.main";

/**
 * Turns the flat list into tree rows, and rolls the money up.
 *
 * The rollup mirrors how the business actually works: the client price lives on
 * the parent (one invoice for the whole job), the vendor prices live on the
 * children (one per trade). So a parent's cost is the sum of its children's.
 *
 * A child whose parent isn't in the current result set — filtered out, or
 * simply not loaded — becomes a top-level row rather than hanging off a
 * placeholder group row that MUI would otherwise invent.
 */
function buildTreeRows(workorders) {
  const byId = new Map(workorders.map((w) => [w.id, w]));

  const childrenOf = new Map();
  for (const w of workorders) {
    if (w.parent_work_order_id && byId.has(w.parent_work_order_id)) {
      const list = childrenOf.get(w.parent_work_order_id) ?? [];
      list.push(w);
      childrenOf.set(w.parent_work_order_id, list);
    }
  }

  const key = (w) => String(w.work_order_number ?? w.id);

  return workorders.map((w) => {
    const parent = w.parent_work_order_id
      ? byId.get(w.parent_work_order_id)
      : null;
    const kids = childrenOf.get(w.id) ?? [];

    const ownClient = sumServices(w, "client_price");
    const ownVendor = sumServices(w, "vendor_price");

    // Parents show their own client price (or, if it's only on the children,
    // theirs added up) and their children's total cost.
    const clientTotal =
      (kids.length && !ownClient
        ? kids.reduce((t, k) => t + sumServices(k, "client_price"), 0)
        : ownClient) || null;
    const vendorTotal = kids.length
      ? kids.reduce((t, k) => t + sumServices(k, "vendor_price"), 0) || null
      : ownVendor || null;

    return {
      ...w,
      treePath: parent ? [key(parent), key(w)] : [key(w)],
      __isParent: kids.length > 0,
      __isChild: Boolean(parent),
      __childCount: kids.length,
      __childVendorCount: new Set(kids.map((k) => k.vendor_id).filter(Boolean))
        .size,
      __clientTotal: clientTotal,
      __vendorTotal: vendorTotal,
      // Children don't get a margin: the client price is on the parent, so a
      // child's own numbers would be meaningless. Parents use the rolled-up
      // totals; standalone work orders use their own.
      __margin: parent ? null : marginPercent(clientTotal, vendorTotal),
    };
  });
}

const getTreeDataPath = (row) => row.treePath;

/** Striping plus a hook for weighting parent rows. */
const getRowClassName = (params) => {
  const banding =
    params.indexRelativeToCurrentPage % 2 === 0 ? "row-even" : "row-odd";
  if (params.row.__isParent) return `${banding} wo-parent`;
  if (params.row.__isChild) return `${banding} wo-child`;
  return banding;
};

const gridInitialState = {
  // The chevrons have to travel with the identity columns, or they scroll away
  // from the rows they belong to.
  pinnedColumns: { left: [TREE_GROUP_FIELD, "client"] },
  sorting: { sortModel: [{ field: "due_date", sort: "asc" }] },
};

function Workorders() {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();
  const { data: statuses = [] } = useWorkOrderStatuses();

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [workorders, setWorkorders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/workorders");
      setWorkorders(data);
    } catch (error) {
      console.error("Error fetching work orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusColor = useCallback(
    (name) => statuses.find((s) => s.name === name)?.color ?? "#6b7280",
    [statuses],
  );

  const statusOptions = useMemo(
    () =>
      [...new Set(workorders.map((w) => w.Status?.name).filter(Boolean))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    [workorders],
  );

  const typeOptions = useMemo(
    () =>
      [...new Set(workorders.map((w) => w.type).filter(Boolean))]
        .sort()
        .map((t) => ({ value: t, label: t })),
    [workorders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workorders.filter((w) => {
      if (q) {
        const hay =
          `${w.work_order_number ?? ""} ${w.external_id ?? ""} ${w.Site?.store ?? ""} ` +
          `${w.Site?.Client?.client ?? ""} ${w.Vendor?.company ?? ""} ` +
          `${(w.project_managers ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && w.Status?.name !== statusFilter)
        return false;
      if (typeFilter !== "all" && w.type !== typeFilter) return false;
      return true;
    });
  }, [workorders, search, statusFilter, typeFilter]);

  const treeRows = useMemo(() => buildTreeRows(filtered), [filtered]);

  const columns = useMemo(
    () => [
      {
        field: "client",
        headerName: "Client",
        width: 150,
        valueGetter: (value, row) => row.Site?.Client?.client ?? "",
      },
      {
        field: "site",
        headerName: "Site",
        width: 160,
        valueGetter: (value, row) => row.Site?.store ?? "",
      },

      {
        field: "segment",
        headerName: "Segment",
        width: 140,
        valueGetter: (value) => value ?? "",
        renderCell: ({ value }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            {value ? <ClientSegmentChip segment={value} /> : "—"}
          </Box>
        ),
      },
      {
        field: "type",
        headerName: "Type",
        width: 120,
        renderCell: ({ row }) => {
          if (!row.type) return "—";
          const c = typeColor(row.type);
          return (
            <Chip
              label={row.type}
              size="small"
              sx={{
                backgroundColor: `${c}22`,
                color: c,
                border: `1px solid ${c}55`,
                height: 20,
                fontSize: "0.65rem",
              }}
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        valueGetter: (value, row) => row.Status?.name ?? "",
        renderCell: ({ row }) => {
          const name = row.Status?.name;
          if (!name) return "—";
          const c = statusColor(name);
          return (
            <Chip
              label={name}
              size="small"
              sx={{
                backgroundColor: `${c}22`,
                color: c,
                border: `1px solid ${c}55`,
                height: 20,
                fontSize: "0.65rem",
              }}
            />
          );
        },
      },
      {
        field: "vendor",
        headerName: "Vendor",
        width: 190,
        valueGetter: (value, row) => row.Vendor?.company ?? "",
        // A parent has no vendor by design — the work is split across its
        // children — so say that rather than showing an empty cell.
        renderCell: ({ row }) =>
          row.__isParent ? (
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: "text.secondary",
                fontStyle: "italic",
              }}
            >
              {row.__childVendorCount || row.__childCount} across{" "}
              {row.__childCount} work order
              {row.__childCount === 1 ? "" : "s"}
            </Typography>
          ) : (
            (row.Vendor?.company ?? "—")
          ),
      },
      {
        field: "project_managers",
        headerName: "Project Manager",
        width: 160,
        // Usually one; if a work order has more, they're listed together.
        valueGetter: (value) => (value ?? []).join(", "),
        renderCell: ({ value }) => value || "—",
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 100,
        renderCell: ({ row }) => {
          const cfg = workOrderPriorityConfig[row.priority];
          if (!cfg) return "—";
          return (
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                backgroundColor: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}55`,
                height: 20,
                fontSize: "0.65rem",
              }}
            />
          );
        },
      },
      {
        field: "__clientTotal",
        headerName: "Client $",
        width: 110,
        type: "number",
        valueFormatter: (value) => fmtMoney(value),
      },
      {
        field: "__vendorTotal",
        headerName: "Vendor $",
        width: 110,
        type: "number",
        valueFormatter: (value) => fmtMoney(value),
      },
      {
        field: "__margin",
        headerName: "Margin",
        description:
          "(Client $ − Vendor $) ÷ Client $. Green 50%+, yellow 47–50%, red under 47%. Parents use their children's totals; children have none.",
        width: 95,
        type: "number",
        renderCell: ({ value, row }) =>
          row.__isChild ? (
            ""
          ) : value == null ? (
            <Typography
              component="span"
              sx={{ fontSize: "inherit", color: "text.disabled" }}
            >
              —
            </Typography>
          ) : (
            <Typography
              component="span"
              sx={{
                fontSize: "inherit",
                fontWeight: 700,
                color: marginColor(value),
              }}
            >
              {value.toFixed(1)}%
            </Typography>
          ),
      },
      {
        field: "start_date",
        headerName: "Start",
        width: 110,
        valueGetter: (value, row) =>
          row.start_date ? new Date(row.start_date) : null,
        type: "date",
      },
      {
        field: "due_date",
        headerName: "Due",
        width: 110,
        valueGetter: (value, row) =>
          row.due_date ? new Date(row.due_date) : null,
        type: "date",
      },
      {
        field: "external_id",
        headerName: "External ID",
        width: 120,
        valueGetter: (value, row) => row.external_id ?? "",
      },
      {
        field: "age",
        headerName: "Age",
        width: 80,
        type: "number",
        valueGetter: (value, row) => ageInDays(row.created_at) ?? -1,
        renderCell: ({ row }) => fmtAge(row.created_at),
      },
    ],
    [statusColor],
  );

  /** The grouping column carries the WO number and the expand chevrons. */
  const groupingColDef = useMemo(
    () => ({
      headerName: "WO #",
      width: 190,
      valueFormatter: (value) => value,
    }),
    [],
  );

  const onRowClick = (row) => navigate(`/workorders/${row.id}`);

  const onSubmit = async (form, services, roleAssignments) => {
    setSubmitting(true);
    try {
      const payload = {
        parent_work_order_id: form.parent_work_order_id
          ? Number(form.parent_work_order_id)
          : null,
        site_id: Number(form.site_id),
        type: form.type,
        external_id: form.external_id || null,
        software_id: form.software_id ? Number(form.software_id) : null,
        priority: form.priority,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        user_id: user?.id,
        created_by_email: user?.email,
        scope_of_work: form.scope_of_work,
        services: services
          .filter((s) => s.service_id)
          .map((s) => ({
            service_id: Number(s.service_id),
            client_price: s.client_price === "" ? null : Number(s.client_price),
            vendor_price: s.vendor_price === "" ? null : Number(s.vendor_price),
          })),
        role_assignments: Object.entries(roleAssignments || {}).flatMap(
          ([roleId, empIds]) =>
            empIds.map((employee_id) => ({
              internal_role_id: Number(roleId),
              employee_id: Number(employee_id),
            })),
        ),
      };

      await axios.post("/api/workorders", payload);
      // Refetch rather than prepending: creating a child changes the parent too
      // (its vendor is cleared), so the local copy would be stale.
      await fetchData();
      setFormOpen(false);
    } catch (e) {
      console.error("Error creating work order:", e);
    } finally {
      setSubmitting(false);
    }
  };

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
          onSubmit={onSubmit}
          workOrders={workorders}
        />
      </SlideOutPanel>

      <ListPageLayout
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search WO #, site, client, vendor, PM…"
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
          rows={treeRows}
          columns={columns}
          loading={loading}
          onRowClick={onRowClick}
          noRowsMessage="No work orders match these filters"
          treeData
          getTreeDataPath={getTreeDataPath}
          groupingColDef={groupingColDef}
          defaultGroupingExpansionDepth={-1}
          getRowClassName={getRowClassName}
          initialState={gridInitialState}
          // Tree rows shouldn't paginate — a page break can separate a parent
          // from its children. Pro virtualizes, so the full list is fine.
          pagination={false}
          sx={{
            flex: 1,
            minHeight: 0,
            "& .MuiDataGrid-row.wo-parent": { fontWeight: 600 },
            "& .MuiDataGrid-row.wo-child .MuiDataGrid-cell": {
              fontSize: "0.78rem",
            },
          }}
        />
      </ListPageLayout>
    </>
  );
}

export default Workorders;
