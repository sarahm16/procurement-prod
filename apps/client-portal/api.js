// src/api.js — requests to this portal's server routes, e.g.
// api.get("/work-orders") → GET /api/client-portal/work-orders
import { createApi } from "@sarlacc/portal";
import { PORTAL } from "./config";

const api = createApi(PORTAL.apiBase);
export default api;
