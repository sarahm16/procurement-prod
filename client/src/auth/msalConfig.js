import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "43d25c71-5e59-4493-afa5-2b21e3c39f43",
    authority:
      "https://login.microsoftonline.com/cbd59f37-99b7-41ee-b4f2-7b4a4b63ed8e",
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
