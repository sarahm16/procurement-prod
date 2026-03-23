import { createTheme } from "@mui/material/styles";

const baseTypography = {
  fontFamily: '"Barlow", "Helvetica Neue", sans-serif',
  h1: {
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  h3: {
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 600,
  },
  h4: {
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 600,
  },
  h5: {
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 600,
  },
  h6: {
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 600,
  },
  button: {
    fontFamily: '"Barlow", sans-serif',
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontSize: "0.75rem",
  },
  overline: {
    fontFamily: '"Barlow", sans-serif',
    fontWeight: 600,
    letterSpacing: "0.1em",
  },
};

const baseComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        padding: "8px 20px",
      },
      contained: {
        boxShadow: "none",
        "&:hover": {
          boxShadow: "none",
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        boxShadow: "none",
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: "none",
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        margin: "2px 8px",
        width: "calc(100% - 16px)",
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        fontWeight: 600,
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      },
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1B3A5C", // deep navy
      light: "#2E5F8A",
      dark: "#0F2238",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#E07B39", // warm amber-orange
      light: "#F0A060",
      dark: "#B85E20",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F4F5F7",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A2332",
      secondary: "#5A6A7E",
    },
    divider: "#E2E6EC",
    error: { main: "#D64045" },
    warning: { main: "#E07B39" },
    success: { main: "#2E8B57" },
    info: { main: "#2E5F8A" },
  },
  typography: baseTypography,
  shape: { borderRadius: 8 },
  components: {
    ...baseComponents,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E2E6EC",
          boxShadow: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1B3A5C",
          borderRight: "none",
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4A8FBF", // lighter navy for dark bg
      light: "#6AAFD8",
      dark: "#2E6A94",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#E07B39", // same amber-orange
      light: "#F0A060",
      dark: "#B85E20",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#0F1923", // deep dark blue-black
      paper: "#172130", // slightly lighter card bg
    },
    text: {
      primary: "#E8EDF3",
      secondary: "#8A9BB0",
    },
    divider: "#243447",
    error: { main: "#E05555" },
    warning: { main: "#E07B39" },
    success: { main: "#3AA870" },
    info: { main: "#4A8FBF" },
  },
  typography: baseTypography,
  shape: { borderRadius: 8 },
  components: {
    ...baseComponents,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#172130",
          borderBottom: "1px solid #243447",
          boxShadow: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0C1520",
          borderRight: "1px solid #243447",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          border: "1px solid #243447",
        },
      },
    },
  },
});
