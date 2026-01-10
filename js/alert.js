// alert.js - Multiple Images with Camera/Gallery Choice

const API_BASE = "https://backend-3-hqil.onrender.com";

let gpsReady = false;
let selectedImages = []; // Store multiple images

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

  // Get user info from localStorage (only for session data)
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

  // Auto-fill the reporter_name field
  const reporterNameInput = document.getElementById('reporter_name');
  if (reporterNameInput && fullName) {
    reporterNameInput.value = fullName;
    console.log("Reporter name auto-filled:", fullName);
  }

  // Verify user is logged in
  if (!userId) {
    console.error("❌ No user_id found in session!");
    alert("⚠️ Please log in to submit alerts.");
    window.location.href = 'login.html';
    return;
  }

  // Initialize image upload system
  initializeImageUpload();
};

// ============================================
// IMAGE UPLOAD SYSTEM
// ============================================

function initializeImageUpload() {
  const photoInput = document.querySelector('input[name="photo"]');
  if (!photoInput) return;

  // Hide the original file input
  photoInput.style.display = 'none';

  // Create camera input (hidden)
  const cameraInput = document.createElement('input');
  cameraInput.type = 'file';
  cameraInput.accept = 'image/*';
  cameraInput.capture = 'environment'; // Use back camera
  cameraInput.multiple = true; // Allow multiple images
  cameraInput.style.display = 'none';
  cameraInput.id = 'cameraInput';

  // Create gallery input (hidden)
  const galleryInput = document.createElement('input');
  galleryInput.type = 'file';
  galleryInput.accept = 'image/*';
  galleryInput.multiple = true; // Allow multiple images
  galleryInput.style.display = 'none';
  galleryInput.id = 'galleryInput';

  // Add inputs to form
  photoInput.parentElement.appendChild(cameraInput);
  photoInput.parentElement.appendChild(galleryInput);

  // Create custom upload button
  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'upload-btn';
  uploadBtn.innerHTML = '<i class="fas fa-camera"></i> Choose Images';
  uploadBtn.style.cssText = `
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: transform 0.2s;
    width: 100%;
    margin-bottom: 10px;
  `;

  uploadBtn.addEventListener('mousedown', () => {
    uploadBtn.style.transform = 'scale(0.95)';
  });
  uploadBtn.addEventListener('mouseup', () => {
    uploadBtn.style.transform = 'scale(1)';
  });

  // Create preview container
  const previewContainer = document.createElement('div');
  previewContainer.id = 'imagePreviewContainer';
  previewContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
    margin-top: 10px;
  `;

  // Add button and preview to form
  photoInput.parentElement.insertBefore(uploadBtn, photoInput);
  photoInput.parentElement.insertBefore(previewContainer, photoInput);

  // Handle upload button click - show modal
  uploadBtn.addEventListener('click', showImageSourceModal);

  // Handle camera input change
  cameraInput.addEventListener('change', (e) => handleImageSelection(e.target.files));

  // Handle gallery input change
  galleryInput.addEventListener('change', (e) => handleImageSelection(e.target.files));
}

// Show modal to choose camera or gallery
function showImageSourceModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('imageSourceModal');
  if (existingModal) existingModal.remove();

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'imageSourceModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 20px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s;
    ">
      <h3 style="margin: 0 0 20px 0; text-align: center; color: #333; font-size: 22px;">
        <i class="fas fa-images" style="color: #667eea;"></i> Choose Image Source
      </h3>
      
      <button id="cameraBtn" style="
        width: 100%;
        padding: 18px;
        margin-bottom: 15px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        transition: transform 0.2s;
      ">
        <i class="fas fa-camera"></i> Take Photo
      </button>
      
      <button id="galleryBtn" style="
        width: 100%;
        padding: 18px;
        margin-bottom: 15px;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
        transition: transform 0.2s;
      ">
        <i class="fas fa-folder-open"></i> Choose from Gallery
      </button>
      
      <button id="cancelBtn" style="
        width: 100%;
        padding: 12px;
        background: #f1f3f5;
        color: #666;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.2s;
      ">
        Cancel
      </button>
    </div>
  `;

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    #cameraBtn:hover, #galleryBtn:hover {
      transform: scale(1.05);
    }
    #cancelBtn:hover {
      background: #e9ecef;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(modal);

  // Handle button clicks
  document.getElementById('cameraBtn').addEventListener('click', () => {
    modal.remove();
    document.getElementById('cameraInput').click();
  });

  document.getElementById('galleryBtn').addEventListener('click', () => {
    modal.remove();
    document.getElementById('galleryInput').click();
  });

  document.getElementById('cancelBtn').addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Handle selected images
