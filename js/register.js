const API_BASE = "https://backend-3-hqil.onrender.com"; // Updated to Render URL

// --- Splash Screen Transition ---
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    const register = document.getElementById('registerContainer');
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      register.classList.add('active');
    }, 800);
  }, 2000);
});

// --- Loading Helpers ---
function showLoading(buttonId, text = 'Loading...') {
    const button = document.getElementById(buttonId);
    button.disabled = true;
    button.textContent = text;
}

function hideLoading(buttonId, text) {
    const button = document.getElementById(buttonId);
    button.disabled = false;
    button.textContent = text;
}

// --- OTP Cooldown ---
let otpCooldown = false;

function startOtpCooldown(buttonId, seconds = 60) {
    otpCooldown = true;
    const button = document.getElementById(buttonId);
    let countdown = seconds;
    button.disabled = true;
    button.textContent = `Resend OTP in ${countdown}s`;

    const interval = setInterval(() => {
        countdown--;
        button.textContent = `Resend OTP in ${countdown}s`;
        if (countdown <= 0) {
            clearInterval(interval);
            button.disabled = false;
            button.textContent = "Send OTP";
            otpCooldown = false;
        }
    }, 1000);
}

// --- Send OTP ---
document.getElementById('sendOtpBtn').addEventListener('click', async function(e) {
    e.preventDefault();

    if (otpCooldown) return;

    const gmail = document.getElementById('gmailInput').value;
    if (!gmail) {
        alert('Please enter your Gmail address');
        return;
    }

    showLoading('sendOtpBtn', 'Sending OTP...');
    try {
        const response = await fetch(`${API_BASE}/send_otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Added for session support
            body: JSON.stringify({ gmail })
        });

        const data = await response.json();

        if (response.ok) {
            alert("OTP sent! Check your email.");
            document.getElementById('otpSection').style.display = 'block';
            startOtpCooldown('sendOtpBtn', 60); // start 60s cooldown
        } else {
            alert(data.message || "Failed to send OTP.");
        }
    } catch (error) {
        console.error(error);
        alert("Error sending OTP. Check backend or network.");
    } finally {
        hideLoading('sendOtpBtn', 'Send OTP');
    }
});

// --- Verify OTP & Register User ---
document.getElementById('verifyOtpBtn').addEventListener('click', async function () {
    const otp = document.getElementById('otpInput').value;
    if (!otp) { alert('Please enter OTP'); return; }

    showLoading('verifyOtpBtn', 'Registering...');

    try {
        const formData = new FormData(document.getElementById('registerForm'));

        // Use the gmail from the input directly to ensure consistency
        const gmail = document.getElementById('gmailInput').value;

        const userData = {
            fullname: formData.get('fullname'),
            address: formData.get('address'),
            mobile: formData.get('mobile'),
            gmail: gmail,  // ← Changed to use the input value directly
            otp: otp
        };

        console.log("Sending registration data:", userData); // Debug log

        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            credentials: 'include', // Added for session support
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            // Save to localStorage
            localStorage.setItem('fullName', userData.fullname);
            localStorage.setItem('address', userData.address);
            localStorage.setItem('mobile', userData.mobile);
            localStorage.setItem('gmail', userData.gmail);

            alert("Registration successful!");
            window.location.href = "userDashboard.html";
        } else {
            alert(result.message || "Registration failed.");
            console.error("Registration error:", result); // Debug log
        }

    } catch (error) {
        console.error(error);
        alert("Registration failed. Check backend or network.");
    } finally {
        hideLoading('verifyOtpBtn', 'Verify OTP');
    }
});

// --- Input Validations ---
document.getElementById('registerForm').addEventListener('input', function(e) {
    const field = e.target;

    if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        field.style.borderColor = emailRegex.test(field.value) ? 'green' : 'red';
    }

    if (field.type === 'tel') {
        const phoneRegex = /^[0-9]{10,15}$/;
        field.style.borderColor = phoneRegex.test(field.value.replace(/\s/g, '')) ? 'green' : 'red';
    }
});