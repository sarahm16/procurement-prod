// src/api.js
//
// Every request to the server goes through this. Paths are relative to
// /api/portal, e.g. api.get("/work-orders").
//
// If any request comes back 401 (session expired, signed out elsewhere,
// login turned off), it tells the AuthProvider, which sends the person to
// the sign-in page.
import axios from "axios";

const api = axios.create({
  baseURL: "/api/portal",
  withCredentials: true, // send the sign-in cookie
});

export const SIGNED_OUT_EVENT = "portal:signed-out";

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? "";
    // /auth routes handle their own errors (a wrong code isn't "signed out").
    if (status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    }
    return Promise.reject(error);
  },
);

/** The server's { error } message, or a fallback. */
export const errorMessage = (
  e,
  fallback = "Something went wrong. Try again.",
) => e?.response?.data?.error ?? fallback;

export default api;
