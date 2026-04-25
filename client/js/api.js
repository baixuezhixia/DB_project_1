const BASE_URL = "http://127.0.0.1:8000";
const AUTH_KEY = "current_passenger_id";
const ADMIN_PASSENGER_ID = -1;
const ADMIN_USERNAME = "checker";

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

function cacheKey(url, options) {
  return `${options?.method || "GET"}::${url}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

function invalidateCache(prefix) {
  if (!prefix) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(prefix)) cache.delete(key);
  }
}

// Debounce utility
function debounce(fn, ms = 300) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

function setLog(message) {
  const node = document.getElementById("log");
  if (!node) return;
  const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  node.textContent = `[${now}] ${message}`;
}

function getCurrentPassengerId() {
  const raw = localStorage.getItem(AUTH_KEY);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || (parsed <= 0 && parsed !== ADMIN_PASSENGER_ID)) {
    return null;
  }
  return parsed;
}

function setCurrentPassengerId(passengerId) {
  localStorage.setItem(AUTH_KEY, String(passengerId));
}

function clearCurrentPassengerId() {
  localStorage.removeItem(AUTH_KEY);
}

function requireLogin() {
  const passengerId = getCurrentPassengerId();
  if (!passengerId) {
    window.location.href = "./login.html";
    throw new Error("login required");
  }
  return passengerId;
}

function isAdmin() {
  return getCurrentPassengerId() === ADMIN_PASSENGER_ID;
}

function logout() {
  clearCurrentPassengerId();
  window.location.href = "./login.html";
}

async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const passengerId = getCurrentPassengerId();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (passengerId) {
    headers["X-Passenger-Id"] = String(passengerId);
  }

  const useCache = options.method === undefined || options.method === "GET";
  const key = cacheKey(url, options);

  if (useCache) {
    const cached = getCached(key);
    if (cached) return cached;
  }

  const finalOptions = {
    headers,
    ...options,
  };
  if (finalOptions.body && typeof finalOptions.body !== "string") {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  const resp = await fetch(url, finalOptions);
  const text = await resp.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = text;
    }
  }

  if (!resp.ok) {
    if (resp.status === 401 && path !== "/api/v1/auth/login" && !window.location.pathname.endsWith("/login.html")) {
      clearCurrentPassengerId();
      window.location.href = "./login.html";
    }
    const detail = data && data.detail ? data.detail : `HTTP ${resp.status}`;
    throw new Error(detail);
  }

  if (useCache && data !== null) {
    setCache(key, data);
  }

  return data;
}

// Show/hide loading spinner on a button
function withLoading(btn, promise) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.classList.add("loading");
  btn.textContent = "";
  return promise
    .finally(() => {
      btn.disabled = false;
      btn.classList.remove("loading");
      btn.textContent = original;
    });
}

// Generic loading overlay for tables
function showTableLoading(tbody) {
  const colspan = tbody.querySelector("tr")?.children?.length || 6;
  tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:32px"><div class="spinner"></div></td></tr>`;
}

// Toast notification
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast";
  if (type === "error") el.classList.add("toast-error");
  if (type === "success") el.classList.add("toast-success");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(40px)";
    el.style.transition = "0.3s ease";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export {
  ADMIN_PASSENGER_ID,
  ADMIN_USERNAME,
  BASE_URL,
  apiRequest,
  cache,
  CACHE_TTL,
  clearCurrentPassengerId,
  debounce,
  getCurrentPassengerId,
  invalidateCache,
  isAdmin,
  logout,
  requireLogin,
  setCurrentPassengerId,
  setLog,
  showToast,
  withLoading,
  showTableLoading,
};
