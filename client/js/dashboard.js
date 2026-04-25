import { apiRequest, isAdmin, logout, requireLogin, setLog, showToast } from "./api.js";

const apiStatusNode = document.getElementById("api-status");
const invCountNode = document.getElementById("inv-count");
const orderCountNode = document.getElementById("order-count");
const passengerNode = document.getElementById("current-passenger");
const passengerId = requireLogin();

const admin = isAdmin();
passengerNode.innerHTML = admin
  ? '管理员 <span class="badge badge-business" style="margin-left:6px">Admin</span>'
  : `旅客 #${passengerId}`;
document.getElementById("btn-logout").addEventListener("click", logout);

// Hide order stats for admin (admin can't have orders)
if (admin && orderCountNode) {
  const orderStat = orderCountNode.closest?.(".stat");
  if (orderStat) orderStat.style.display = "none";
}

async function loadDashboard() {
  try {
    const root = await apiRequest("/");
    apiStatusNode.innerHTML = '<span class="status-dot online"></span> ONLINE';
    setLog("API 服务可访问");
  } catch (err) {
    apiStatusNode.innerHTML = '<span class="status-dot offline"></span> OFFLINE';
    setLog(`API 健康检查失败: ${err.message}`);
    showToast("API 连接失败", "error");
  }

  if (admin) {
    invCountNode.textContent = "- (管理员)";
    return;
  }

  try {
    const inv = await apiRequest("/api/v1/tickets?limit=200&offset=0");
    invCountNode.textContent = String(Array.isArray(inv) ? inv.length : 0);
  } catch (err) {
    invCountNode.textContent = "ERR";
    setLog(`读取库存失败: ${err.message}`);
  }
}

async function loadOrderCount() {
  if (admin) {
    orderCountNode.textContent = "-";
    return;
  }

  try {
    const rows = await apiRequest(`/api/v1/orders/${passengerId}?limit=200&offset=0`);
    orderCountNode.textContent = String(Array.isArray(rows) ? rows.length : 0);
    setLog(`乘客 ${passengerId} 的订单数已更新`);
  } catch (err) {
    orderCountNode.textContent = "ERR";
    setLog(`读取订单数失败: ${err.message}`);
  }
}

loadDashboard();
loadOrderCount();
