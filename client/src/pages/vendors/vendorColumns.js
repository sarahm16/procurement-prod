import Chip from "@mui/material/Chip";

export const generateVendorColumns = () => {
  return [
    {
      field: "company",
      headerName: "Company",
      flex: 1.5,
      minWidth: 180,
    },
    {
      field: "contact_name",
      headerName: "Contact",
      flex: 1,
      minWidth: 140,
    },
    {
      field: "contact_phone",
      headerName: "Phone",
      flex: 1,
      minWidth: 130,
    },
    {
      field: "location",
      headerName: "Location",
      flex: 1.2,
      minWidth: 160,
      valueGetter: (value, row) => {
        const city = row.mailing_city?.trim();
        const state = row.mailing_state?.trim();
        if (city && state) return `${city}, ${state}`;
        return city || state || "—";
      },
    },
    {
      field: "VendorStatuses",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const status = params.row.VendorStatuses;
        if (!status) return "—";
        return (
          <Chip
            label={status.name}
            size="small"
            sx={{
              backgroundColor: status.color + "22", // hex color at ~13% opacity for background
              color: status.color,
              borderColor: status.color + "55",
              border: "1px solid",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
              height: 22,
            }}
          />
        );
      },
    },
  ];
};
