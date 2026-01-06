// ✅ DEFINE API_BASE AT THE TOP
const API_BASE = "https://backend-3-hqil.onrender.com";

// -------------------------------
// 1. Map Initialization at Oroquieta City
// -------------------------------
const oroquietaCoords = [8.5920, 123.8420];

var map = L.map('map', { zoomControl: false }).setView(oroquietaCoords, 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// -------------------------------
// 2. User Marker
// -------------------------------
var userMarker = L.marker(oroquietaCoords)
    .addTo(map)
    .bindTooltip("You are here", { permanent: true, direction: "top" })
    .openTooltip();

// Update marker if geolocation is available
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            userMarker.setLatLng([lat, lng]);
            map.setView([lat, lng], 15); // zoom closer to user
        },
        function(err) {
            console.warn("Geolocation not available or denied:", err);
        },
        { enableHighAccuracy: true }
    );
}

// -------------------------------
// 3. Dropdown Toggle (Burger Menu)
// -------------------------------
const burger = document.getElementById('burger');
const dropdown = document.getElementById('dropdown');

burger.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
});

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// -------------------------------
// 4. Notification System
// -------------------------------
const notificationContainer = document.getElementById('notification-container');
let displayedNotifications = new Set(); // Track shown notifications

// Create notification element
function createNotification(notification) {
    const div = document.createElement('div');
    div.className = 'notification';
    
    // Set notification style based on type
    let icon = '🔔';
    let bgColor = 'rgba(255,255,255,0.95)';
    
    if (notification.type === 'response') {
        icon = '💬';
        bgColor = 'rgba(33, 150, 243, 0.95)';
        div.style.color = 'white';
    } else if (notification.type === 'resolved') {
        icon = '✅';
        bgColor = 'rgba(76, 175, 80, 0.95)';
        div.style.color = 'white';
    } else if (notification.type === 'deleted') {
        icon = '🗑️';
        bgColor = 'rgba(244, 67, 54, 0.95)';
        div.style.color = 'white';
    }
    
    div.style.backgroundColor = bgColor;
    
    div.innerHTML = `
        <div style="display: flex; align-items: start; gap: 10px;">
            <div style="font-size: 24px;">${icon}</div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 5px 0; font-size: 16px;">${notification.title}</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.4;">${notification.message}</p>
                ${notification.resolveTime ? `<p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">🕒 Resolved at: ${notification.resolveTime}</p>` : ''}
                <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.8;">${new Date(notification.timestamp).toLocaleString()}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; font-size: 20px; cursor: pointer; opacity: 0.7; padding: 0; width: 24px; height: 24px;">&times;</button>
        </div>
    `;
    
    return div;
}

// Show notification
function showNotification(notification) {
    // Prevent duplicate notifications
    const notifKey = `${notification.type}-${notification.alertId}-${notification.timestamp}`;
    if (displayedNotifications.has(notifKey)) {
        return;
    }
    displayedNotifications.add(notifKey);
    
    const notifElement = createNotification(notification);
    notificationContainer.appendChild(notifElement);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        notifElement.style.opacity = '0';
        notifElement.style.transform = 'translateX(100px)';
        setTimeout(() => notifElement.remove(), 300);
    }, 10000);
}

// Check for new notifications from backend
async function checkNotifications() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.log('No user ID found, skipping notification check');
            return;
        }
        
        console.log(`🔔 Checking notifications for user: ${userId}`);
        
        const response = await fetch(`${API_BASE}/get_user_notifications/${userId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch notifications: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.notifications && Array.isArray(data.notifications)) {
            console.log(`📬 Found ${data.notifications.length} notifications`);
            
            // Sort by timestamp, newest first
            const sortedNotifications = data.notifications.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            // Show only unread notifications
            sortedNotifications.forEach(notification => {
                if (!notification.read) {
                    console.log(`✅ Showing notification: ${notification.title}`);
                    showNotification(notification);
                    // Mark as read
                    markNotificationAsRead(notification.id);
                }
            });
            
            // Store in localStorage for view report page
            localStorage.setItem('userNotifications', JSON.stringify(data.notifications));
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await fetch(`${API_BASE}/mark_notification_read/${notificationId}`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Initialize notification system
function initializeNotifications() {
    // Check for notifications immediately
    checkNotifications();
    
    // Then check every 15 seconds for new notifications
    setInterval(checkNotifications, 15000);
    
    // Also check when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkNotifications();
        }
    });
}

// -------------------------------
// 5. Initialize on Page Load
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Get userId from localStorage (should be set during login)
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        console.warn('No user ID found. Some features may not work properly.');
        // You might want to redirect to login page here
        // window.location.href = 'login.html';
    }
    
    // Start notification system
    initializeNotifications();
    
    console.log('✅ Dashboard initialized with real-time notifications');
});