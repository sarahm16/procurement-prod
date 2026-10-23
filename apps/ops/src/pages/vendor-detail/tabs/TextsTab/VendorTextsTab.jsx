// vendor-detail/tabs/TextsTab/VendorTextsTab.jsx — the vendor's Text Request thread.
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";

import VendorTextMessages from "../../components/VendorTextMessages";
import { useVendorDetails } from "../../VendorDetailProvider";

export default function VendorTextsTab() {
  const { id } = useParams();
  const details = useVendorDetails();

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5, maxWidth: 960 }}>
      <VendorTextMessages vendorId={Number(id)} company={details.company} />
    </Box>
  );
}
