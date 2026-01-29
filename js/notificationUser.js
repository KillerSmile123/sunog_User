// notificationUser.js - Real-time with Server-Sent Events (SSE)

const NOTIFICATION_API_BASE = 'https://backend-3-hqil.onrender.com';

// ========================================
// GLOBAL STATE
// ========================================

let eventSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout = null;
let isSSESupported = true;

// ========================================
// SSE CONNECTION
// ========================================

function connectSSE(userId) {
  // Close existing connection
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  console.log(`🔌 Connecting to SSE for user ${userId}...`);
  
  try {
    eventSource = new EventSource(`${NOTIFICATION_API_BASE}/sse/notifications/${userId}`);

    eventSource.onopen = () => {
      console.log('✅ SSE connected - notifications will arrive instantly!');
      reconnectAttempts = 0;
      
      // Initial fetch
      fetchNotifications(userId).then(notifications => {
        renderNotificationsInPanel(notifications);
        const unreadCount = notifications.filter(n => !n.read).length;
        updateNotificationBadge(unreadCount);
      });
    };

    eventSource.onmessage = (event) => {
      console.log('📨 Real-time notification received:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        // Ignore heartbeat and connection messages
        if (data.type === 'connected') {
          console.log('🎉 Connected to notification stream');
          return;
        }
        
        handleNewNotification(data, userId);
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE error:', error);
      console.log('EventSource readyState:', eventSource?.readyState);
      
      if (eventSource?.readyState === 2) {
        console.log('Connection closed, attempting to reconnect...');
        eventSource.close();
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`🔄 Reconnecting in ${delay/1000}s... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeout = setTimeout(() => {
            connectSSE(userId);
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached - falling back to polling');
          isSSESupported = false;
          fallbackToPolling(userId);
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to create SSE connection:', error);
    isSSESupported = false;
    fallbackToPolling(userId);
  }
}

function disconnectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

// ========================================
// FALLBACK POLLING (if SSE fails)
// ========================================

let pollingInterval = null;

function fallbackToPolling(userId) {
  console.log('📡 Falling back to polling mode...');
  
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  fetchNotifications(userId).then(notifications => {
    renderNotificationsInPanel(notifications);
    const unreadCount = notifications.filter(n => !n.read).length;
    updateNotificationBadge(unreadCount);
  });
  
  pollingInterval = setInterval(async () => {
    try {
      const notifications = await fetchNotifications(userId);
      const unreadCount = notifications.filter(n => !n.read).length;
      updateNotificationBadge(unreadCount);
      
      const panel = document.getElementById('notification-panel');
      if (panel && panel.style.display === 'block') {
        renderNotificationsInPanel(notifications);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000);
}

// ========================================
// HANDLE NEW NOTIFICATION (Real-time)
// ========================================

async function handleNewNotification(notification, userId) {
  console.log('🔔 Processing new real-time notification:', notification);
  
  // Refresh notifications list
  const notifications = await fetchNotifications(userId);
  const unreadCount = notifications.filter(n => !n.read).length;
  updateNotificationBadge(unreadCount);
  
  // Update panel if visible
  const panel = document.getElementById('notification-panel');
  if (panel && panel.style.display === 'block') {
    renderNotificationsInPanel(notifications);
  }
  
  // Show browser notification if permission granted
  if (Notification.permission === 'granted') {
    showBrowserNotification(notification);
  }
  
  // Play notification sound
  playNotificationSound();
  
  // Show toast notification
  showToastNotification(notification);
}

// ========================================
// BROWSER NOTIFICATIONS
// ========================================

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('🔔 Notification permission:', permission);
      if (permission === 'granted') {
        console.log('✅ Browser notifications enabled!');
      }
    });
  }
}

function showBrowserNotification(notification) {
  try {
    const icon = getNotificationIcon(notification.type);
    
    const browserNotif = new Notification(notification.title, {
      body: notification.message,
      tag: notification.id,
      requireInteraction: false,
      silent: false
    });

    browserNotif.onclick = () => {
      window.focus();
      const panel = document.getElementById('notification-panel');
      if (panel) {
        panel.style.display = 'block';
      }
      browserNotif.close();
    };
  } catch (error) {
    console.error('Browser notification error:', error);
  }
}

// ========================================
// TOAST NOTIFICATION (In-app popup)
// ========================================

function showToastNotification(notification) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <div class="toast-icon">${getNotificationIcon(notification.type)}</div>
    <div class="toast-content">
      <strong>${notification.title}</strong>
      <p>${notification.message}</p>
      ${notification.resolve_time ? `<small style="color: #666;">🕒 ${notification.resolve_time}</small>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .notification-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .toast-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      .toast-content {
        flex: 1;
      }
      .toast-content strong {
        display: block;
        margin-bottom: 4px;
        color: #333;
      }
      .toast-content p {
        margin: 0;
        font-size: 14px;
        color: #666;
      }
      .toast-content small {
        display: block;
        margin-top: 4px;
        font-size: 12px;
      }
      .toast-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }
      .toast-close:hover {
        color: #333;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ========================================
// NOTIFICATION SOUND
// ========================================

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZRQ0PV6vn77BdGAg+ltryxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzyn0vBSR4yPDajj0JE1+16+yrWxgIO5jc88p1LAUogMrz2Ys8CB1uxe/mnEsOElat6O+zYhoGPJPY88p3LgUjd8jw2o09CRRftOvrrVsYCDyX2/PKdSwFKH/J89iLPAgdbb/v5ptKDhJWrej');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Could not play sound:', e));
  } catch (error) {
    console.error('Sound play error:', error);
  }
}

// ========================================
// API FUNCTIONS
// ========================================

async function fetchNotifications(userId) {
  try {
    console.log(`📡 Fetching notifications for user ${userId}...`);
    
    const response = await fetch(`${NOTIFICATION_API_BASE}/get_user_notifications/${userId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📡 Fetched data:', data);
    console.log('📡 Notifications array:', data.notifications);
    
    return data.notifications || [];
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
}

async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/mark_notification_read/${notificationId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
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

async function markAllNotificationsAsRead(userId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
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

async function deleteNotification(notificationId) {
  try {
    const response = await fetch(`${NOTIFICATION_API_BASE}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
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
// UI FUNCTIONS
// ========================================

function updateNotificationBadge(count) {
  const badgeEl = document.getElementById('notification-badge');
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count;
      badgeEl.classList.add('active');
    } else {
      badgeEl.classList.remove('active');
    }
  }
}

function renderNotificationsInPanel(notifications) {
  const container = document.getElementById('notification-list');
  
  console.log('🎨 Rendering notifications:', {
    containerExists: !!container,
    notificationCount: notifications?.length || 0,
    notifications: notifications
  });
  
  if (!container) {
    console.error('❌ notification-list container not found in DOM!');
    return;
  }

  if (!notifications || notifications.length === 0) {
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
  const sorted = notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  console.log('📋 Rendering', sorted.length, 'notifications');

  sorted.forEach(notif => {
    const notifEl = document.createElement('div');
    notifEl.className = `notification-item ${!notif.read ? 'unread' : ''}`;
    notifEl.dataset.id = notif.id;
    
    const typeIcon = getNotificationIcon(notif.type);
    const typeClass = getNotificationTypeClass(notif.type);
    const timeAgo = formatTime(new Date(notif.timestamp));
    
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
    
    if (!notif.read) {
      notifEl.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-actions')) {
          handleMarkAsRead(notif.id);
        }
      });
    }
    
    container.appendChild(notifEl);
  });
  
  console.log('✅ Notifications rendered successfully');
}

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

