let gpsReady = false;

// Storage management functions
function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function cleanupOldAlerts(maxAlerts = 5) {
  try {
    const list = JSON.parse(localStorage.getItem("alertList")) || [];
    if (list.length > maxAlerts) {
      const trimmedList = list.slice(-maxAlerts); // Keep only the last N alerts
      localStorage.setItem("alertList", JSON.stringify(trimmedList));
      console.log(`Cleaned up alerts. Kept ${trimmedList.length} most recent alerts.`);
      return true;
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
  return false;
}

window.onload = function () {
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

  const fullName = localStorage.getItem('fullName');
  if (!localStorage.getItem("user")) {
    localStorage.setItem("user", JSON.stringify({
      name: fullName || "Unknown",
      contact: "09123456789"
    }));
  }

  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    welcomeMessage.textContent = fullName ? `Welcome, ${fullName}!` : "Welcome!";
  }
};

// Function to check if server is reachable
async function checkServerConnection() {
  try {
    const response = await fetch("http://127.0.0.1:8000/health", {
      method: "GET",
      timeout: 5000
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
      // Check storage before starting
      const currentStorageSize = getStorageSize();
      console.log(`Current localStorage usage: ${formatBytes(currentStorageSize)}`);
      
      // If storage is getting full, clean up preemptively
      if (currentStorageSize > 4 * 1024 * 1024) { // 4MB threshold
        console.log("Storage is getting full, cleaning up...");
        cleanupOldAlerts(5);
      }

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

      // Check server connection first
      console.log("Checking server connection...");
      const serverReachable = await checkServerConnection();
      if (!serverReachable) {
        throw new Error("Cannot connect to server. Please make sure your Flask server is running on http://127.0.0.1:8000");
      }

      // Prepare local alert object for localStorage
      const getBase64 = f => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = e => rej(e);
        r.readAsDataURL(f);
      });

      const mediaBase64 = photo ? await getBase64(photo) : await getBase64(video);
      const mediaType = photo ? "image" : "video";
      const user = JSON.parse(localStorage.getItem("user")) || { name: "Unknown", contact: "N/A" };

      const alertData = {
        id: "2025-" + Date.now(),
        latitude,
        longitude,
        description,
        timestamp: new Date().toISOString(),
        media: mediaBase64,
        mediaType,
        user
      };

      // Send form to Flask
      console.log("Sending alert to server...");
      const formData = new FormData(form);
      
      const response = await fetch("http://127.0.0.1:8000/send_alert", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      console.log("Server response status:", response.status);
      console.log("Server response headers:", response.headers);

      const contentType = response.headers.get("content-type");
      let result = null;

      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
        console.log("Server response data:", result);
      } else {
        const textResult = await response.text();
        console.log("Server response (text):", textResult);
      }

      if (response.ok) {
        // Save to localStorage with storage management
        try {
          const list = JSON.parse(localStorage.getItem("alertList")) || [];
          list.push(alertData);
          
          // Try to save, if quota exceeded, manage storage
          try {
            localStorage.setItem("alertList", JSON.stringify(list));
          } catch (storageError) {
            if (storageError.name === 'QuotaExceededError') {
              console.log("Storage quota exceeded, cleaning up old alerts...");
              
              // Remove oldest alerts until we can save (keep only last 10 alerts)
              let managedList = [...list];
              while (managedList.length > 10) {
                managedList.shift(); // Remove oldest
              }
              
              try {
                localStorage.setItem("alertList", JSON.stringify(managedList));
                console.log(`Cleaned up storage. Kept ${managedList.length} most recent alerts.`);
              } catch (secondError) {
                // If still failing, save without media
                console.log("Still not enough space, saving without media...");
                const lightweightAlert = {
                  id: alertData.id,
                  latitude: alertData.latitude,
                  longitude: alertData.longitude,
                  description: alertData.description,
                  timestamp: alertData.timestamp,
                  mediaType: alertData.mediaType,
                  user: alertData.user,
                  mediaNote: "Media saved on server only (storage full)"
                };
                
                managedList[managedList.length - 1] = lightweightAlert;
                localStorage.setItem("alertList", JSON.stringify(managedList));
              }
            } else {
              throw storageError;
            }
          }
        } catch (error) {
          console.error("Failed to save to localStorage:", error);
          // Continue anyway since server saved successfully
        }

        alert("🔥 Fire alert sent successfully!");
        form.reset();
        setTimeout(() => window.location.href = "alerts.html", 500);
      } else {
        throw new Error(`Server error (${response.status}): ${result?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error("Error details:", error);
      
      // Provide specific error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert("⚠️ Network Error: Cannot connect to the server. Please check:\n• Is your Flask server running?\n• Is it running on http://127.0.0.1:8000?\n• Check your internet connection");
      } else if (error.message.includes('CORS')) {
        alert("⚠️ CORS Error: Server blocked the request. Check your Flask CORS settings.");
      } else {
        alert(`⚠️ Error: ${error.message}`);
      }
    } finally {
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
});

