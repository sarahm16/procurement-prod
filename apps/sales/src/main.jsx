import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import App from "./App.jsx";
import "./App.css";

import { ThemeProvider } from "./theme/ThemeProvider.jsx";
import { msalInstance } from "./auth/msalConfig.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </ThemeProvider>
  </StrictMode>,
);
