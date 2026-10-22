// workorder-detail/tabs/AccountingTab/AccountingTab.jsx
//
//   Side (reference)              Main (the work)
//   ─ Finance Status              ─ QuickBooks Pre-Check   client / site / vendors
//   ─ Billing Summary             ─ Client Invoice          (parent / standalone)
//   ─ External Service Portal     ─ Lien Release
//                                 ─ Vendor Bills            one per vendor
//
// The QuickBooks cards are laid out with the real client, site and vendor
// names, but their buttons are off until the QuickBooks code is wired in.
//
// Who sees what:
//   parent / standalone   everything; bills are one per child vendor
//   child                 its own vendor check and bill; the invoice is on
//                         the parent, so that card points there instead
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import DetailTabLayout from "../../../../components/DetailTabLayout";
import SectionCard, { subLabelSx } from "../../../../components/SectionCard";
import { useWorkOrderStatuses } from "../../../../*/hooks/useWorkOrderStatuses";
import QuickBooksLink from "../../../../components/QuickBooks/QuickBooksLink";
import {
  useLinkedWorkOrders,
  useWorkOrderActions,
  useWorkOrderDetails,
  useWorkOrderServices,
  useWorkOrderSite,
} from "../../WorkOrderDetailProvider";
import { fmtMoney, jobTotals, marginColor } from "../../finance";

const LATER = "Comes with the QuickBooks connection";

const SoonChip = () => (
  <Chip
    size="small"
    label="Coming soon"
    variant="outlined"
    sx={{ height: 20, fontSize: "0.66rem", fontWeight: 600, color: "text.secondary" }}
  />
);

const Row = ({ label, children }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 2,
      py: 0.6,
    }}
  >
    <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
      {label}
    </Typography>
    <Box
      sx={{
        fontSize: "0.85rem",
        fontWeight: 600,
        textAlign: "right",
        fontVariantNumeric: "tabular-nums",
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  </Box>
);

/** A disabled button that still explains itself on hover. */
const LaterButton = ({ children, variant = "outlined", startIcon }) => (
  <Tooltip title={LATER} arrow>
    <span>
      <Button size="small" variant={variant} disabled startIcon={startIcon}>
        {children}
      </Button>
    </span>
  </Tooltip>
);

/* ── Side ─────────────────────────────────────────────────────────────── */

/** Where it is in the finance workflow, as a vertical step list. */
function FinanceStatusCard({ phase, status, statuses, parent }) {
  const theme = useTheme();
  const steps = statuses.filter((s) => s.phase === "finance");
  const currentIndex = steps.findIndex((s) => s.name === status);

  return (
    <SectionCard
      title="Finance Status"
      icon={<AccountBalanceOutlinedIcon />}
      collapsible={false}
    >
      {phase !== "finance" ? (
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          {parent
            ? `This work order goes to finance with its parent, ${parent.work_order_number}, once the whole job is complete.`
            : 'Still in ops. Once it\'s Completed, use "Send to Finance" at the top of the page.'}
        </Typography>
      ) : (
        <>
          {parent && (
            <Alert severity="info" sx={{ mb: 1.5, py: 0 }}>
              Tracked on the parent,{" "}
              <Link component={RouterLink} to={`/workorders/${parent.id}`}>
                {parent.work_order_number}
              </Link>
              .
            </Alert>
          )}
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {steps.map((s, i) => {
              const done = currentIndex > -1 && i < currentIndex;
              const current = i === currentIndex;
              const c = s.color || theme.palette.primary.main;
              return (
                <Box
                  component="li"
                  key={s.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1,
                    py: 0.6,
                    borderRadius: 1,
                    bgcolor: current ? alpha(c, 0.1) : "transparent",
                  }}
                >
                  {done ? (
                    <CheckCircleIcon sx={{ fontSize: 16, color: c }} />
                  ) : current ? (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        m: "2px",
                        borderRadius: "50%",
                        bgcolor: c,
                        boxShadow: `0 0 0 3px ${alpha(c, 0.25)}`,
                      }}
                    />
                  ) : (
                    <RadioButtonUncheckedIcon
                      sx={{ fontSize: 16, color: "text.disabled" }}
                    />
                  )}
                  <Typography
                    sx={{
                      fontSize: "0.84rem",
                      fontWeight: current ? 700 : 500,
                      color: current ? c : done ? "text.primary" : "text.secondary",
                    }}
                  >
                    {s.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          {!parent && (
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 1 }}
            >
              Change it from the status at the top of the page.
            </Typography>
          )}
        </>
      )}
    </SectionCard>
  );
}

function BillingSummaryCard({ totals, isChild }) {
  return (
    <SectionCard title="Billing Summary" icon={<PaidOutlinedIcon />} collapsible={false}>
      {!isChild && <Row label="Client price">{fmtMoney(totals.client)}</Row>}
      <Row label="Vendor cost">{fmtMoney(totals.vendor)}</Row>
      {!isChild && (
        <Row label="Margin">
          <Box component="span" sx={{ color: marginColor(totals.margin), fontWeight: 700 }}>
            {totals.margin == null ? "—" : `${totals.margin.toFixed(1)}%`}
          </Box>
        </Row>
      )}
      {isChild && (
        <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.5 }}>
          The client price and margin are on the parent.
        </Typography>
      )}
    </SectionCard>
  );
}