function getCurrentUserId() {
  return localStorage.getItem('userId');
}

// ========================================
// EVENT HANDLERS
// ========================================

window.handleMarkAsRead = async (notificationId, event) => {
  if (event) event.stopPropagation();
  
  try {
    await markNotificationAsRead(notificationId);
    const userId = getCurrentUserId();
    if (userId) {
      const notifications = await fetchNotifications(userId);
      renderNotificationsInPanel(notifications);
      updateNotificationBadge(notifications.filter(n => !n.read).length);
    }
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

window.handleDeleteNotification = async (notificationId, event) => {
  if (event) event.stopPropagation();
  
  try {
    await deleteNotification(notificationId);
    const userId = getCurrentUserId();
    if (userId) {
      const notifications = await fetchNotifications(userId);
      renderNotificationsInPanel(notifications);
      updateNotificationBadge(notifications.filter(n => !n.read).length);
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
    const notifications = await fetchNotifications(userId);
    renderNotificationsInPanel(notifications);
    updateNotificationBadge(0);
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
};

window.testNotifications = async function() {
  const userId = getCurrentUserId();
  console.log('🧪 Testing notifications for user:', userId);
  
  const notifications = await fetchNotifications(userId);
  console.log('🧪 Fetched notifications:', notifications);
  
  renderNotificationsInPanel(notifications);
  
  const panel = document.getElementById('notification-panel');
  if (panel) {
    panel.style.display = 'block';
  }
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  const userId = getCurrentUserId();
  
  console.log('🚀 DOM loaded, userId:', userId);
  
  // Verify notification panel exists
  const panel = document.getElementById('notification-panel');
  const list = document.getElementById('notification-list');
  
  console.log('🔍 DOM elements:', {
    panelExists: !!panel,
    listExists: !!list
  });
  
  if (userId) {
    console.log(`✅ Initializing notifications for user ${userId}`);
    
    requestNotificationPermission();
    
    // Initial fetch before SSE connection
    fetchNotifications(userId).then(notifications => {
      console.log('📋 Initial fetch completed:', notifications.length, 'notifications');
      renderNotificationsInPanel(notifications);
      const unreadCount = notifications.filter(n => !n.read).length;
      updateNotificationBadge(unreadCount);
    });
    
    if (isSSESupported) {
      console.log('📡 Attempting SSE connection...');
      connectSSE(userId);
    } else {
      console.log('📡 SSE not supported, using polling...');
      fallbackToPolling(userId);
    }
    
    console.log('🎉 Notification system initialized!');
  } else {
    console.warn('❌ No user ID found in localStorage');
  }
  
  window.addEventListener('beforeunload', () => {
    disconnectSSE();
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });
});