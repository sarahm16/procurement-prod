import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    // sessionStorage clears on tab close — use localStorage if you want persistence
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes requested at login — openid/profile give you the ID token claims
// User.Read lets you call Graph API if needed later
export const loginRequest = {
  scopes: ["User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);
