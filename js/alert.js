// alert.js - Clean JavaScript (No HTML/CSS)

const API_BASE = "https://backend-3-hqil.onrender.com";

let gpsReady = false;
let selectedMedia = [];

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

  // Get user info from localStorage
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

  // Initialize unified media upload system
  initializeMediaUpload();
};

// ============================================
// UNIFIED MEDIA UPLOAD SYSTEM
// ============================================

function initializeMediaUpload() {
  const photoInput = document.querySelector('input[name="photo"]');
  const videoInput = document.querySelector('input[name="video"]');
  
  if (!photoInput) return;

  // Hide original inputs
  if (photoInput) photoInput.style.display = 'none';
  if (videoInput) videoInput.style.display = 'none';

  // Get the form
  const form = document.getElementById('alertForm');
  const descriptionGroup = form.querySelector('.form-group');

  // Create hidden input for gallery
  const galleryInput = document.createElement('input');
  galleryInput.type = 'file';
  galleryInput.accept = 'image/*,video/*';
  galleryInput.multiple = true;
  galleryInput.style.display = 'none';
  galleryInput.id = 'galleryInput';
  form.appendChild(galleryInput);

  // Create upload button
  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'media-upload-btn';
  uploadBtn.innerHTML = '<i class="fas fa-photo-video"></i> Add Photos/Videos';

  // Create preview container
  const previewContainer = document.createElement('div');
  previewContainer.id = 'mediaPreviewContainer';

  // Insert after description
  descriptionGroup.parentNode.insertBefore(uploadBtn, descriptionGroup.nextSibling);
  uploadBtn.parentNode.insertBefore(previewContainer, uploadBtn.nextSibling);

  // Event handlers
  uploadBtn.addEventListener('click', showMediaSourceModal);
  galleryInput.addEventListener('change', (e) => handleMediaSelection(e.target.files));
}

// ============================================
// MEDIA SOURCE SELECTION MODAL
// ============================================

