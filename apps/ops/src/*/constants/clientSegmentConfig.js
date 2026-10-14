// constants/clientSegmentConfig.js
//
// How each client segment looks: icon + colour, keyed by ClientSegments.name.
// A segment added to the table but not listed here falls back to a grey tag.
import AccountBalance from "@mui/icons-material/AccountBalance";
import Business from "@mui/icons-material/Business";
import Home from "@mui/icons-material/Home";
import LocalOffer from "@mui/icons-material/LocalOfferOutlined";

// Rename the label here if "Segment" becomes "Sector".
export const SEGMENT_LABEL = "Segment";

export const SEGMENTS = {
  Government: { icon: AccountBalance, color: "#6D28D9" }, // violet
  Commercial: { icon: Business, color: "#0E7490" }, // teal
  Residential: { icon: Home, color: "#C2410C" }, // burnt orange
};

const FALLBACK = { icon: LocalOffer, color: "#6B7280" };

export const getSegmentConfig = (name) => SEGMENTS[name] ?? FALLBACK;
