// Libraries
import { useEffect, useState, useMemo } from "react";
import axios from "axios";

import MasterDetailManager from "../components/MasterDetailManager";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";
import VisibilityOutlineIcon from "@mui/icons-material/VisibilityOutlined";
import Tooltip from "@mui/material/Tooltip";

function ClientScopesAdmin() {
  const [loading, setLoading] = useState(true);
  const [scopes, setScopes] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scopesRes, clientsRes] = await Promise.all([
          axios.get("/api/clients/scopes"),
          axios.get("/api/clients"),
        ]);
        setScopes(scopesRes.data);
        setClients(clientsRes.data);
      } catch (e) {
        console.error("Error loading client scopes:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const countForClient = (client) =>
    scopes.filter((scope) => scope.client_id === client.id).length;

  // Upsert a scope into local state (replace if exists for this client+line, else add)
  const upsertScope = (saved) => {
    setScopes((prev) => {
      const idx = prev.findIndex(
        (s) =>
          s.client_id === saved.client_id &&
          s.service_line_id === saved.service_line_id,
      );
      if (idx === -1) return [...prev, saved];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  const renderClientDetail = (client) => (
    <ScopesTable
      client={client}
      scopes={scopes.filter((s) => s.client_id === client.id)}
      onScopeSaved={upsertScope}
    />
  );

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.1rem",
          mb: 1.5,
        }}
      >
        Client Scope of Work
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MasterDetailManager
          items={clients}
          loading={loading}
          title="Clients"
          getItemLabel={(c) => c.client}
          getItemCount={countForClient}
          renderDetail={renderClientDetail}
          emptyMessage="Select a client to manage its scopes of work."
        />
      </Box>
    </Box>
  );
}

// Detail panel — one row per service line, each showing/editing its SOW id.
function ScopesTable({ client, scopes, onScopeSaved }) {
  const serviceLines = client?.service_lines ?? [];

  // which service line row is currently in edit mode
  const [editingLineId, setEditingLineId] = useState(null);
  const [draftId, setDraftId] = useState("");
  const [savingLineId, setSavingLineId] = useState(null);

  // Look up the existing scope for a given service line (undefined if none)
  const scopeForLine = (serviceLineId) =>
    scopes.find((s) => s.service_line_id === serviceLineId);

  const startEdit = (line) => {
    const existing = scopeForLine(line.id);
    setEditingLineId(line.id);
    setDraftId(existing?.pandadoc_content_library_uuid ?? "");
  };

  const cancelEdit = () => {
    setEditingLineId(null);
    setDraftId("");
  };

  const saveEdit = async (line) => {
    const value = draftId.trim();
    if (!value) return;
    setSavingLineId(line.id);
    try {
      // POST upserts the scope for this client + service line
      const { data } = await axios.post(`/api/clients/${client.id}/scopes`, {
        client_id: client.id,
        service_line_id: line.id,
        pandadoc_content_library_uuid: value,
      });
      onScopeSaved(data);
      cancelEdit();
    } catch (e) {
      console.error("Error saving scope:", e);
    } finally {
      setSavingLineId(null);
    }
  };

  return (
    <Box
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
          {client.client}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          Scopes of work per service line
        </Typography>
      </Box>

      {/* One row per service line */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {serviceLines.length === 0 ? (
          <Typography
            sx={{ p: 2, fontSize: "0.82rem", color: "text.disabled" }}
          >
            This client has no service lines.
          </Typography>
        ) : (
          serviceLines.map((line) => {
            const scope = scopeForLine(line.id);
            const isEditing = editingLineId === line.id;
            const isSaving = savingLineId === line.id;

            return (
              <Box
                key={line.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  px: 2,
                  py: 1,
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography
                  sx={{ fontSize: "0.85rem", fontWeight: 600, flexShrink: 0 }}
                >
                  {line.name}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  {isEditing ? (
                    <>
                      <TextField
                        size="small"
                        value={draftId}
                        onChange={(e) => setDraftId(e.target.value)}
                        placeholder="PandaDoc content library ID"
                        disabled={isSaving}
                        sx={{ minWidth: 260 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(line);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                      />
                      <IconButton
                        size="small"
                        onClick={() => saveEdit(line)}
                        disabled={!draftId.trim() || isSaving}
                        sx={{ color: "success.main" }}
                      >
                        {isSaving ? (
                          <CircularProgress size={16} />
                        ) : (
                          <CheckIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={cancelEdit}
                        disabled={isSaving}
                      >
                        <CloseIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          color: scope ? "text.secondary" : "text.disabled",
                          fontStyle: scope ? "normal" : "italic",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 320,
                        }}
                      >
                        {scope?.pandadoc_content_library_uuid ??
                          "No SOW assigned"}
                      </Typography>
                      {scope?.pandadoc_content_library_uuid && (
                        <Tooltip title="View in PandaDoc">
                          <IconButton
                            size="small"
                            onClick={() =>
                              window.open(
                                `https://app.pandadoc.com/a/#/library/${scope?.pandadoc_content_library_uuid}`,
                                "_blank",
                                "noreferrer",
                              )
                            }
                          >
                            <VisibilityOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => startEdit(line)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

export default ClientScopesAdmin;
