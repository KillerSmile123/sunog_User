// ==============================
// USER AUTHENTICATION & REGISTRATION SCRIPT
// ==============================

// Save token
function saveToken(token) {
  localStorage.setItem("user_token", token);
}

// Get token
function getToken() {
  return localStorage.getItem("user_token");
}

// Remove token & user info (logout)
function removeToken() {
  localStorage.removeItem("user_token");
  localStorage.removeItem("user_info");
}

// Check if logged in
function isLoggedIn() {
  return getToken() !== null;
}

// Check if user has registered
function isRegistered() {
  return localStorage.getItem("user_info") !== null;
}

// Protect pages
function protectPage() {
  if (!isRegistered()) {
    // Not registered → redirect to register.html
    window.location.replace("register.html");
  } else if (!isLoggedIn()) {
    // Registered but not logged in → redirect to login.html
    window.location.replace("login.html");
  }
}

// Load user info on pages
function loadUserInfo(user) {
  const welcome = document.getElementById("welcomeMessage");
  if (welcome) welcome.innerText = `Welcome, ${user.fullname}!`;

  const profileName = document.getElementById("profileName");
  if (profileName) profileName.innerText = user.fullname;
  const profileAddress = document.getElementById("profileAddress");
  if (profileAddress) profileAddress.innerText = user.address;
  const profileGmail = document.getElementById("profileGmail");
  if (profileGmail) profileGmail.innerText = user.gmail;
  const profileMobile = document.getElementById("profileMobile");
  if (profileMobile) profileMobile.innerText = user.mobile;
}

// ==============================
// LOGIN FUNCTION
// ==============================
async function loginUser(event) {
  event.preventDefault();
  const gmail = document.getElementById("gmail").value;
  const mobile = document.getElementById("mobile").value;

  try {
    const response = await fetch("http://localhost:5000/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gmail, mobile })
    });

    const data = await response.json();
    if (response.ok && data.token) {
      saveToken(data.token);
      localStorage.setItem("user_info", JSON.stringify(data.user));
      window.location.href = "userDashboard.html";
    } else {
      alert(data.message || "Login failed!");
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Try again!");
  }
}

// ==============================
// REGISTER FUNCTION
// ==============================
function registerUser(event) {
  event.preventDefault();

  const fullname = document.querySelector("input[name='fullname']").value;
  const address = document.querySelector("input[name='address']").value;
  const gmail = document.querySelector("input[name='gmail']").value;
  const mobile = document.querySelector("input[name='mobile']").value;

  if (!fullname || !address || !gmail || !mobile) {
    alert("Please fill all fields.");
    return;
  }

  // Save user info locally
  const user = { fullname, address, gmail, mobile };
  localStorage.setItem("user_info", JSON.stringify(user));

  alert("Registration successful! Please login.");
  window.location.href = "login.html";
}

// ==============================
// LOGOUT FUNCTION
// ==============================
function logoutUser() {
  removeToken();
  window.location.href = "login.html";
}

// ==============================
// GET STORED USER
// ==============================
function getStoredUser() {
  const userStr = localStorage.getItem("user_info");
  return userStr ? JSON.parse(userStr) : null;
}

// ==============================
// INIT PAGE
// ==============================
function initUserPage() {
  protectPage();
  const user = getStoredUser();
  if (user) loadUserInfo(user);
}

// ==============================
// AUTO ATTACH LOGOUT BUTTONS
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  // Attach logout buttons
  const logoutButtons = document.querySelectorAll(".logout-btn");
  logoutButtons.forEach(btn => btn.addEventListener("click", logoutUser));

  // Attach register form if exists
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", registerUser);
  }

  // Attach login form if exists
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", loginUser);
  }
});
