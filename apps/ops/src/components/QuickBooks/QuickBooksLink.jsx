// components/QuickBooks/QuickBooksLink.jsx
//
// The QuickBooks link for a client, site or vendor: shows whether it's linked,
// and lets you find and link the matching QuickBooks record, change it, or
// unlink it.
//
//   <QuickBooksLink
//     kind="sites"                    // "clients" | "sites" | "vendors"
//     recordId={site.id}
//     name={site.store}               // what to search for first
//     quickbooksId={site.quickbooks_id}
//     onChange={(id) => …}            // after a link/unlink is saved
//     dense                           // compact, for a row in a list
//   />
//
// Searches run on our server (/api/quickbooks/:kind/search), which also says
// when a QuickBooks record is already linked to something else here. For a
// site, results under the client's QuickBooks customer come first.
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import QuickBooksIcon, { QB_GREEN } from "./QuickBooksIcon";

const QB_DARK = "#1d6e12";

/** Wording and links that differ by what's being linked. */
const KINDS = {
  clients: {
    noun: "client",
    qbNoun: "customer",
    subtitle: "Link the QuickBooks customer that this client's invoices go to.",
    unlinkEffect: "invoices can't be created for this client",
    url: (id) => `https://qbo.intuit.com/app/customerdetail?nameId=${id}`,
  },
  sites: {
    noun: "site",
    qbNoun: "customer",
    subtitle:
      "Link the QuickBooks customer for this site, usually a sub-customer under the client.",
    unlinkEffect: "invoices for this site can't be created",
    url: (id) => `https://qbo.intuit.com/app/customerdetail?nameId=${id}`,
  },
  vendors: {
    noun: "vendor",
    qbNoun: "vendor",
    subtitle: "Link the QuickBooks vendor that this vendor's bills go to.",
    unlinkEffect: "bills can't be created for this vendor",
    url: (id) => `https://qbo.intuit.com/app/vendordetail?nameId=${id}`,
  },
};

export const qbUrl = (kind, id) => KINDS[kind].url(encodeURIComponent(id));

const norm = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

const fmtMoney = (n) =>
  n == null
    ? null
    : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

const qbButtonSx = {
  textTransform: "none",
  fontWeight: 600,
  borderColor: QB_GREEN,
  color: QB_GREEN,
  "&:hover": { borderColor: "#237a15", bgcolor: alpha(QB_GREEN, 0.06) },
};

const SmallChip = ({ label, tone = "green" }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      height: 18,
      fontSize: "0.65rem",
      fontWeight: 700,
      flexShrink: 0,
      ...(tone === "green"
        ? { bgcolor: alpha(QB_GREEN, 0.12), color: QB_DARK }
        : { bgcolor: "action.hover", color: "text.secondary" }),
    }}
  />
);

/* ── Search dialog ────────────────────────────────────────────────────── */

