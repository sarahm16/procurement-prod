// portal/ — the pieces every code-sign-in portal shares (vendor, client).
// The copy in each app is identical; when this moves into @sarlacc/ui, the
// apps import from there instead and this folder goes away.
export { createApi, errorMessage, SIGNED_OUT_EVENT } from "./api";
export { AuthProvider } from "./AuthProvider";
export { useAuth } from "./useAuth";
export { default as RequireAuth } from "./RequireAuth";
export { default as SignInPage } from "./SignInPage";
export { default as PortalLayout } from "./PortalLayout";
export { default as CodeInput } from "./CodeInput";
