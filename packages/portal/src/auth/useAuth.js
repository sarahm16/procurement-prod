import { useContext } from "react";
import { AuthContext } from "./authContext.js";

/** { status, user, requestCode, verifyCode, signOut } — see AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