function SearchDialog({
  open,
  onClose,
  kind,
  recordId,
  name,
  currentId,
  onLinked,
}) {
  const k = KINDS[kind];
  const { user } = useAuthenticatedUser();
  const [term, setTerm] = useState(name ?? "");
  const [searched, setSearched] = useState(null); // the term the results are for
  const [results, setResults] = useState([]);
  const [clientLinked, setClientLinked] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(null); // QuickBooks id being linked
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const search = async (q = term) => {
    const t = q.trim();
    if (!t) return;
    const mine = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/quickbooks/${kind}/search`, {
        params: { search: t, id: recordId },
      });
      if (mine !== reqId.current) return; // a newer search is on its way
      setResults(data.results ?? []);
      setClientLinked(data.client_linked);
      setSearched(t);
    } catch (e) {
      if (mine !== reqId.current) return;
      setResults([]);
      setSearched(t);
      setError(e.response?.data?.error ?? "Couldn't search QuickBooks.");
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  };

  // Search for the record's own name as soon as the dialog opens.
  useEffect(() => {
    if (!open) return;
    setTerm(name ?? "");
    setResults([]);
    setSearched(null);
    setError(null);
    if (name?.trim()) search(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name]);

  // Under the right client first (sites), then exact name matches.
  const sorted = useMemo(() => {
    const target = norm(name);
    return results
      .map((r) => ({
        ...r,
        exact: norm(r.name) === target || norm(r.company) === target,
      }))
      .sort(
        (a, b) =>
          Number(Boolean(b.under_client)) - Number(Boolean(a.under_client)) ||
          Number(b.exact) - Number(a.exact),
      );
  }, [results, name]);

  const link = async (r) => {
    setLinking(r.id);
    setError(null);
    try {
      await axios.put(`/api/quickbooks/${kind}/${recordId}`, {
        quickbooks_id: r.id,
        user_id: user?.id,
      });
      onLinked(r.id);
    } catch (e) {
      setError(e.response?.data?.error ?? "Couldn't link that record.");
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={linking ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1 }}
      >
        <QuickBooksIcon size={20} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.2 }}
          >
            Find {name || `this ${k.noun}`} in QuickBooks
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {k.subtitle}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
          sx={{ display: "flex", gap: 1, mb: 1.5 }}
        >
          <TextField
            size="small"
            fullWidth
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={`${k.qbNoun[0].toUpperCase()}${k.qbNoun.slice(1)} name or QuickBooks ID`}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="outlined"
            disabled={loading || !term.trim()}
            sx={{ ...qbButtonSx, flexShrink: 0 }}
          >
            Search
          </Button>
        </Box>

        {kind === "sites" && clientLinked === false && (
          <Alert severity="info" sx={{ mb: 1.5, py: 0 }}>
            This site's client isn't linked to QuickBooks yet. Link it first and
            the client's own sub-customers will be listed at the top.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ minHeight: 220, maxHeight: 380, overflowY: "auto" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={26} sx={{ color: QB_GREEN }} />
            </Box>
          ) : searched && !error && sorted.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                No QuickBooks {k.qbNoun}s match “{searched}”
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", mt: 0.5 }}>
                Try part of the name, or search by QuickBooks ID.
              </Typography>
            </Box>
          ) : (
            sorted.map((r) => {
              const isCurrent = currentId != null && String(currentId) === r.id;
              const elsewhere =
                r.linked_to && r.linked_to.id !== Number(recordId);
              const place = [r.city, r.state].filter(Boolean).join(", ");
              // A sub-customer's full name shows which customer it sits under.
              const parentPath =
                r.full_name && r.full_name !== r.name
                  ? r.full_name.split(":").slice(0, -1).join(" › ")
                  : null;
              return (
                <Box
                  key={r.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.75,
                    py: 1.25,
                    mb: 1,
                    border: 1,
                    borderRadius: 1.5,
                    borderColor: isCurrent ? QB_GREEN : "divider",
                    bgcolor: isCurrent ? alpha(QB_GREEN, 0.05) : "transparent",
                    opacity: elsewhere ? 0.6 : 1,
                    transition: "border-color .12s",
                    "&:hover":
                      elsewhere || isCurrent ? {} : { borderColor: QB_GREEN },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {parentPath && (
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          lineHeight: 1.2,
                        }}
                        noWrap
                      >
                        {parentPath} ›
                      </Typography>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{ fontWeight: 600, fontSize: "0.9rem" }}
                        noWrap
                      >
                        {r.name}
                      </Typography>
                      {r.under_client && !isCurrent && (
                        <SmallChip label="Under this client" />
                      )}
                      {r.exact && !isCurrent && (
                        <SmallChip label="Exact match" />
                      )}
                      {r.is_1099 && <SmallChip label="1099" tone="grey" />}
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                      noWrap
                    >
                      {[
                        r.company && norm(r.company) !== norm(r.name)
                          ? r.company
                          : null,
                        place || null,
                        r.email,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No address on file"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "text.disabled",
                        fontFamily: "monospace",
                      }}
                    >
                      ID {r.id}
                      {r.balance
                        ? ` · open balance ${fmtMoney(r.balance)}`
                        : ""}
                    </Typography>
                  </Box>

                  {isCurrent ? (
                    <Chip
                      icon={
                        <CheckCircleIcon sx={{ fontSize: "16px !important" }} />
                      }
                      label="Linked"
                      size="small"
                      sx={{
                        fontWeight: 600,
                        bgcolor: alpha(QB_GREEN, 0.12),
                        color: QB_DARK,
                        "& .MuiChip-icon": { color: QB_GREEN },
                      }}
                    />
                  ) : elsewhere ? (
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                        textAlign: "right",
                        maxWidth: 160,
                      }}
                    >
                      Linked to {r.linked_to.name}
                    </Typography>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      disableElevation
                      onClick={() => link(r)}
                      disabled={Boolean(linking)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        bgcolor: QB_GREEN,
                        flexShrink: 0,
                        "&:hover": { bgcolor: "#237a15" },
                      }}
                    >
                      {linking === r.id
                        ? "Linking…"
                        : currentId
                          ? "Switch to this"
                          : "Link"}
                    </Button>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Typography
          sx={{ fontSize: "0.72rem", color: "text.disabled", mr: "auto" }}
        >
          Not there? It needs to be created in QuickBooks first.
        </Typography>
        <Button onClick={onClose} color="inherit" disabled={Boolean(linking)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Unlink confirm ───────────────────────────────────────────────────── */

function UnlinkDialog({
  open,
  onClose,
  kind,
  recordId,
  name,
  quickbooksId,
  onUnlinked,
}) {
  const k = KINDS[kind];
  const { user } = useAuthenticatedUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const unlink = async () => {
    setSaving(true);
    setError(null);
    try {
      await axios.put(`/api/quickbooks/${kind}/${recordId}`, {
        quickbooks_id: null,
        user_id: user?.id,
      });
      onUnlinked();
    } catch (e) {
      setError(e.response?.data?.error ?? "Couldn't unlink it.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Unlink from QuickBooks?
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.88rem" }}>
          {name || `This ${k.noun}`} will no longer be linked to QuickBooks{" "}
          {k.qbNoun} {quickbooksId}. Nothing changes in QuickBooks itself, but{" "}
          {k.unlinkEffect} until it's linked again.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={unlink}
          disabled={saving}
        >
          {saving ? "Unlinking…" : "Unlink"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── The control ──────────────────────────────────────────────────────── */

export default function QuickBooksLink({
  kind,
  recordId,
  name,
  quickbooksId,
  onChange,
  dense = false,
}) {
  const k = KINDS[kind];
  const [dialog, setDialog] = useState(null); // "search" | "unlink" | null
  const linked = quickbooksId != null && quickbooksId !== "";

  if (!k) throw new Error(`QuickBooksLink: unknown kind "${kind}"`);

  const done = (id) => {
    setDialog(null);
    onChange?.(id);
  };

  const dialogs = (
    <>
      <SearchDialog
        open={dialog === "search"}
        onClose={() => setDialog(null)}
        kind={kind}
        recordId={recordId}
        name={name}
        currentId={linked ? quickbooksId : null}
        onLinked={done}
      />
      <UnlinkDialog
        open={dialog === "unlink"}
        onClose={() => setDialog(null)}
        kind={kind}
        recordId={recordId}
        name={name}
        quickbooksId={quickbooksId}
        onUnlinked={() => done(null)}
      />
    </>
  );

  if (!linked) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          flexWrap: "wrap",
        }}
      >
        {!dense && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              color: "warning.main",
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
              Not linked to QuickBooks
            </Typography>
          </Box>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<QuickBooksIcon />}
          onClick={() => setDialog("search")}
          disabled={!recordId}
          sx={qbButtonSx}
        >
          Search QuickBooks
        </Button>
        {dialogs}
      </Box>
    );
  }

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
    >
      {!dense && <QuickBooksIcon />}
      <Typography
        sx={{
          fontSize: "0.82rem",
          fontWeight: 600,
          mr: 0.5,
          ml: dense ? 0 : 0.5,
        }}
      >
        {k.qbNoun[0].toUpperCase() + k.qbNoun.slice(1)}{" "}
        <Box component="span" sx={{ fontFamily: "monospace" }}>
          #{quickbooksId}
        </Box>
      </Typography>
      <Tooltip title="Open in QuickBooks">
        <IconButton
          size="small"
          component={Link}
          href={qbUrl(kind, quickbooksId)}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: QB_GREEN }}
        >
          <OpenInNewIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
      <Button
        size="small"
        onClick={() => setDialog("search")}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          minWidth: 0,
          color: "text.secondary",
        }}
      >
        Change
      </Button>
      <Tooltip title="Unlink">
        <IconButton
          size="small"
          onClick={() => setDialog("unlink")}
          sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
        >
          <LinkOffIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
      {dialogs}
    </Box>
  );
}
