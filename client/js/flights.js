import { apiRequest, isAdmin, logout, requireLogin, showToast } from "./api.js";

const currentPassengerId = requireLogin();
const currentPassengerNode = document.getElementById("current-passenger");
const admin = isAdmin();

if (currentPassengerNode) {
  currentPassengerNode.innerHTML = admin
    ? '管理员 <span class="badge badge-business" style="margin-left:6px">Admin</span>'
    : `旅客 #${currentPassengerId}`;
}
const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) logoutBtn.addEventListener("click", logout);

const form = document.getElementById("search-form");

function bindCityAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  let lastQuery = "";

  input.addEventListener("input", async () => {
    const keyword = input.value.trim();
    if (keyword.length < 1) { list.innerHTML = ""; return; }
    if (keyword === lastQuery) return;
    lastQuery = keyword;

    try {
      const cities = await apiRequest(`/api/v1/tickets/cities?keyword=${encodeURIComponent(keyword)}&limit=12`);
      if (keyword !== input.value.trim()) return;
      list.innerHTML = cities.map((c) => `<option value="${c}"></option>`).join("");
    } catch (_) { list.innerHTML = ""; }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const dep = document.getElementById("dep").value.trim();
  const arr = document.getElementById("arr").value.trim();

  if (!dep || !arr) {
    showToast("请填写出发城市和到达城市", "error");
    return;
  }

  const params = new URLSearchParams({ departure_city: dep, arrival_city: arr });
  window.location.href = `./ticket-select.html?${params.toString()}`;
});

bindCityAutocomplete("dep", "dep-city-list");
bindCityAutocomplete("arr", "arr-city-list");
