// src/pages/Equipment/EquipmentPage.jsx — placeholder.
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import { ComingSoon, PageHeader } from "@sarlacc/portal";

export default function EquipmentPage() {
  return (
    <>
      <PageHeader
        title="Equipment"
        subtitle="Equipment at your sites that we service."
      />
      <ComingSoon
        icon={HandymanOutlinedIcon}
        title="Your equipment will show here"
        text="Units by site, with their service history."
      />
    </>
  );
}
