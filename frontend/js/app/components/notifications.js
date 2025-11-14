class Notifications {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.initialized = false;
        this.initialize();
    }

    async initialize() {
        // Wait for the notifications container to be available
        await this.waitForElement('#notificationsModal');
        this.initElements();
        this.initEventListeners();
        await this.loadNotifications();
        this.initialized = true;
    }

    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (document.querySelector(selector)) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.warn(`Element ${selector} not found after ${timeout}ms`);
                    reject(new Error(`Element ${selector} not found`));
                }
            }, 100);
        });
    }

    initElements() {
        // Main elements
        this.modal = document.getElementById('notificationsModal');
        this.notificationsList = document.getElementById('notificationsList');
        this.notificationBadge = document.getElementById('notificationBadge');
        this.notificationBtn = document.getElementById('notificationBtn');
        this.markAllReadBtn = document.getElementById('markAllReadBtn');
        this.closeBtn = document.getElementById('closeNotificationsBtn');
        this.template = document.getElementById('notificationItemTemplate');
    }

initEventListeners() {
    // Toggle modal
    if (this.notificationBtn) {
        this.notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleModal();
        });
    }

    // Mark all as read
    if (this.markAllReadBtn) {
        this.markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
    }

    // Close button
    if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.closeModal());
    }
}

toggleModal() {
    const isOpening = !this.modal.classList.contains('active');
    
    if (isOpening) {
        // Open the modal
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Mark all as read when opening
        this.markAllAsRead();
        
        // Add outside click handler after a small delay
        setTimeout(() => {
            this._handleOutsideClick = (e) => {
                const modalContent = this.modal.querySelector('.notifications-container') || 
                                   this.modal.querySelector('.modal-content') ||
                                   this.modal.querySelector('.notifications-panel');
                
                const isClickInside = modalContent && modalContent.contains(e.target);
                const isNotificationButton = this.notificationBtn && this.notificationBtn.contains(e.target);
                const isClickOnBackdrop = e.target === this.modal;
                
                // Close if clicking on backdrop OR outside modal content (but not on notification button)
                if ((isClickOnBackdrop || !isClickInside) && !isNotificationButton) {
                    this.closeModal();
                }
            };
            
            document.addEventListener('click', this._handleOutsideClick);
        }, 100);
    } else {
        this.closeModal();
    }
}

