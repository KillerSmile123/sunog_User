// notificationUser.js
// Receive and display notifications for users

// Backend API Base URL
const NOTIFICATION_API_BASE = 'https://backend-3-hqil.onrender.com';

// ========================================
// GLOBAL STATE
// ========================================

let notificationCheckInterval = null;
let lastCheckedTimestamp = null;

// ========================================
// FETCH NOTIFICATIONS (FIXED ENDPOINT)
// ========================================

async function fetchNotifications(userId) {
  try {
    // ✅ FIXED: Use correct endpoint /get_user_notifications/<user_id>
    const response = await fetch(`${NOTIFICATION_API_BASE}/get_user_notifications/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📬 Fetched notifications:', data.notifications);
    return data.notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// ========================================
// GET UNREAD COUNT
// ========================================

async function getUnreadNotificationCount(userId) {
  try {
    // ✅ Count unread notifications from the fetched data
    const notifications = await fetchNotifications(userId);
    const unreadCount = notifications.filter(n => !n.read).length;
    console.log(`📊 Unread count: ${unreadCount}`);
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// ========================================
// MARK AS READ
// ========================================

async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/mark_notification_read/${notificationId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`✅ Notification ${notificationId} marked as read`);
    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// ========================================
// MARK ALL AS READ
// ========================================

async function markAllNotificationsAsRead(userId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`✅ All notifications marked as read`);
    return await response.json();
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}

// ========================================
// DELETE NOTIFICATION
// ========================================

async function deleteNotification(notificationId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`🗑️ Notification ${notificationId} deleted`);
    return await response.json();
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// ========================================
// UPDATE BADGE
// ========================================

function updateNotificationBadge(count) {
  // ✅ FIXED: Use correct selector from userDashboard.html
  const badgeEl = document.getElementById('notification-badge');
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count;
      badgeEl.classList.add('active');
    } else {
      badgeEl.classList.remove('active');
    }
    console.log(`🔔 Badge updated: ${count}`);
  }
}

// ========================================
// RENDER NOTIFICATIONS IN PANEL
// ========================================

function renderNotificationsInPanel(notifications) {
  // ✅ FIXED: Use correct container ID from userDashboard.html
  const container = document.getElementById('notification-list');
  if (!container) {
    console.warn('notification-list container not found');
    return;
  }

  console.log(`📋 Rendering ${notifications.length} notifications`);

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="no-notifications">
        <div class="no-notifications-icon">🔔</div>
        <p>No Notifications</p>
        <span>You're all caught up!</span>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  
  // Sort by timestamp, newest first
  const sorted = notifications.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  sorted.forEach(notif => {
    const notifEl = document.createElement('div');
    // ✅ FIXED: Use correct class names from userDashboard.html CSS
    notifEl.className = `notification-item ${!notif.read ? 'unread' : ''}`;
    notifEl.dataset.id = notif.id;
    
    const typeIcon = getNotificationIcon(notif.type);
    const typeClass = getNotificationTypeClass(notif.type);
    
    const timestamp = new Date(notif.timestamp);
    const timeAgo = formatTime(timestamp);
    
    notifEl.innerHTML = `
      <div class="notification-icon ${typeClass}">${typeIcon}</div>
      <div class="notification-content">
        <p><strong>${notif.title}</strong></p>
        <p>${notif.message}</p>
        ${notif.alertLocation ? `<p style="font-size: 12px; color: #999;">📍 ${notif.alertLocation}</p>` : ''}
        ${notif.resolveTime ? `<p style="font-size: 12px; font-weight: bold; color: #666;">🕒 Resolved at: ${notif.resolveTime}</p>` : ''}
        <div class="notification-time">🕐 ${timeAgo}</div>
      </div>
      <div class="notification-actions">
        ${!notif.read ? `<button class="action-btn-primary" onclick="handleMarkAsRead('${notif.id}', event)">Mark Read</button>` : ''}
        <button class="action-btn-secondary" onclick="handleDeleteNotification('${notif.id}', event)">Delete</button>
      </div>
    `;
    
    // Click to mark as read
    if (!notif.read) {
      notifEl.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-actions')) {
          handleMarkAsRead(notif.id);
        }
      });
    }
    
    container.appendChild(notifEl);
  });
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getNotificationIcon(type) {
  const icons = {
    'response': '💬',
    'resolved': '✅',
    'deleted': '🗑️',
    'info': '🔔',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌'
  };
  return icons[type] || icons['info'];
}

function getNotificationTypeClass(type) {
  const classes = {
    'response': 'warning',
    'resolved': 'success',
    'deleted': 'error',
    'info': '',
    'success': 'success',
    'warning': 'warning',
    'error': 'error'
  };
  return classes[type] || '';
}

function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ========================================
// GET USER ID FROM LOCALSTORAGE
// ========================================

function getCurrentUserId() {
  // ✅ FIXED: Read from localStorage
  const userId = localStorage.getItem('userId');
  console.log(`👤 Current user ID: ${userId}`);
  return userId;
}

// ========================================
// EVENT HANDLERS (Global Scope)
// ========================================

window.handleMarkAsRead = async (notificationId, event) => {
  if (event) event.stopPropagation();
  
  try {
    await markNotificationAsRead(notificationId);
    const notifEl = document.querySelector(`[data-id="${notificationId}"]`);
    if (notifEl) {
      notifEl.classList.remove('unread');
      notifEl.classList.add('read');
      
      // Reload panel to update
      const userId = getCurrentUserId();
      if (userId) {
        const notifications = await fetchNotifications(userId);
        renderNotificationsInPanel(notifications);
        const count = notifications.filter(n => !n.read).length;
        updateNotificationBadge(count);
      }
    }
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

window.handleDeleteNotification = async (notificationId, event) => {
  if (event) event.stopPropagation();
  
  try {
    await deleteNotification(notificationId);
    const notifEl = document.querySelector(`[data-id="${notificationId}"]`);
    if (notifEl) notifEl.remove();
    
    // Reload panel
    const userId = getCurrentUserId();
    if (userId) {
      const notifications = await fetchNotifications(userId);
      renderNotificationsInPanel(notifications);
      const count = notifications.filter(n => !n.read).length;
      updateNotificationBadge(count);
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};

window.handleMarkAllAsRead = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  
  try {
    await markAllNotificationsAsRead(userId);
    
    // Reload panel
    const notifications = await fetchNotifications(userId);
    renderNotificationsInPanel(notifications);
    updateNotificationBadge(0);
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
};

// ========================================
// AUTO-CHECK FOR NEW NOTIFICATIONS
// ========================================

function startNotificationPolling(userId, intervalMs = 15000) {
  console.log(`⏰ Starting notification polling for user ${userId} every ${intervalMs}ms`);
  
  // Stop any existing interval
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }

  // Check immediately
  checkForNewNotifications(userId);

  // Then check periodically
  notificationCheckInterval = setInterval(() => {
    checkForNewNotifications(userId);
  }, intervalMs);
}

function stopNotificationPolling() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
    console.log('⏹️ Stopped notification polling');
  }
}

async function checkForNewNotifications(userId) {
  try {
    const notifications = await fetchNotifications(userId);
    const unreadCount = notifications.filter(n => !n.read).length;
    
    console.log(`🔍 Checked notifications: ${unreadCount} unread`);
    
    // Update badge
    updateNotificationBadge(unreadCount);
    
    // Update panel if visible
    const panel = document.getElementById('notification-panel');
    if (panel && panel.style.display === 'block') {
      renderNotificationsInPanel(notifications);
    }
    
    lastCheckedTimestamp = new Date();
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  const userId = getCurrentUserId();
  
  if (userId) {
    console.log(`✅ Initializing notifications for user ${userId}`);
    
    // Start polling for notifications every 15 seconds
    startNotificationPolling(userId, 15000);
    
    // Load and display notifications in panel
    fetchNotifications(userId).then(notifications => {
      renderNotificationsInPanel(notifications);
      const unreadCount = notifications.filter(n => !n.read).length;
      updateNotificationBadge(unreadCount);
    });
  } else {
    console.warn('❌ No user ID found in localStorage');
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopNotificationPolling();
  });
});