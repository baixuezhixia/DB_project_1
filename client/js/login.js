import { apiRequest, ADMIN_PASSENGER_ID, getCurrentPassengerId, setCurrentPassengerId, setLog, showToast } from "./api.js";

const form = document.getElementById("login-form");
const userTypeRadios = document.querySelectorAll("input[name='user-type']");

const existing = getCurrentPassengerId();
if (existing) {
  window.location.href = existing === ADMIN_PASSENGER_ID ? "./inventory.html" : "./index.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  let username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const isAdminMode = document.getElementById("admin-mode")?.checked;

  // If admin mode is checked, use admin credentials
  if (isAdminMode) {
    username = "checker";
  }

  if (!username || !password) {
    setLog("请输入手机号和密码");
    showToast("请输入手机号和密码", "error");
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.classList.add("loading");
  btn.textContent = "";

  try {
    const data = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: {
        username,
        password,
      },
    });
    setCurrentPassengerId(data.passenger_id);
    setLog(`登录成功: passenger_id=${data.passenger_id}`);

    if (data.passenger_id === ADMIN_PASSENGER_ID) {
      showToast("管理员登录成功!", "success");
      window.location.href = "./inventory.html";
    } else {
      showToast("登录成功!", "success");
      window.location.href = "./index.html";
    }
  } catch (err) {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.textContent = "登录";
    setLog(`登录失败: ${err.message}`);
    showToast(`登录失败: ${err.message}`, "error");
  }
});
