// Load reports from localStorage (saved by alert.js)
let allReports = [];
let currentFilter = 'all';
const API_BASE = "https://backend-3-hqil.onrender.com";

// Get address from coordinates using reverse geocoding (optional)
async function getAddressFromCoordinates(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    const address = data.address || {};
    
    const addressParts = [];
    
    if (address.village) {
      addressParts.push(address.village);
    } else if (address.suburb) {
      addressParts.push(address.suburb);
    }
    
    if (address.city) {
      addressParts.push(address.city);
    } else if (address.town) {
      addressParts.push(address.town);
    }
    
    if (address.state) {
      addressParts.push(address.state);
    }
    
    if (addressParts.length > 0) {
      return addressParts.join(", ");
    }
    
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    console.log("Could not get address, using coordinates");
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

// Convert ISO timestamp to readable format
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Load alerts from backend and merge with localStorage
async function loadAlertsFromBackend() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.warn('No user ID found');
      loadAlertsFromStorage(); // Fallback to localStorage
      return;
    }

    const response = await fetch(`${API_BASE}/get_user_alerts/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch alerts from backend');
    }

    const data = await response.json();
    
    if (data.alerts && Array.isArray(data.alerts)) {
      allReports = data.alerts.map(alert => {
        // Determine status based on admin actions
        let status = 'pending';
        if (alert.resolved_at) {
          status = 'resolved';
        } else if (alert.admin_response) {
          status = 'received';
        }

        return {
          id: alert.id,
          description: alert.description || 'Fire Incident',
          location: { lat: parseFloat(alert.latitude), lng: parseFloat(alert.longitude) },
          address: `${alert.latitude}, ${alert.longitude}`,
          timestamp: formatTimestamp(alert.timestamp),
          status: status,
          photo: alert.photo_url || null,
          video: alert.video_url || null,
          userName: alert.reporter_name || 'Unknown User',
          barangay: alert.barangay || 'Unknown',
          adminResponse: alert.admin_response || null,
          respondedAt: alert.responded_at ? formatTimestamp(alert.responded_at) : null,
          resolvedAt: alert.resolved_at ? formatTimestamp(alert.resolved_at) : null,
          resolveTime: alert.resolve_time || null,
          rawAlert: alert
        };
      });

      // Reverse to show newest first
      allReports.reverse();
      
      console.log("Loaded reports from backend:", allReports);
    }
  } catch (error) {
    console.error("Error loading alerts from backend:", error);
    loadAlertsFromStorage(); // Fallback to localStorage
  }
}

// Load alerts from localStorage (fallback)
function loadAlertsFromStorage() {
  try {
    const alertList = JSON.parse(localStorage.getItem("alertList")) || [];
    allReports = alertList.map(alert => {
      const receivedAlerts = JSON.parse(localStorage.getItem("receivedAlerts")) || [];
      const isReceived = receivedAlerts.includes(alert.id);

      return {
        id: alert.id,
        description: alert.description || 'Fire Incident',
        location: { lat: parseFloat(alert.latitude), lng: parseFloat(alert.longitude) },
        address: `${alert.latitude}, ${alert.longitude}`,
        timestamp: formatTimestamp(alert.timestamp),
        status: isReceived ? 'received' : 'pending',
        photo: alert.mediaType === 'image' ? alert.media : null,
        video: alert.mediaType === 'video' ? alert.media : null,
        userName: alert.user?.name || 'Unknown User',
        rawAlert: alert
      };
    });

    allReports.reverse();
    
    console.log("Loaded reports from localStorage:", allReports);
  } catch (error) {
    console.error("Error loading alerts from storage:", error);
    allReports = [];
  }
}

// Update address for reports
async function updateAddresses() {
  for (let report of allReports) {
    if (report.location) {
      report.address = await getAddressFromCoordinates(report.location.lat, report.location.lng);
    }
  }
  loadReports();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadAlertsFromBackend(); // Try backend first
  loadReports();
  updateAddresses();
  setupFilterButtons();
  setupModalClose();
  startUpdatePoller();
});

// Load and display reports
function loadReports() {
  const reportsList = document.getElementById('reportsList');
  const noReports = document.getElementById('noReports');

  let filteredReports = allReports;

  if (currentFilter !== 'all') {
    filteredReports = allReports.filter(report => report.status === currentFilter);
  }

  if (filteredReports.length === 0) {
    reportsList.style.display = 'none';
    noReports.style.display = 'block';
  } else {
    reportsList.style.display = 'flex';
    noReports.style.display = 'none';
    reportsList.innerHTML = filteredReports.map(report => createReportCard(report)).join('');

    document.querySelectorAll('.report-card').forEach((card, index) => {
      card.addEventListener('click', () => openModal(filteredReports[index]));
    });
  }
}

// Create report card HTML
function createReportCard(report) {
  let statusClass, statusText;
  
  if (report.status === 'resolved') {
    statusClass = 'status-resolved';
    statusText = '✅ Resolved';
  } else if (report.status === 'received') {
    statusClass = 'status-received';
    statusText = '✓ Received';
  } else {
    statusClass = 'status-pending';
    statusText = '⏳ Pending';
  }
  
  const mediaIndicators = getMediaIndicators(report);

  return `
    <div class="report-card">
      <div class="report-header">
        <div class="report-id">#${report.id}</div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="report-date">${report.timestamp}</div>
      <div class="report-description">${report.description}</div>
      <div class="report-location">
        📍 ${report.address}
      </div>
      ${report.adminResponse ? `<div class="admin-response-preview">💬 Admin responded</div>` : ''}
      ${report.resolveTime ? `<div class="resolve-time-preview">🕒 Resolved at ${report.resolveTime}</div>` : ''}
      ${mediaIndicators ? `<div class="report-media">${mediaIndicators}</div>` : ''}
    </div>
  `;
}

// Get media indicators
function getMediaIndicators(report) {
  let indicators = '';
  if (report.photo) {
    indicators += '<span class="media-indicator">📷 Photo</span>';
  }
  if (report.video) {
    indicators += '<span class="media-indicator">🎥 Video</span>';
  }
  return indicators;
}

// Open modal with report details
function openModal(report) {
  const modal = document.getElementById('reportModal');
  const modalBody = document.getElementById('modalBody');

  let statusClass, statusText;
  
  if (report.status === 'resolved') {
    statusClass = 'status-resolved';
    statusText = '✅ Resolved';
  } else if (report.status === 'received') {
    statusClass = 'status-received';
    statusText = '✓ Received';
  } else {
    statusClass = 'status-pending';
    statusText = '⏳ Pending';
  }

  let mediaHtml = '';
  if (report.photo || report.video) {
    mediaHtml = `
      <div class="modal-detail-row">
        <div class="modal-detail-label">Media Attached</div>
        <div class="media-gallery">
          ${report.photo ? `<img src="${report.photo}" alt="Report photo" class="media-item" onclick="window.open('${report.photo}', '_blank')">` : ''}
          ${report.video ? `<video src="${report.video}" controls class="media-item"></video>` : ''}
        </div>
      </div>
    `;
  }

  // Admin response section
  let adminResponseHtml = '';
  if (report.adminResponse) {
    adminResponseHtml = `
      <div class="modal-detail-row">
        <div class="modal-detail-label">Admin Response</div>
        <div class="admin-response-box">
          <div class="response-icon">💬</div>
          <div class="response-content">
            <p>${report.adminResponse}</p>
            ${report.respondedAt ? `<small>Responded on: ${report.respondedAt}</small>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Resolution info section
  let resolutionHtml = '';
  if (report.status === 'resolved') {
    resolutionHtml = `
      <div class="modal-detail-row">
        <div class="modal-detail-label">Resolution Information</div>
        <div class="resolution-box">
          <div class="resolution-icon">✅</div>
          <div class="resolution-content">
            ${report.resolveTime ? `<p><strong>Fire Extinguished At:</strong> ${report.resolveTime}</p>` : ''}
            ${report.resolvedAt ? `<p><strong>Marked Resolved On:</strong> ${report.resolvedAt}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-detail-row">
      <div class="modal-detail-label">Report ID</div>
      <div class="modal-detail-value">#${report.id}</div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Status</div>
      <div class="modal-detail-value">
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Date & Time Reported</div>
      <div class="modal-detail-value">${report.timestamp}</div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Submitted By</div>
      <div class="modal-detail-value">${report.userName}</div>
    </div>

    ${report.barangay ? `
    <div class="modal-detail-row">
      <div class="modal-detail-label">Barangay</div>
      <div class="modal-detail-value">${report.barangay}</div>
    </div>
    ` : ''}

    <div class="modal-detail-row">
      <div class="modal-detail-label">Location</div>
      <div class="modal-detail-value">${report.address}</div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Coordinates</div>
      <div class="modal-detail-value">Latitude: ${report.location.lat.toFixed(4)}, Longitude: ${report.location.lng.toFixed(4)}</div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Description</div>
      <div class="modal-detail-value">${report.description || 'No description provided'}</div>
    </div>

    ${adminResponseHtml}
    ${resolutionHtml}
    ${mediaHtml}
  `;

  modal.classList.add('active');
}

// Close modal
function closeModal() {
  const modal = document.getElementById('reportModal');
  modal.classList.remove('active');
}

// Setup filter buttons
function setupFilterButtons() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      filterButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      loadReports();
    });
  });
}

// Setup modal close on outside click
function setupModalClose() {
  const modal = document.getElementById('reportModal');
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Check for report updates from backend
async function checkForUpdates() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    await loadAlertsFromBackend();
  } catch (error) {
    console.error("Error checking for updates:", error);
  }
}

// Periodically check for updates (every 30 seconds)
function startUpdatePoller() {
  setInterval(checkForUpdates, 30000);
}