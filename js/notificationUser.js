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
// FETCH NOTIFICATIONS
// ========================================

async function fetchNotifications(userId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/api/notifications/?user_id=${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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
    const response = await fetch(`${NOTIFICATION_API_BASE}/api/notifications/count?user_id=${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.unread_count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

// ========================================
// MARK AS READ
// ========================================

async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/api/notifications/${notificationId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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
    const response = await fetch(`${NOTIFICATION_API_BASE}/api/notifications/mark-all-read`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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
  const badgeEl = document.querySelector('.notification-badge');
  if (badgeEl) {
    badgeEl.textContent = count;
    badgeEl.style.display = count > 0 ? 'block' : 'none';
  }
}

// ========================================
// RENDER NOTIFICATIONS
// ========================================

function renderNotifications(notifications) {
  const container = document.getElementById('notifications-container');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6c757d;">
        <i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
        <h3 style="margin: 0;">No Notifications</h3>
        <p style="margin: 10px 0 0 0;">You're all caught up!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  
  notifications.forEach(notif => {
    const notifEl = document.createElement('div');
    notifEl.className = `notification-item ${notif.is_read ? 'read' : 'unread'}`;
    notifEl.dataset.id = notif.id;
    
    const typeIcon = getNotificationIcon(notif.type);
    const typeColor = getNotificationColor(notif.type);
    
    notifEl.innerHTML = `
      <div class="notification-icon" style="background-color: ${typeColor};">
        <i class="${typeIcon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-header">
          <h4 class="notification-title">${notif.title}</h4>
          ${!notif.is_read ? '<span class="unread-dot"></span>' : ''}
        </div>
        <p class="notification-message">${notif.message}</p>
        <span class="notification-time">${formatTime(notif.created_at)}</span>
      </div>
      <div class="notification-actions">
        ${!notif.is_read ? `<button class="mark-read-btn" onclick="handleMarkAsRead('${notif.id}')">
          <i class="fas fa-check"></i>
        </button>` : ''}
        <button class="delete-btn" onclick="handleDeleteNotification('${notif.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    // Click to mark as read
    if (!notif.is_read) {
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
    'info': 'fas fa-info-circle',
    'success': 'fas fa-check-circle',
    'warning': 'fas fa-exclamation-triangle',
    'error': 'fas fa-times-circle'
  };
  return icons[type] || icons['info'];
}

function getNotificationColor(type) {
  const colors = {
    'info': '#3b82f6',
    'success': '#10b981',
    'warning': '#f59e0b',
    'error': '#ef4444'
  };
  return colors[type] || colors['info'];
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ========================================
// EVENT HANDLERS (Global Scope)
// ========================================

window.handleMarkAsRead = async (notificationId) => {
  try {
    await markNotificationAsRead(notificationId);
    const notifEl = document.querySelector(`[data-id="${notificationId}"]`);
    if (notifEl) {
      notifEl.classList.remove('unread');
      notifEl.classList.add('read');
      const unreadDot = notifEl.querySelector('.unread-dot');
      if (unreadDot) unreadDot.remove();
      const markReadBtn = notifEl.querySelector('.mark-read-btn');
      if (markReadBtn) markReadBtn.remove();
    }
    
    // Update badge
    const userId = getCurrentUserId();
    if (userId) {
      const count = await getUnreadNotificationCount(userId);
      updateNotificationBadge(count);
    }
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

window.handleDeleteNotification = async (notificationId) => {
  try {
    await deleteNotification(notificationId);
    const notifEl = document.querySelector(`[data-id="${notificationId}"]`);
    if (notifEl) notifEl.remove();
    
    // Update badge
    const userId = getCurrentUserId();
    if (userId) {
      const count = await getUnreadNotificationCount(userId);
      updateNotificationBadge(count);
    }
    
    // Check if container is empty
    const container = document.getElementById('notifications-container');
    if (container && container.children.length === 0) {
      renderNotifications([]);
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
    
    // Update UI
    document.querySelectorAll('.notification-item.unread').forEach(el => {
      el.classList.remove('unread');
      el.classList.add('read');
      const unreadDot = el.querySelector('.unread-dot');
      if (unreadDot) unreadDot.remove();
      const markReadBtn = el.querySelector('.mark-read-btn');
      if (markReadBtn) markReadBtn.remove();
    });
    
    updateNotificationBadge(0);
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
};

// ========================================
// AUTO-CHECK FOR NEW NOTIFICATIONS
// ========================================

function startNotificationPolling(userId, intervalMs = 10000) {
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
  }
}

async function checkForNewNotifications(userId) {
  try {
    const count = await getUnreadNotificationCount(userId);
    updateNotificationBadge(count);
    
    // Show browser notification for new alerts
    const notifications = await fetchNotifications(userId);
    const unreadNotifs = notifications.filter(n => !n.is_read);
    
    if (unreadNotifs.length > 0 && lastCheckedTimestamp) {
      const newNotifs = unreadNotifs.filter(n => 
        new Date(n.created_at) > lastCheckedTimestamp
      );
      
      newNotifs.forEach(notif => {
        showBrowserNotification(notif.title, notif.message);
      });
    }
    
    lastCheckedTimestamp = new Date();
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// ========================================
// BROWSER NOTIFICATIONS
// ========================================

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/icon.png',
      badge: '/badge.png'
    });
  }
}

// ========================================
// UTILITY FUNCTION
// ========================================

function getCurrentUserId() {
  // Implement based on your auth system
  // Example: return sessionStorage.getItem('userId');
  return null; // Replace with actual implementation
}

// ========================================
// USAGE EXAMPLE
// ========================================


document.addEventListener('DOMContentLoaded', () => {
  const userId = getCurrentUserId();
  
  if (userId) {
    // Start polling for notifications every 10 seconds
    startNotificationPolling(userId, 10000);
    
    // Request browser notification permission
    requestNotificationPermission();
    
    // Load and display notifications
    fetchNotifications(userId).then(notifications => {
      renderNotifications(notifications);
    });
    
    // Update badge
    getUnreadNotificationCount(userId).then(count => {
      updateNotificationBadge(count);
    });
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopNotificationPolling();
  });
});
