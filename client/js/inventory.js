import { apiRequest, isAdmin, logout, requireLogin, setLog, showToast, showTableLoading } from "./api.js";

const tbody = document.getElementById("inv-body");
const currentPassengerId = requireLogin();
const currentPassengerNode = document.getElementById("current-passenger");
const admin = isAdmin();

if (currentPassengerNode) {
  currentPassengerNode.innerHTML = admin
    ? '管理员 <span class="badge badge-business" style="margin-left:6px">Admin</span>'
    : `旅客 #${currentPassengerId}`;
}

// Hide admin-only sections for regular users
if (!admin) {
  const generateSection = document.getElementById("generate-section");
  const createSection = document.getElementById("create-section");
  const actionColHeader = document.getElementById("action-col-header");
  if (generateSection) generateSection.style.display = "none";
  if (createSection) createSection.style.display = "none";
  if (actionColHeader) actionColHeader.style.display = "none";
}

const logoutBtn = document.getElementById("btn-logout");
if (logoutBtn) logoutBtn.addEventListener("click", logout);

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refreshInventory() {
  showTableLoading(tbody);
  try {
    const rows = await apiRequest("/api/v1/tickets?limit=200&offset=0");
    const colspan = admin ? 6 : 5;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:32px;color:var(--ink-muted)">暂无数据</td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td><code>${r.ticket_id}</code></td>
        <td>${r.flight_id}</td>
        <td>${escapeHtml(r.flight_date)}</td>
        <td><span class="badge badge-economy">￥${r.economy_price}</span> 余${r.economy_remain}</td>
        <td><span class="badge badge-business">￥${r.business_price}</span> 余${r.business_remain}</td>
        ${admin ? `<td><button class="mini-btn" data-del="${r.ticket_id}">删除</button></td>` : ""}
      </tr>
    `,
      )
      .join("");

    if (admin) {
      tbody.querySelectorAll("button[data-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const ticketId = Number(btn.dataset.del);
          try {
            await apiRequest(`/api/v1/tickets/${ticketId}`, { method: "DELETE" });
            setLog(`删除成功: ticket_id=${ticketId}`);
            showToast(`删除成功: ticket #${ticketId}`, "success");
            refreshInventory();
          } catch (err) {
            setLog(`删除失败: ${err.message}`);
            showToast(`删除失败: ${err.message}`, "error");
          }
        });
      });
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${admin ? 6 : 5}" style="text-align:center;padding:32px;color:var(--ink-muted)">加载失败</td></tr>`;
    setLog(`加载库存失败: ${err.message}`);
    showToast("加载库存失败", "error");
  }
}

document.getElementById("btn-refresh").addEventListener("click", refreshInventory);

document.getElementById("generate-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  try {
    const data = await apiRequest("/api/v1/tickets/generate", {
      method: "POST",
      body: { start_date: startDate, end_date: endDate },
    });
    setLog(`自动生成机票完成，新增 ${data.added} 条机票`);
    showToast(`生成完成，新增 ${data.added} 条`, "success");
    refreshInventory();
  } catch (err) {
    setLog(`自动生成机票失败: ${err.message}`);
    showToast(`生成失败: ${err.message}`, "error");
  }
});

document.getElementById("create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    flight_id: Number(document.getElementById("c-flight-id").value),
    flight_date: document.getElementById("c-flight-date").value,
    business_price: Number(document.getElementById("c-b-price").value),
    business_remain: Number(document.getElementById("c-b-remain").value),
    economy_price: Number(document.getElementById("c-e-price").value),
    economy_remain: Number(document.getElementById("c-e-remain").value),
  };

  try {
    const data = await apiRequest("/api/v1/tickets", { method: "POST", body: payload });
    setLog(`新增成功: ticket_id=${data.ticket_id}`);
    showToast(`新增成功: ticket #${data.ticket_id}`, "success");
    event.target.reset();
    refreshInventory();
  } catch (err) {
    setLog(`新增失败: ${err.message}`);
    showToast(`新增失败: ${err.message}`, "error");
  }
});

refreshInventory();
