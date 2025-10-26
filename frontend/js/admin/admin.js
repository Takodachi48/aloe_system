window.AdminState = {
    user: null,
    authToken: null,
    users: [],
    announcements: [],
    cloudinaryStats: null,
    maintenance: { active: false },
    apiBaseUrl: 'http://localhost:3000'
};

window.AdminAPI = {
    async getAllUsers() {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/users`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        return response.json();
    },

    async updateUserRole(userId, isAdmin) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ isAdmin })
        });

        if (!response.ok) {
            throw new Error('Failed to update user role');
        }

        return response.json();
    },

    async toggleUserStatus(userId, isActive) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ isActive })
        });

        if (!response.ok) {
            throw new Error('Failed to update user status');
        }

        return response.json();
    },

    async deleteUser(userId) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }

        return response.json();
    },

    async getAllAnnouncements() {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/announcements`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch announcements');
        }

        return response.json();
    },

    async createAnnouncement(announcementData) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/announcements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(announcementData)
        });

        if (!response.ok) {
            throw new Error('Failed to create announcement');
        }

        return response.json();
    },

    async updateAnnouncement(id, announcementData) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/announcements/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(announcementData)
        });

        if (!response.ok) {
            throw new Error('Failed to update announcement');
        }

        return response.json();
    },

    async toggleAnnouncementStatus(id, isActive) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/announcements/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ isActive })
        });

        if (!response.ok) {
            throw new Error('Failed to update announcement status');
        }

        return response.json();
    },

    async deleteAnnouncement(id) {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/announcements/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete announcement');
        }

        return response.json();
    }
};

window.CloudinaryManager = {
    async getUsageStats() {
        console.log('Fetching Cloudinary usage stats...');
        try {
            const response = await fetch(`${AdminState.apiBaseUrl}/api/cloudinary/usage`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include'
            });

            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error('Invalid response from server');
            }

            if (data.success) {
                console.log('Cloudinary stats received:', data.data);
                AdminState.cloudinaryStats = data.data;
                return data.data;
            } else {
                const errorMsg = data.message || 'Failed to fetch Cloudinary usage';
                console.error('API Error:', errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error in getUsageStats:', error);
            throw error;
        }
    },

    renderUsageStats(container) {
        if (!container) {
            console.error('Container element not found');
            return;
        }

        const stats = AdminState.cloudinaryStats;
        if (!stats) {
            container.innerHTML = '<div class="no-data">No Cloudinary data available</div>';
            return;
        }

        const lastUpdated = new Date(stats.lastUpdated).toLocaleString();
        
        container.innerHTML = `
            <div class="cloudinary-stats">
                <div class="stat-row">
                    <div class="stat-label">Storage Used:</div>
                    <div class="stat-value">${stats.storage.used} / ${stats.storage.limit}</div>
                    <div class="stat-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${stats.storage.percentage}%;"></div>
                        </div>
                        <span class="progress-text">${stats.storage.percentage}%</span>
                    </div>
                </div>
                
                <div class="stat-row">
                    <div class="stat-label">Total Files:</div>
                    <div class="stat-value">${stats.files.formatted}</div>
                </div>
                
                <div class="stat-meta">
                    <span>Plan: <strong>${stats.plan || 'Free'}</strong></span>
                    <span class="last-updated">Updated: ${lastUpdated}</span>
                </div>
            </div>
        `;
    },

    async init() {
        try {
            console.log('Initializing Cloudinary monitoring...');
            const container = document.getElementById('cloudinaryStatsContainer');
            if (!container) {
                console.error('Cloudinary stats container not found');
                return;
            }
            
            container.innerHTML = '<div class="loading">Loading Cloudinary stats...</div>';
            
            try {
                await this.getUsageStats();
                this.renderUsageStats(container);
                
                setInterval(async () => {
                    try {
                        await this.getUsageStats();
                        this.renderUsageStats(container);
                    } catch (e) {
                        console.error('Error in Cloudinary stats refresh:', e);
                    }
                }, 5 * 60 * 1000);
            } catch (error) {
                console.error('Failed to load Cloudinary stats:', error);
                container.innerHTML = `
                    <div class="error">
                        Failed to load Cloudinary stats. 
                        <button onclick="CloudinaryManager.init()">Retry</button>
                        <div class="error-details" style="display: none;">${error.message}</div>
                        <a href="#" onclick="this.previousElementSibling.style.display='block';return false;">Show details</a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error in CloudinaryManager.init:', error);
        }
    }
};

window.getAuthToken = function() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

window.getAuthHeaders = function() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

function logout() {
    console.log('Logging out...');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('Storage cleared, redirecting to /login.html');
    window.location.href = '/login.html';
}

async function checkAuthentication() {
    console.log('Checking admin authentication...');
    const token = getAuthToken();
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }

    try {
        const response = await fetch(`${AdminState.apiBaseUrl}/api/auth/verify`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            logout();
            return false;
        }

        const data = await response.json();
        
        if (!data.user.isAdmin) {
            console.log('User is not an admin, redirecting');
            window.location.href = '/';
            return false;
        }

        AdminState.user = data.user;
        AdminState.authToken = token;
        AdminHeader.updateUserDisplay(AdminState.user);
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
        return false;
    }
}

window.formatDate = function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

window.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

window.showError = function(message) {
    showNotification(message, 'error');
};

window.showSuccess = function(message) {
    showNotification(message, 'success');
};

window.showNotification = function(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
};

window.showConfirmDialog = function(title, message, confirmText, isDanger = false) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog-overlay';
        dialog.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-header">
                    <h3>${escapeHtml(title)}</h3>
                </div>
                <div class="confirm-dialog-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="confirm-dialog-footer">
                    <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                    <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        setTimeout(() => {
            dialog.classList.add('show');
        }, 10);
        
        const cleanup = () => {
            dialog.classList.remove('show');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        };
        
        document.getElementById('confirmOk').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        document.getElementById('confirmCancel').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                cleanup();
                resolve(false);
            }
        });
    });
}

const AdminApp = {
    async initialize() {
        console.log('Initializing admin application...');
        
        if (!await checkAuthentication()) {
            return;
        }
        
        AdminHeader.attachEventListeners();
        AdminSidebar.attachEventListeners();
        
        await AdminUsers.init();
        await AdminAnalytics.init();
        await AdminAnnouncements.init();
        AdminSettings.init();
        await AdminDashboard.init();
        AdminMaintenance.attachEventListeners();
        
        const activePageId = document.querySelector('.page.active')?.id.replace('Page', '');
        if (activePageId) {
            AdminHeader.updateHeaderForPage(activePageId);
        }
        
        console.log('Admin dashboard initialized');
    },

    logout() {
        logout();
    }
};

window.AdminApp = AdminApp;

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.initialize();
});
