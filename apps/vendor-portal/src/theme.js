// src/theme.js
//
// Same colours and font as the ops app. Field crews use this on phones in
// the sun, so text is a touch larger and buttons a touch taller than ops.
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#1e3a5f" },
    secondary: { main: "#E07B39" },
    background: { default: "#F5F7FA" },
  },
  typography: {
    fontFamily: '"Barlow", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { sizeLarge: { minHeight: 48, fontSize: "1rem" } },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
  },
});

export default theme;
