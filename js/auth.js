// ==============================
// API CONFIGURATION
// ==============================
const API_URL = 'https://backend-3-hqil.onrender.com';

// ==============================
// USER AUTHENTICATION & REGISTRATION SCRIPT
// ==============================

// Save token (using sessionStorage for security)
function saveToken(token) {
  sessionStorage.setItem("user_token", token);
}

// Get token
function getToken() {
  return sessionStorage.getItem("user_token");
}

// Remove token & user info (logout)
function removeToken() {
  sessionStorage.removeItem("user_token");
  sessionStorage.removeItem("user_info");
}

// Check if logged in
function isLoggedIn() {
  return getToken() !== null;
}

// Check if user has registered
function isRegistered() {
  return sessionStorage.getItem("user_info") !== null;
}

// Protect pages
function protectPage() {
  if (!isRegistered()) {
    window.location.replace("register.html");
  } else if (!isLoggedIn()) {
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
// SEND OTP FUNCTION
// ==============================
async function sendOTP(gmail) {
  try {
    const response = await fetch(`${API_URL}/user/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ gmail })
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Network error" };
  }
}

// ==============================
// VERIFY OTP & LOGIN FUNCTION
// ==============================
async function verifyOTPAndLogin(gmail, otp) {
  try {
    const response = await fetch(`${API_URL}/user/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ gmail, otp })
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      saveToken(data.token);
      sessionStorage.setItem("user_info", JSON.stringify(data.user));
      return { success: true, data };
    } else {
      return { success: false, message: data.message || "Invalid OTP" };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: "Network error" };
  }
}

// ==============================
// REGISTER FUNCTION
// ==============================
async function registerUser(event) {
  event.preventDefault();

  const fullname = document.querySelector("input[name='fullname']").value;
  const address = document.querySelector("input[name='address']").value;
  const gmail = document.querySelector("input[name='gmail']").value;
  const mobile = document.querySelector("input[name='mobile']").value;

  if (!fullname || !address || !gmail || !mobile) {
    alert("Please fill all fields.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ fullname, address, gmail, mobile })
    });

    const data = await response.json();
    
    if (response.ok) {
      const user = { fullname, address, gmail, mobile };
      sessionStorage.setItem("user_info", JSON.stringify(user));
      
      alert("Registration successful! Please login.");
      window.location.href = "login.html";
    } else {
      alert(data.message || "Registration failed!");
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Try again!");
  }
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
  const userStr = sessionStorage.getItem("user_info");
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
});