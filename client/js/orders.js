import { apiRequest, isAdmin, logout, requireLogin, setLog, showToast, showTableLoading } from "./api.js";

const form = document.getElementById("orders-form");
const tbody = document.getElementById("orders-body");
const passengerNode = document.getElementById("current-passenger");
const passengerId = requireLogin();
const admin = isAdmin();

passengerNode.innerHTML = admin
  ? '管理员 <span class="badge badge-business" style="margin-left:6px">Admin</span>'
  : `旅客 #${passengerId}`;
document.getElementById("btn-logout").addEventListener("click", logout);

// This page does not work for admin (server rejects admin for order endpoints)
if (admin) {
  form.style.display = "none";
  document.querySelector(".panel:has(#orders-form)")?.querySelector("h2")?.replaceChildren("订单管理（管理员不可用）");
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--ink-muted)">管理员账户无法查看乘客订单。<br>请使用普通乘客账户登录。</td></tr>';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(status) {
  if (status === "booked") return `<span class="badge badge-booked">已预订</span>`;
  if (status === "cancelled") return `<span class="badge badge-cancelled">已取消</span>`;
  return escapeHtml(status);
}

function cabinBadge(cls) {
  if (cls === "economy") return `<span class="badge badge-economy">经济舱</span>`;
  if (cls === "business") return `<span class="badge badge-business">商务舱</span>`;
  return escapeHtml(cls);
}

async function loadOrders() {
  if (admin) return; // already handled above

  showTableLoading(tbody);
  try {
    const rows = await apiRequest(`/api/v1/orders/${passengerId}?limit=200&offset=0`);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--ink-muted)">暂无订单</td></tr>';
      setLog(`乘客 ${passengerId} 暂无订单`);
      return;
    }

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td><code>${r.order_id}</code></td>
        <td>${statusBadge(r.status)}</td>
        <td>${cabinBadge(r.cabin_class)}</td>
        <td><strong>￥${r.unit_price}</strong></td>
        <td>${escapeHtml(r.flight_number)}</td>
        <td>${escapeHtml(r.source_city)} → ${escapeHtml(r.destination_city)}</td>
        <td>${escapeHtml(r.flight_date)}</td>
        <td>${escapeHtml(r.booked_at)}</td>
        <td>
          ${
            r.status === "booked"
              ? `<button class="mini-btn" data-cancel="${r.order_id}">取消</button>`
              : '<span class="text-muted">-</span>'
          }
        </td>
      </tr>
    `,
      )
      .join("");

    tbody.querySelectorAll("button[data-cancel]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const orderId = Number(btn.dataset.cancel);
        try {
          await apiRequest(`/api/v1/orders/${passengerId}/${orderId}/cancel`, { method: "POST" });
          setLog(`取消成功: order_id=${orderId}`);
          showToast(`订单 ${orderId} 已取消`, "success");
          loadOrders();
        } catch (err) {
          setLog(`取消失败: ${err.message}`);
          showToast(`取消订单失败: ${err.message}`, "error");
        }
      });
    });

    setLog(`加载完成: 乘客 ${passengerId} 共 ${rows.length} 条订单`);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--ink-muted)">加载失败</td></tr>';
    setLog(`加载订单失败: ${err.message}`);
    showToast("加载订单失败", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  loadOrders();
});

if (!admin) loadOrders();