function showMediaSourceModal() {
  const existingModal = document.getElementById('mediaSourceModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'mediaSourceModal';
  modal.className = 'media-source-modal';

  modal.innerHTML = `
    <div class="media-source-content">
      <h3>
        <i class="fas fa-photo-video"></i> Add Media
      </h3>
      
      <button class="modal-camera-btn" id="cameraBtn">
        <i class="fas fa-camera"></i> Use Camera
      </button>
      
      <button class="modal-gallery-btn" id="galleryBtn">
        <i class="fas fa-folder-open"></i> Choose from Gallery
      </button>
      
      <button class="modal-cancel-btn" id="cancelBtn">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('cameraBtn').addEventListener('click', () => {
    modal.remove();
    showLiveCameraModal();
  });

  document.getElementById('galleryBtn').addEventListener('click', () => {
    modal.remove();
    document.getElementById('galleryInput').click();
  });

  document.getElementById('cancelBtn').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// ============================================
// LIVE CAMERA MODAL
// ============================================

function showLiveCameraModal() {
  const modal = document.createElement('div');
  modal.className = 'live-camera-modal';
  modal.id = 'liveCameraModal';

  modal.innerHTML = `
    <div class="camera-preview-container">
      <video id="cameraPreview" autoplay playsinline></video>
      
      <div class="camera-controls">
        <button class="camera-capture-btn" id="capturePhotoBtn">
          <i class="fas fa-camera"></i> Capture Photo
        </button>
        
        <button class="camera-switch-btn" id="switchCameraBtn">
          <i class="fas fa-sync-alt"></i> Switch
        </button>
        
        <button class="camera-close-btn" id="closeLiveCameraBtn">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
      
      <canvas id="captureCanvas" style="display: none;"></canvas>
    </div>
  `;

  document.body.appendChild(modal);

  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('captureCanvas');
  const captureBtn = document.getElementById('capturePhotoBtn');
  const switchBtn = document.getElementById('switchCameraBtn');
  const closeBtn = document.getElementById('closeLiveCameraBtn');
  
  let stream = null;
  let currentFacingMode = 'environment';

  // Start camera function
  async function startCamera(facingMode) {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false 
      });
      
      video.srcObject = stream;
      console.log('✅ Camera started:', facingMode);
    } catch (error) {
      console.error('❌ Camera access error:', error);
      alert('Unable to access camera. Please check permissions and try again.');
      modal.remove();
    }
  }

  startCamera(currentFacingMode);

  // Capture photo
  captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
      const timestamp = Date.now();
      const file = new File([blob], `camera_photo_${timestamp}.jpg`, { type: 'image/jpeg' });
      
      selectedMedia.push(file);
      updateMediaPreviews();
      
      console.log('📸 Photo captured:', file.name);
      
      captureBtn.innerHTML = '<i class="fas fa-check"></i> Captured!';
      captureBtn.style.background = '#38ef7d';
      
      setTimeout(() => {
        captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Photo';
        captureBtn.style.background = '#800000';
      }, 1000);
      
    }, 'image/jpeg', 0.9);
  });

  // Switch camera
  switchBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(currentFacingMode);
    
    switchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Switching...';
    setTimeout(() => {
      switchBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Switch';
    }, 500);
  });

  // Close camera
  closeBtn.addEventListener('click', () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      console.log('🛑 Camera stopped');
    }
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      modal.remove();
    }
  });
}

// ============================================
// HANDLE MEDIA SELECTION
// ============================================

function handleMediaSelection(files) {
  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      selectedMedia.push(file);
    }
  });

  console.log(`📸 Total media selected: ${selectedMedia.length}`);
  updateMediaPreviews();
}

// ============================================
// UPDATE MEDIA PREVIEWS
// ============================================

function updateMediaPreviews() {
  const container = document.getElementById('mediaPreviewContainer');
  container.innerHTML = '';

  selectedMedia.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'media-preview-wrapper';

    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
      const video = document.createElement('video');
      video.controls = false;
      video.muted = true;

      const reader = new FileReader();
      reader.onload = (e) => {
        video.src = e.target.result;
      };
      reader.readAsDataURL(file);

      const playIcon = document.createElement('div');
      playIcon.className = 'media-preview-icon';
      playIcon.innerHTML = '<i class="fas fa-play-circle"></i>';

      wrapper.appendChild(video);
      wrapper.appendChild(playIcon);
    } else {
      const img = document.createElement('img');

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);

      wrapper.appendChild(img);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'media-remove-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';

    removeBtn.addEventListener('click', () => {
      selectedMedia.splice(index, 1);
      updateMediaPreviews();
    });

    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
  });

  if (selectedMedia.length > 0) {
    const images = selectedMedia.filter(f => f.type.startsWith('image/')).length;
    const videos = selectedMedia.filter(f => f.type.startsWith('video/')).length;
    
    const countBadge = document.createElement('div');
    countBadge.className = 'media-count-badge';
    countBadge.innerHTML = `
      <i class="fas fa-photo-video"></i> ${selectedMedia.length} file${selectedMedia.length > 1 ? 's' : ''} selected
      ${images > 0 ? `<span><i class="fas fa-image"></i> ${images}</span>` : ''}
      ${videos > 0 ? `<span><i class="fas fa-video"></i> ${videos}</span>` : ''}
    `;
    container.appendChild(countBadge);
  }
}

// ============================================
// CHECK SERVER CONNECTION
// ============================================

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

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error("User ID is missing. Please log in and try again.");
      }
      console.log("✅ User ID verified before sending:", userId);

      const latValue = document.getElementById("latitude").value;
      const lonValue = document.getElementById("longitude").value;

      if (!latValue || !lonValue || !gpsReady) {
        throw new Error("Location is required. Please enable GPS and wait until it's loaded.");
      }

      if (selectedMedia.length === 0) {
        throw new Error("You must attach at least one photo or video.");
      }

      const latitude = parseFloat(latValue);
      const longitude = parseFloat(lonValue);
      const description = form.querySelector('textarea[name="description"]').value || "Fire Incident";
      const fullName = localStorage.getItem('fullName') || "Unknown";

      console.log("Checking server connection...");
      const serverReachable = await checkServerConnection();
      if (!serverReachable) {
        throw new Error("Cannot connect to server. Please check your internet connection and try again.");
      }

      const formData = new FormData();
      
      formData.append('user_id', userId);
      formData.append('description', description);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('barangay', form.querySelector('input[name="barangay"]')?.value || '');
      formData.append('reporter_name', form.querySelector('input[name="reporter_name"]')?.value || fullName);
      
      const images = selectedMedia.filter(f => f.type.startsWith('image/'));
      const videos = selectedMedia.filter(f => f.type.startsWith('video/'));
      
      images.forEach((image) => {
        formData.append('photos', image);
      });
      
      videos.forEach((video) => {
        formData.append('videos', video);
      });

      console.log("📤 SENDING ALERT TO BACKEND:");
      console.log("  - User ID:", formData.get('user_id'));
      console.log("  - Reporter:", formData.get('reporter_name'));
      console.log("  - Images:", images.length);
      console.log("  - Videos:", videos.length);

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
        selectedMedia = [];
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