function handleImageSelection(files) {
  if (!files || files.length === 0) return;

  // Add new files to selectedImages array
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      selectedImages.push(file);
    }
  });

  console.log(`📸 Total images selected: ${selectedImages.length}`);
  updateImagePreviews();
}

// Update image previews
function updateImagePreviews() {
  const container = document.getElementById('imagePreviewContainer');
  container.innerHTML = '';

  selectedImages.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    const img = document.createElement('img');
    img.style.cssText = `
      width: 100%;
      height: 100px;
      object-fit: cover;
    `;

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: rgba(255, 59, 48, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;

    removeBtn.addEventListener('click', () => {
      selectedImages.splice(index, 1);
      updateImagePreviews();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
  });

  // Show count
  if (selectedImages.length > 0) {
    const countBadge = document.createElement('div');
    countBadge.style.cssText = `
      text-align: center;
      margin-top: 10px;
      color: #667eea;
      font-weight: 600;
    `;
    countBadge.innerHTML = `<i class="fas fa-images"></i> ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} selected`;
    container.appendChild(countBadge);
  }
}

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

// ============================================
// FORM SUBMISSION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("alertForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;

    try {
      // Get user_id from session storage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error("User ID is missing. Please log in and try again.");
      }
      console.log("✅ User ID verified before sending:", userId);

      const video = form.querySelector('input[name="video"]').files[0];

      const latValue = document.getElementById("latitude").value;
      const lonValue = document.getElementById("longitude").value;

      if (!latValue || !lonValue || !gpsReady) {
        throw new Error("Location is required. Please enable GPS and wait until it's loaded.");
      }

      // ✅ Check if at least one image or video is selected
      if (selectedImages.length === 0 && !video) {
        throw new Error("You must attach at least one photo or a video.");
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

      // Create FormData for backend submission
      const formData = new FormData();
      
      // Add user_id FIRST (most critical field)
      formData.append('user_id', userId);
      
      // Add all other form fields
      formData.append('description', description);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('barangay', form.querySelector('input[name="barangay"]')?.value || '');
      formData.append('reporter_name', form.querySelector('input[name="reporter_name"]')?.value || fullName);
      
      // ✅ Add multiple images
      selectedImages.forEach((image, index) => {
        formData.append('photos', image); // Use 'photos' (plural) for multiple images
        console.log(`  - Image ${index + 1}:`, image.name);
      });
      
      // Add video if present
      if (video) {
        formData.append('video', video);
      }

      // Log what's being sent
      console.log("📤 SENDING ALERT TO BACKEND:");
      console.log("  - User ID:", formData.get('user_id'));
      console.log("  - Reporter:", formData.get('reporter_name'));
      console.log("  - Barangay:", formData.get('barangay'));
      console.log("  - Description:", formData.get('description'));
      console.log("  - Images:", selectedImages.length);
      console.log("  - Video:", video ? video.name : 'None');
      console.log("  - Latitude:", latitude);
      console.log("  - Longitude:", longitude);

      // Send to backend
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
        console.log("✅ Alert submitted successfully to backend!");
        console.log("✅ No localStorage usage - data is fully on backend");
        
        // Clear selected images
        selectedImages = [];
        
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
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  });
});