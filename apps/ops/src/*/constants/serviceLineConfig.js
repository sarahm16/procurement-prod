// constants/serviceLineConfig.js
import GrassIcon from "@mui/icons-material/Grass";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import ConstructionIcon from "@mui/icons-material/Construction";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import LocalCarWashIcon from "@mui/icons-material/LocalCarWash";
import HvacIcon from "@mui/icons-material/Hvac";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import BoltIcon from "@mui/icons-material/Bolt";
import HomeIcon from "@mui/icons-material/Home";
import LayersIcon from "@mui/icons-material/Layers";
import HandymanIcon from "@mui/icons-material/Handyman";

/**
 * Per-service-line color + icon, keyed by the service line NAME.
 * Colors chosen to be distinct and loosely evocative of each trade.
 */
export const serviceLineConfig = {
  Janitorial: { color: "#0EA5E9", icon: CleaningServicesIcon }, // sky blue — clean
  Landscaping: { color: "#22C55E", icon: GrassIcon }, // green — grass
  "Landscape Construction": { color: "#16A34A", icon: ConstructionIcon }, // deep green
  "Lot Sweeping": { color: "#F59E0B", icon: LocalCarWashIcon }, // amber
  Snow: { color: "#38BDF8", icon: AcUnitIcon }, // ice blue
  Asphalt: { color: "#64748B", icon: LayersIcon }, // slate — pavement
  "On Demand": { color: "#8B5CF6", icon: BoltIcon }, // purple — ad hoc
  HVAC: { color: "#F97316", icon: HvacIcon }, // orange — heat/air
  "Pressure Washing": { color: "#06B6D4", icon: WaterDropIcon }, // cyan — water
  Residential: { color: "#10B981", icon: HomeIcon }, // emerald — home
};

// fallback for any service line not in the map
export const defaultServiceLineConfig = {
  color: "#6B7280",
  icon: HandymanIcon,
};

export const getServiceLineConfig = (name) =>
  serviceLineConfig[name] ?? defaultServiceLineConfig;