function PortalCard({ software, externalId }) {
  return (
    <SectionCard
      title="External Service Portal"
      icon={<LanguageOutlinedIcon />}
      collapsible={false}
    >
      <Row label="Portal">{software || "—"}</Row>
      <Row label={software ? `${software} WO ID` : "External WO ID"}>
        {externalId || "—"}
      </Row>
    </SectionCard>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */

function PreCheckCard({ records }) {
  const ready = records.filter((r) => r.linked).length;
  return (
    <SectionCard
      title="QuickBooks Pre-Check"
      icon={<FactCheckOutlinedIcon />}
      badge={
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontWeight: 600 }}>
          {ready} of {records.length} linked
        </Typography>
      }
      disablePadding
    >
      {records.map((r, i) => (
        <Box
          key={`${r.kind}-${r.name}-${i}`}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1.1,
            borderTop: i ? 1 : 0,
            borderColor: "divider",
          }}
        >
          {r.linked ? (
            <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={subLabelSx}>{r.kind}</Typography>
            <Typography sx={{ fontSize: "0.86rem", fontWeight: 600 }} noWrap>
              {r.name || "—"}
            </Typography>
          </Box>
          {r.action ?? (
            <>
              <Typography sx={{ fontSize: "0.75rem", color: "text.disabled" }}>
                Coming soon
              </Typography>
              <LaterButton>Check</LaterButton>
            </>
          )}
        </Box>
      ))}
    </SectionCard>
  );
}

function InvoiceCard({ parent, client }) {
  return (
    <SectionCard
      title="Client Invoice"
      icon={<ReceiptLongOutlinedIcon />}
      badge={parent ? null : <SoonChip />}
    >
      {parent ? (
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          The client is invoiced once for the whole job, on the parent{" "}
          <Link component={RouterLink} to={`/workorders/${parent.id}`}>
            {parent.work_order_number}
          </Link>
          .
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <LaterButton variant="contained" startIcon={<ReceiptLongOutlinedIcon />}>
              Create Invoice
            </LaterButton>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
              Send {client ? `${client}'s` : "the client's"} invoice through QuickBooks
            </Typography>
          </Box>
          <LinkFallback label="QuickBooks invoice link" />
        </Box>
      )}
    </SectionCard>
  );
}

function LienReleaseCard() {
  return (
    <SectionCard title="Lien Release" icon={<GavelOutlinedIcon />} badge={<SoonChip />}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <LaterButton>Review &amp; Send Lien Release</LaterButton>
      </Box>
    </SectionCard>
  );
}

