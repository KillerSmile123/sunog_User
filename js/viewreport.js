// Load reports from localStorage (saved by alert.js)
let allReports = [];
let currentFilter = 'all';
const API_BASE = "https://backend-3-hqil.onrender.com"; // Same as alert.js

// Get address from coordinates using reverse geocoding (optional)
async function getAddressFromCoordinates(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    return data.address?.city || data.address?.state || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
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

// Load alerts from localStorage and convert to report format
function loadAlertsFromStorage() {
  try {
    const alertList = JSON.parse(localStorage.getItem("alertList")) || [];
    allReports = alertList.map(alert => {
      // Check if dispatcher has received it (by checking a flag in localStorage)
      const receivedAlerts = JSON.parse(localStorage.getItem("receivedAlerts")) || [];
      const isReceived = receivedAlerts.includes(alert.id);

      return {
        id: alert.id,
        description: alert.description || 'Fire Incident',
        location: { lat: parseFloat(alert.latitude), lng: parseFloat(alert.longitude) },
        address: `${alert.latitude}, ${alert.longitude}`, // Will be updated with actual address
        timestamp: formatTimestamp(alert.timestamp),
        status: isReceived ? 'received' : 'pending',
        photo: alert.mediaType === 'image' ? alert.media : null,
        video: alert.mediaType === 'video' ? alert.media : null,
        userName: alert.user?.name || 'Unknown User',
        rawAlert: alert
      };
    });

    // Reverse the array to show newest first
    allReports.reverse();
    
    console.log("Loaded reports from storage:", allReports);
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
  loadReports(); // Refresh display with updated addresses
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadAlertsFromStorage();
  loadReports();
  updateAddresses(); // Get actual addresses from coordinates
  setupFilterButtons();
  setupModalClose();
  startUpdatePoller(); // Start checking for dispatcher updates
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

    // Add click listeners to cards
    document.querySelectorAll('.report-card').forEach((card, index) => {
      card.addEventListener('click', () => openModal(filteredReports[index]));
    });
  }
}

// Create report card HTML
function createReportCard(report) {
  const statusClass = report.status === 'pending' ? 'status-pending' : 'status-received';
  const statusText = report.status === 'pending' ? '⏳ Pending' : '✓ Received';
  const mediaIndicators = getMediaIndicators(report);

  return `
    <div class="report-card">
      <div class="report-header">
        <div class="report-id">${report.id}</div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="report-date">${report.timestamp}</div>
      <div class="report-description">${report.description}</div>
      <div class="report-location">
        📍 ${report.address}
      </div>
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

  const statusClass = report.status === 'pending' ? 'status-pending' : 'status-received';
  const statusText = report.status === 'pending' ? '⏳ Pending' : '✓ Received';

  let mediaHtml = '';
  if (report.photo || report.video) {
    mediaHtml = `
      <div class="modal-detail-row">
        <div class="modal-detail-label">Media Attached</div>
        <div class="media-gallery">
          ${report.photo ? `<img src="${report.photo}" alt="Report photo" class="media-item">` : ''}
          ${report.video ? `<video src="${report.video}" controls class="media-item"></video>` : ''}
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-detail-row">
      <div class="modal-detail-label">Report ID</div>
      <div class="modal-detail-value">${report.id}</div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Status</div>
      <div class="modal-detail-value">
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Date & Time</div>
      <div class="modal-detail-value">${report.timestamp}</div>
    </div>

    <div class="modal-detail-row">
      <div class="modal-detail-label">Submitted By</div>
      <div class="modal-detail-value">${report.userName}</div>
    </div>

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
      // Remove active class from all buttons
      filterButtons.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      // Update filter and reload
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

// Get user's reports only (when you want to filter by user)
function getUserReports(userId) {
  // Filter reports by user ID if needed
  const userReports = allReports.filter(report => report.rawAlert?.user?.id === userId);
  allReports = userReports;
  loadReports();
}

// Add new report to the list (useful when coming back from alert submission)
function addReport(newReport) {
  allReports.unshift(newReport); // Add to beginning of list
  loadReports();
}

// Mark a report as received by dispatcher (call this when dispatcher confirms)
function markAsReceived(reportId) {
  const receivedAlerts = JSON.parse(localStorage.getItem("receivedAlerts")) || [];
  if (!receivedAlerts.includes(reportId)) {
    receivedAlerts.push(reportId);
    localStorage.setItem("receivedAlerts", JSON.stringify(receivedAlerts));
  }
  
  // Update the report status
  const report = allReports.find(r => r.id === reportId);
  if (report) {
    report.status = 'received';
    loadReports();
  }
}

// Check for report updates from server/API
async function checkForUpdates() {
  try {
    const userId = localStorage.getItem('userId'); // Assuming this is stored during login
    if (!userId) return;

    const response = await fetch(`${API_BASE}/check_alerts_status/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      // data should contain array of received alert IDs
      if (data.receivedAlerts && Array.isArray(data.receivedAlerts)) {
        localStorage.setItem("receivedAlerts", JSON.stringify(data.receivedAlerts));
        
        // Update local reports status
        data.receivedAlerts.forEach(alertId => {
          const report = allReports.find(r => r.id === alertId);
          if (report) {
            report.status = 'received';
          }
        });
        
        loadReports();
      }
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
  }
}

// Periodically check for dispatcher updates (every 30 seconds)
function startUpdatePoller() {
  setInterval(checkForUpdates, 30000);
}
