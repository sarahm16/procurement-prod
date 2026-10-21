// @sarlacc/portal
//
// What the vendor and client portals share: code sign-in, the session
// check, and the page frame. Each app passes in its own config (name,
// nav, help text, where its server routes are).
//
//   import { AuthProvider, SignInPage, PortalLayout, PageHeader } from "@sarlacc/portal";

// Signing in and staying signed in
export { createApi, errorMessage, SIGNED_OUT_EVENT } from "./auth/api.js";
export { AuthProvider } from "./auth/AuthProvider.jsx";
export { useAuth } from "./auth/useAuth.js";
export { default as RequireAuth } from "./auth/RequireAuth.jsx";

// The sign-in screens
export { default as SignInPage } from "./sign-in/SignInPage.jsx";
export { default as CodeInput } from "./sign-in/CodeInput.jsx";

// The page frame
export { default as PortalLayout } from "./layout/PortalLayout.jsx";
export { default as PageHeader } from "./layout/PageHeader.jsx";
export { default as HelpDialog } from "./layout/HelpDialog.jsx";
export { default as ComingSoon } from "./layout/ComingSoon.jsx";
