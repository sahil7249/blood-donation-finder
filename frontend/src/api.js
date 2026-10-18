// Thin wrapper around fetch for the Django API (proxied through Vite in development).
const BASE = "/api";
const KEY = "lifelink_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

function errorText(data) {
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.entries(data).map(([k, v]) => `${k.replace(/_/g, " ")}: ${[].concat(v).join(" ")}`).join(" | ");
}

async function request(path, { method = "GET", body, params } = {}) {
  const query = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v)) : "";
  const res = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: { "Content-Type": "application/json", ...(getToken() && { Authorization: `Token ${getToken()}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
    }
    throw new Error(errorText(data));
  }
  return data;
}

export const api = {
  signup: (body) => request("/auth/signup/", { method: "POST", body }),
  login: (body) => request("/auth/login/", { method: "POST", body }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  me: () => request("/auth/me/"),
  stats: () => request("/stats/"),
  donors: (params) => request("/donors/", { params }),
  cities: () => request("/donors/cities/"),
  registerDonor: (body) => request("/donors/", { method: "POST", body }),
  contactDonor: (id) => request(`/donors/${id}/contact/`, { method: "POST" }),
  banks: (params) => request("/banks/", { params }),
  registerBank: (body) => request("/banks/", { method: "POST", body }),
  saveStock: (id, stock) => request(`/banks/${id}/inventory/`, { method: "PUT", body: { stock } }),
  requests: () => request("/requests/"),
  raiseRequest: (body) => request("/requests/", { method: "POST", body }),
  respondToRequest: (id) => request(`/requests/${id}/respond/`, { method: "POST" }),
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
