// workorder-details/tabs/DetailsTab/VendorOnboardingCard.jsx
import { useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  useTheme,
  alpha,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChecklistIcon from "@mui/icons-material/Checklist";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import {
  useWorkOrderDetails,
  useWorkOrderServices,
} from "../../WorkOrderDetailProvider";
import SectionCard from "../../../../components/SectionCard";

export default function VendorOnboardingCard({ onOpenDocuments }) {
  const theme = useTheme();

  const details = useWorkOrderDetails();
  const services = useWorkOrderServices();

  const vendor = details?.vendor ?? null;
  const compliance = vendor?.compliance ?? {};
  const msa = details?.msa ?? null;

  // Build the checklist from the various sources:
  // - Vendor Assigned      → vendor exists
  // - Vendor Price Set     → every service has a vendor price
  // - Work Order MSA Signed→ the work-order MSA is completed
  // - COI Verified         → compliance.COI (verified + unexpired)
  // - W9 Verified          → compliance.W9 (completed)
  const items = useMemo(() => {
    const vendorAssigned = !!vendor;

    const vendorPriceSet =
      !!services?.length && services.every((s) => s.vendor_price != null);

    const msaSigned = msa?.status === "completed";

    return [
      { key: "assigned", label: "Vendor Assigned", complete: vendorAssigned },
      { key: "priced", label: "Vendor Price Set", complete: vendorPriceSet },
      { key: "msa", label: "Work Order MSA Signed", complete: msaSigned },
      { key: "coi", label: "COI Verified", complete: !!compliance.COI },
      { key: "w9", label: "W9 Verified", complete: !!compliance.W9 },
    ];
  }, [vendor, services, msa, compliance.COI, compliance.W9]);

  const completed = items.filter((i) => i.complete).length;
  const total = items.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <SectionCard
      title="Vendor Onboarding"
      icon={<ChecklistIcon />}
      actions={
        onOpenDocuments &&
        vendor && (
          <Button
            size="small"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={onOpenDocuments}
            sx={{ fontSize: "0.75rem", py: 0.25 }}
          >
            Documents
          </Button>
        )
      }
    >
      {!vendor ? (
        <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
          Assign a vendor to begin onboarding.
        </Typography>
      ) : (
        <>
          {/* Progress */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.75,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Onboarding Progress
            </Typography>
            <Typography
              sx={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "primary.main",
              }}
            >
              {completed}/{total} complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            }}
          />

          {/* Checklist */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {items.map((item) => (
              <Box
                key={item.key}
                sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
              >
                {item.complete ? (
                  <CheckCircleIcon
                    sx={{ fontSize: 20, color: "success.main" }}
                  />
                ) : (
                  <RadioButtonUncheckedIcon
                    sx={{ fontSize: 20, color: "text.disabled" }}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: item.complete ? "text.primary" : "text.secondary",
                    fontWeight: item.complete ? 500 : 400,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </SectionCard>
  );
}
