// alert.js - Fully connected to backend, NO localStorage

const API_BASE = "https://backend-3-hqil.onrender.com";

let gpsReady = false;

window.onload = function () {
  // Get GPS coordinates
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const latInput = document.getElementById("latitude");
        const lonInput = document.getElementById("longitude");
        if (latInput && lonInput) {
          latInput.value = position.coords.latitude;
          lonInput.value = position.coords.longitude;
          gpsReady = true;
          console.log("GPS coordinates loaded:", position.coords.latitude, position.coords.longitude);
        }
      },
      function (error) {
        console.error("Geolocation error:", error);
        alert("Unable to get your location. Please enable GPS.");
      }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }

  // ✅ Get user info from localStorage (only for session data)
  const fullName = localStorage.getItem('fullName');
  const userId = localStorage.getItem('userId');
  
  console.log("📱 User session loaded:");
  console.log("   Name:", fullName);
  console.log("   ID:", userId);
  
  // Set welcome message
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    welcomeMessage.textContent = fullName ? `Welcome, ${fullName}!` : "Welcome!";
  }

  // ✅ Auto-fill the reporter_name field
  const reporterNameInput = document.getElementById('reporter_name');
  if (reporterNameInput && fullName) {
    reporterNameInput.value = fullName;
    console.log("Reporter name auto-filled:", fullName);
  }

  // ✅ Verify user is logged in
  if (!userId) {
    console.error("❌ No user_id found in session!");
    alert("⚠️ Please log in to submit alerts.");
    window.location.href = 'login.html';
    return;
  }
};

// Function to check if server is reachable
async function checkServerConnection() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      credentials: 'include'
    });
    return response.ok;
  } catch (error) {
    console.error("Server connection test failed:", error);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("alertForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Sending...";
    submitButton.disabled = true;

    try {
      // ✅ Get user_id from session storage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error("User ID is missing. Please log in and try again.");
      }
      console.log("✅ User ID verified before sending:", userId);

      const photo = form.querySelector('input[name="photo"]').files[0];
      const video = form.querySelector('input[name="video"]').files[0];

      const latValue = document.getElementById("latitude").value;
      const lonValue = document.getElementById("longitude").value;

      if (!latValue || !lonValue || !gpsReady) {
        throw new Error("Location is required. Please enable GPS and wait until it's loaded.");
      }

      if (!photo && !video) {
        throw new Error("You must attach at least a photo or a video.");
      }

      const latitude = parseFloat(latValue);
      const longitude = parseFloat(lonValue);
      const description = form.querySelector('textarea[name="description"]').value || "Fire Incident";
      const fullName = localStorage.getItem('fullName') || "Unknown";

      // Check server connection first
      console.log("Checking server connection...");
      const serverReachable = await checkServerConnection();
      if (!serverReachable) {
        throw new Error("Cannot connect to server. Please check your internet connection and try again.");
      }

      // ✅ Create FormData for backend submission
      const formData = new FormData();
      
      // Add user_id FIRST (most critical field)
      formData.append('user_id', userId);
      
      // Add all other form fields
      formData.append('description', description);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('barangay', form.querySelector('input[name="barangay"]')?.value || '');
      formData.append('reporter_name', form.querySelector('input[name="reporter_name"]')?.value || fullName);
      
      // Add media files
      if (photo) {
        formData.append('photo', photo);
      }
      if (video) {
        formData.append('video', video);
      }

      // ✅ Log what's being sent
      console.log("📤 SENDING ALERT TO BACKEND:");
      console.log("  - User ID:", formData.get('user_id'));
      console.log("  - Reporter:", formData.get('reporter_name'));
      console.log("  - Barangay:", formData.get('barangay'));
      console.log("  - Description:", formData.get('description'));
      console.log("  - Photo:", photo ? photo.name : 'None');
      console.log("  - Video:", video ? video.name : 'None');
      console.log("  - Latitude:", latitude);
      console.log("  - Longitude:", longitude);

      // ✅ Send to backend
      const response = await fetch(`${API_BASE}/send_alert`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      console.log("✅ Server response status:", response.status);

      const contentType = response.headers.get("content-type");
      let result = null;

      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
        console.log("✅ Server response data:", result);
        
        // ✅ Verify the response contains user_id
        if (result.user_id) {
          console.log("✅ Backend confirmed user_id was saved:", result.user_id);
        } else {
          console.warn("⚠️ Backend response does not contain user_id!");
        }
      } else {
        const textResult = await response.text();
        console.log("Server response (text):", textResult);
      }

      if (response.ok) {
        // ✅ SUCCESS - NO LOCALSTORAGE SAVING
        // All data is now on the backend!
        console.log("✅ Alert submitted successfully to backend!");
        console.log("✅ No localStorage usage - data is fully on backend");
        
        form.reset();
        window.location.href = "report submit.html";
      } else {
        throw new Error(`Server error (${response.status}): ${result?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error("❌ Error details:", error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert("⚠️ Network Error: Cannot connect to the server. Please check your internet connection and try again.");
      } else if (error.message.includes('CORS')) {
        alert("⚠️ CORS Error: Server blocked the request. Please try again later.");
      } else {
        alert(`⚠️ Error: ${error.message}`);
      }
    } finally {
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
});