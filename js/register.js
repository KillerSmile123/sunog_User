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

// --- OTP & Registration Code ---

let savedOtp = '';
let currentEmail = '';

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

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const gmail = document.getElementById('gmailInput').value;

    if (!gmail) { alert('Please enter your Gmail address'); return; }

    showLoading('sendOtpBtn', 'Sending OTP...');
    try {
        const response = await fetch('http://127.0.0.1:8000/send_gmail_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gmail })
        });

        const data = await response.json();

        if (response.ok) {
            savedOtp = data.otp;
            alert("OTP sent! Check your Gmail.");
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('sendOtpBtn').style.display = 'none';
        } else {
            alert(data.message || "Failed to send OTP.");
        }
    } catch (error) {
        alert("Error sending OTP.");
    } finally {
        hideLoading('sendOtpBtn', 'Send OTP');
    }
});

// --- OTP Verification & Registration ---
document.getElementById('verifyOtpBtn').addEventListener('click', async function () {
    const userOtp = document.getElementById('otpInput').value;

    if (!userOtp) { alert('Please enter OTP'); return; }

    if (userOtp === savedOtp) {
        showLoading('verifyOtpBtn', 'Registering...');

        try {
            const formData = new FormData(document.getElementById('registerForm'));

            const userData = {
                fullname: formData.get('fullname'),
                address: formData.get('address'),
                mobile: formData.get('mobile'),
                gmail: formData.get('gmail'),
            };

            // Save to localStorage (correct location)
            localStorage.setItem('address', userData.address);
            localStorage.setItem('gmail', userData.gmail);
            localStorage.setItem('mobile', userData.mobile);
            localStorage.setItem('fullName', userData.fullname);

            const response = await fetch('http://127.0.0.1:8000/register', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Registered successfully!");
                window.location.href = "userDashboard.html";
            } else {
                alert(result.message || "Registration failed.");
            }

        } catch (error) {
            console.error(error);
            alert("Registration failed.");
        } finally {
            hideLoading('verifyOtpBtn', 'Verify OTP');
        }

    } else {
        alert("Incorrect OTP. Try again.");
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