function BillsCard({ bills }) {
  return (
    <SectionCard
      title={bills.length > 1 ? "Vendor Bills" : "Vendor Bill"}
      icon={<RequestQuoteOutlinedIcon />}
      count={bills.length > 1 ? bills.length : null}
      badge={<SoonChip />}
      disablePadding
    >
      {bills.length === 0 ? (
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", p: 2 }}>
          No vendor on this work order.
        </Typography>
      ) : (
        bills.map((b, i) => (
          <Box
            key={b.key}
            sx={{
              px: 2,
              py: 1.5,
              borderTop: i ? 1 : 0,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.86rem", fontWeight: 600 }} noWrap>
                  {b.vendor}
                </Typography>
                {b.workOrder && (
                  <Typography sx={{ fontSize: "0.74rem", color: "text.secondary" }}>
                    {b.workOrder}
                  </Typography>
                )}
              </Box>
              <Typography
                sx={{ fontSize: "0.88rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {fmtMoney(b.amount)}
              </Typography>
              <LaterButton variant="contained">Verify &amp; Create Bill</LaterButton>
            </Box>
            <LinkFallback label="QuickBooks bill link" />
          </Box>
        ))
      )}
    </SectionCard>
  );
}

/** "Already did it in QuickBooks? Paste the link." — off for now. */
function LinkFallback({ label }) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <TextField
        size="small"
        fullWidth
        disabled
        placeholder={`Already created it? Paste the ${label} here`}
        sx={{ "& .MuiInputBase-input": { fontSize: "0.82rem" } }}
      />
      <LaterButton>Save</LaterButton>
    </Box>
  );
}

/* ── Tab ──────────────────────────────────────────────────────────────── */

export default function AccountingTab() {
  const details = useWorkOrderDetails();
  const site = useWorkOrderSite();
  const services = useWorkOrderServices();
  const linked = useLinkedWorkOrders();
  const { data: statuses = [] } = useWorkOrderStatuses();
  const { refresh } = useWorkOrderActions();

  const phase = details.phase ?? "ops";
  const totals = jobTotals({ services, linked });
  const parent = linked.isChild ? linked.parent : null;

  // One bill per vendor: a parent's come from its children, everyone else
  // bills their own vendor.
  const bills = linked.isParent
    ? linked.family
        .filter((c) => c.vendor)
        .map((c) => ({
          key: c.id,
          vendor: c.vendor,
          vendorId: c.vendor_id,
          vendorQbId: c.vendor_quickbooks_id,
          workOrder: c.work_order_number,
          amount: c.vendor_total,
        }))
    : details.vendor?.company
      ? [
          {
            key: "own",
            vendor: details.vendor.company,
            vendorId: details.vendor.id,
            vendorQbId: details.vendor.quickbooks_id,
            amount: totals.vendor,
          },
        ]
      : [];

  // The same vendor on two children is one QuickBooks vendor: check it once.
  const vendors = [
    ...new Map(bills.map((b) => [b.vendorId ?? b.vendor, b])).values(),
  ];

  /** A Pre-Check row with a working QuickBooks link. */
  const qbRow = (label, kind, recordId, name, quickbooksId) => ({
    kind: label,
    name,
    linked: Boolean(quickbooksId),
    action: (
      <QuickBooksLink
        dense
        kind={kind}
        recordId={recordId}
        name={name}
        quickbooksId={quickbooksId}
        onChange={refresh}
      />
    ),
  });

  const records = [
    // A child is invoiced on its parent, so only its vendor is checked here.
    ...(parent
      ? []
      : [
          qbRow(
            "Client",
            "clients",
            details.client_id,
            details.client,
            details.client_quickbooks_id,
          ),
          qbRow("Site", "sites", site?.id, site?.store, site?.quickbooks_id),
        ]),
    ...vendors.map((v) =>
      qbRow("Vendor", "vendors", v.vendorId, v.vendor, v.vendorQbId),
    ),
  ];

  return (
    <DetailTabLayout
      side={
        <>
          <FinanceStatusCard
            phase={phase}
            status={parent ? parent.status : details.status}
            statuses={statuses}
            parent={parent}
          />
          <BillingSummaryCard totals={totals} isChild={linked.isChild} />
          <PortalCard
            software={details.client_software}
            externalId={details.external_id}
          />
        </>
      }
      main={
        <>
          {phase !== "finance" && (
            <Alert severity="info" icon={<AccountBalanceOutlinedIcon />}>
              Accounting work starts once this job is sent to finance. Until
              then, this tab is a preview of what accounting will need.
            </Alert>
          )}
          <PreCheckCard records={records} />
          <InvoiceCard parent={parent} client={details.client} />
          <LienReleaseCard />
          <BillsCard bills={bills} />
        </>
      }
    />
  );
}