closeModal() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Remove the outside click handler
    if (this._handleOutsideClick) {
        document.removeEventListener('click', this._handleOutsideClick);
        this._handleOutsideClick = null;
    }
}

    async loadNotifications() {
        try {
            console.log('Fetching announcements from /api/announcements');
            
            // Try to get token from localStorage or sessionStorage
            let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            // If no token is found, try to get it from cookies
            if (!token) {
                const cookies = document.cookie.split(';');
                const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
                if (tokenCookie) {
                    token = tokenCookie.split('=')[1];
                }
            }
            
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            
            // Only add Authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log('Making request with headers:', headers);
            
            const response = await fetch('/api/announcements', {
                method: 'GET',
                headers: headers,
                credentials: 'include' // Important for cookies/session
            });
            
            console.log('Response status:', response.status);

            let announcements = [];
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                console.log('Response content type:', contentType);
                
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    console.log('API response data:', data);
                    
                    // Handle both array and object with data property responses
                    announcements = Array.isArray(data) ? data : (data.data || data.announcements || []);
                    console.log('Processed announcements:', announcements);
                    
                    if (announcements.length === 0) {
                        console.warn('No active announcements found in the response');
                    }
                } else {
                    console.warn('Unexpected content type:', contentType);
                    const text = await response.text();
                    console.warn('Response text:', text);
                }
            } else {
                console.warn('Failed to fetch announcements. Status:', response.status, response.statusText);
                const errorText = await response.text();
                console.warn('Error response:', errorText);
                throw new Error(`Failed to fetch announcements: ${response.status} ${response.statusText}`);
            }
            
            // Convert announcements to notification format
            this.notifications = announcements
                .filter(announcement => announcement && announcement.isActive)
                .map(announcement => ({
                    id: announcement._id || `announcement-${Math.random().toString(36).substr(2, 9)}`,
                    type: announcement.type || 'info',
                    title: announcement.title || 'Announcement',
                    message: announcement.content || announcement.message || '',
                    timestamp: announcement.updatedAt || announcement.createdAt || Date.now(),
                    read: false,
                    priority: ['high', 'moderate', 'low'].includes((announcement.priority || '').toLowerCase()) 
                        ? announcement.priority.toLowerCase() 
                        : 'moderate',
                    isAnnouncement: true
                }));
                
            // Sort by priority and timestamp (newest first)
            this.notifications.sort((a, b) => {
                // First sort by priority (high > normal > low)
                const priorityOrder = { high: 3, normal: 2, low: 1 };
                const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
                
                if (priorityDiff !== 0) return priorityDiff;
                
                // Then sort by timestamp (newest first)
                return b.timestamp - a.timestamp;
            });
            
            this.unreadCount = this.notifications.length; // All announcements are unread by default
            this.updateBadge();
            this.renderNotifications();
        } catch (error) {
            console.error('Failed to load notifications:', error);
            // Fallback to sample data if the API call fails
            this.notifications = this.getSampleNotifications();
            this.unreadCount = this.notifications.filter(n => !n.read).length;
            this.updateBadge();
            this.renderNotifications();
        }
    }

    getSampleNotifications() {
        // Sample data in case the API call fails
        return [
            {
                id: 'sample-1',
                type: 'info',
                title: 'Welcome to AloeShield!',
                message: 'Thank you for using our application. Get started by uploading your first plant image for analysis.',
                timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
                read: false,
                priority: 'high',
                isAnnouncement: true
            },
            {
                id: 'sample-2',
                type: 'maintenance',
                title: 'Scheduled Maintenance',
                message: 'We will be performing scheduled maintenance on November 15th, 2025 from 2:00 AM to 4:00 AM UTC+8.',
                timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
                read: false,
                priority: 'normal',
                isAnnouncement: true
            },
            {
                id: 'sample-3',
                type: 'update',
                title: 'New Feature Available',
                message: 'Check out our new disease prediction feature with improved accuracy!',
                timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
                read: true,
                priority: 'normal',
                isAnnouncement: true
            }
        ];
    }

    renderNotifications() {
        if (!this.notificationsList) return;

        // Clear current notifications
        this.notificationsList.innerHTML = '';

        if (this.notifications.length === 0) {
            // Show empty state
            this.notificationsList.innerHTML = `
                <div class="notification-empty">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="#4CAF50" fill="none">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <line x1="9" y1="10" x2="15" y2="10"></line>
                        <line x1="9" y1="14" x2="13" y2="14"></line>
                    </svg>
                    <p>No new announcements</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp (newest first)
        const sortedNotifications = [...this.notifications].sort((a, b) => b.timestamp - a.timestamp);

        // Add each notification
        sortedNotifications.forEach(notification => {
            const notificationEl = this.createNotificationElement(notification);
            this.notificationsList.appendChild(notificationEl);
        });
    }

    createNotificationElement(notification) {
        if (!this.template) return null;

        const clone = this.template.content.cloneNode(true);
        const item = clone.querySelector('.notification-item');
        const messageEl = clone.querySelector('.notification-message');
        const timeEl = clone.querySelector('.notification-time');
        const iconEl = clone.querySelector('.notification-icon svg');
        const dismissBtn = clone.querySelector('.notification-dismiss');
        const titleEl = document.createElement('div');
        titleEl.className = 'notification-title';
        titleEl.textContent = notification.title;
        
        // Insert title before message
        messageEl.parentNode.insertBefore(titleEl, messageEl);

        // Set notification data
        item.dataset.id = notification.id;
        messageEl.textContent = notification.message;
        timeEl.textContent = this.formatTimeAgo(notification.timestamp);
        
        // Add priority class for styling
        if (notification.priority) {
            item.classList.add(`priority-${notification.priority}`);
        }
        
        // Add announcement badge if it's an announcement
        if (notification.isAnnouncement) {
            const badge = document.createElement('span');
            badge.className = 'announcement-badge';
            badge.textContent = 'Announcement';
            titleEl.appendChild(badge);
        }

        // Set icon based on notification type
        this.setNotificationIcon(iconEl, notification.type);

        // Add click handler to dismiss notification
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissNotification(notification.id);
            });
        }

        // Mark as read when clicked
        item.addEventListener('click', () => {
            this.markAsRead(notification.id);
        });

        // Add unread class if notification is unread
        if (!notification.read) {
            item.classList.add('unread');
        }

        return clone;
    }

    formatTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        if (isNaN(date.getTime())) return 'Some time ago';
        
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'Just now';
    }

    handleNotificationClick(notification) {
        // Mark as read
        this.markAsRead(notification.id);
        
        // Handle the notification click (e.g., navigate to a page)
        console.log('Notification clicked:', notification);
        
        // Close the modal
        this.closeModal();
    }

    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount--;
            this.updateBadge();
            this.renderNotifications();
        }
    }
    
    /**
     * Sets the appropriate icon for a notification based on its type
     * @param {HTMLElement} iconEl - The icon element to update
     * @param {string} type - The type of notification
     */
    setNotificationIcon(iconEl, type = 'info') {
        if (!iconEl) return;
        
        // Clear existing content
        iconEl.innerHTML = '';
        
        // Set icon based on type
        let iconPath = '';
        switch(type.toLowerCase()) {
            case 'success':
                iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
                break;
            case 'warning':
                iconPath = 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';
                break;
            case 'error':
                iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
                break;
            case 'info':
            default:
                iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
        }
        
        // Create and append the SVG icon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        svg.style.width = '20px';
        svg.style.height = '20px';
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', iconPath);
        svg.appendChild(path);
        
        // Set color based on type
        switch(type.toLowerCase()) {
            case 'success':
                svg.style.color = '#4CAF50'; // Green
                break;
            case 'warning':
                svg.style.color = '#FFC107'; // Amber
                break;
            case 'error':
                svg.style.color = '#F44336'; // Red
                break;
            case 'info':
            default:
                svg.style.color = '#2196F3'; // Blue
        }
        
        iconEl.appendChild(svg);
    }

    markAllAsRead() {
        if (this.unreadCount === 0) return;
        
        // Update local state
        this.notifications.forEach(notification => {
            if (!notification.read) {
                notification.read = true;
            }
        });
        
        this.unreadCount = 0;
        this.updateBadge();
        
        // In a real app, you would update the server
        // await fetch('/api/notifications/mark-all-read', { method: 'POST' });
        
        // Update the UI
        document.querySelectorAll('.notification-item.unread').forEach(el => {
            el.classList.remove('unread');
        });
    }

    dismissNotification(notificationId) {
        // Remove from local state
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
        // In a real app, you would update the server
        // await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
        
        // Update the UI
        const notificationEl = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationEl) {
            notificationEl.classList.add('dismissed');
            setTimeout(() => {
                notificationEl.remove();
                
                // If no notifications left, show empty state
                if (this.notificationsList.children.length === 0) {
                    this.renderNotifications();
                }
            }, 300);
        }
    }

    updateBadge() {
        if (!this.notificationBadge) return;
        
        if (this.unreadCount > 0) {
            this.notificationBadge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
            this.notificationBadge.style.display = 'flex';
        } else {
            this.notificationBadge.style.display = 'none';
        }
    }

    // Public method to add a new notification
    addNotification(notification) {
        const newNotification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false
        };
        
        this.notifications.unshift(newNotification);
        this.unreadCount++;
        this.updateBadge();
        
        // If modal is open, prepend the new notification
        if (this.modal.classList.contains('active')) {
            const notificationEl = this.createNotificationElement(newNotification);
            notificationEl.classList.add('new');
            
            // Remove empty state if it exists
            const emptyState = this.notificationsList.querySelector('.notification-empty');
            if (emptyState) {
                this.notificationsList.innerHTML = '';
            }
            
            this.notificationsList.insertBefore(notificationEl, this.notificationsList.firstChild);
        }
        
        // In a real app, you would save to the server
        // await fetch('/api/notifications', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(newNotification)
        // });
    }
}

// Initialize notifications when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // The notifications-loader.js will handle the initialization
    // This is just a fallback in case the loader isn't used
    if (!window.notifications) {
        window.notifications = new Notifications();
    }
});
