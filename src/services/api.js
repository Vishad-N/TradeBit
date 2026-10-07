// Central API client. The backend URL comes from VITE_API_URL (never hard-coded elsewhere).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

const TOKEN_KEY = 'tb_token';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const FRIENDLY = {
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  413: 'That file is too large.',
  429: 'Too many requests. Please wait a moment and try again.',
};

async function toError(res) {
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  const raw = body?.message;
  const message = (Array.isArray(raw) ? raw[0] : raw) || FRIENDLY[res.status] ||
    (res.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.');
  return new ApiError(res.status, body?.code, typeof message === 'string' ? message : 'Request failed.');
}

async function request(path, { method = 'GET', body, form, headers = {}, raw = false, keepalive = false } = {}) {
  const h = { ...headers };
  const token = tokenStore.get();
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers: h, body: payload, keepalive });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Network error. Check your connection and try again.');
  }
  if (res.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event('tb:unauthorized'));
  }
  if (!res.ok) throw await toError(res);
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body, opts) => request(path, { method: 'PATCH', body, ...opts }),
  delete: (path, opts) => request(path, { method: 'DELETE', ...opts }),
  upload: (path, form) => request(path, { method: 'POST', form }),
  uploadPatch: (path, form) => request(path, { method: 'PATCH', form }),
  raw: (path, opts) => request(path, { raw: true, ...opts }),
};
