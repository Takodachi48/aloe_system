// Application state
const AdminState = {
    user: null,
    authToken: null,
    users: [],
    announcements: [],
    cloudinaryStats: null,
    apiBaseUrl: 'http://localhost:3000'  // Update this for production
};

// Monitoring card functionality
function updateSystemStatus(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusValue = document.querySelector('.status-value');
    
    // Reset classes
    statusDot.className = 'status-dot';
    
    if (status === 'maintenance') {
        statusDot.classList.add('maintenance');
        statusValue.textContent = 'Under Maintenance';
    } else {
        statusDot.classList.add('active');
        statusValue.textContent = 'System Active';
    }
    
    // Add animation effect
    statusDot.style.animation = 'none';
    statusDot.offsetHeight; // Trigger reflow
    statusDot.style.animation = 'pulse 2s infinite';
}

// Update maintenance status display
function updateMaintenanceStatus(status) {
    try {
        const systemStatusElement = document.querySelector('.system-status .status-value');
        const maintenanceStatusElement = document.querySelector('.maintenance-schedule .scheduled-status');
        const lastMaintenanceElement = document.querySelector('.maintenance-history .last-maintenance-date');
        const countdownElements = document.querySelectorAll('.maintenance-countdown');
        const completionTimeElement = document.querySelector('.completion-time');
        const completionPercentageElement = document.querySelector('.completion-percentage');
        const progressBar = document.querySelector('.progress-bar .fill');
        const statusDot = document.querySelector('.system-status .status-dot');
        const endMaintenanceBtn = document.getElementById('endMaintenanceBtn');
        
        if (!systemStatusElement || !maintenanceStatusElement || !lastMaintenanceElement) {
            console.warn('Required DOM elements not found for maintenance status');
            return;
        }
        
        // Update last maintenance date if available
        if (status?.lastMaintenance) {
            const lastMaintenanceDate = new Date(status.lastMaintenance);
            lastMaintenanceElement.textContent = lastMaintenanceDate.toLocaleString();
        } else {
            lastMaintenanceElement.textContent = 'No previous maintenance';
        }
        
        // Handle active or scheduled maintenance
        if (status?.active && status.startDate && status.endDate) {
            const startDate = new Date(status.startDate);
            const endDate = new Date(status.endDate);
            const now = new Date();
            
            if (now < startDate) {
                // Maintenance is scheduled but not started
                maintenanceStatusElement.textContent = `Scheduled for ${startDate.toLocaleString()}`;
                if (completionTimeElement) {
                    completionTimeElement.textContent = `Scheduled to start at: ${startDate.toLocaleString()}`;
                    completionTimeElement.style.display = 'block';
                }
                if (completionPercentageElement) {
                    completionPercentageElement.style.display = 'none';
                }
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                
                // Update system status
                systemStatusElement.textContent = 'Active';
                if (statusDot) {
                    statusDot.classList.remove('maintenance');
                    statusDot.classList.add('active');
                }
                
                // Disable end maintenance button when no maintenance is active
                if (endMaintenanceBtn) {
                    endMaintenanceBtn.disabled = true;
                }
            } else if (now <= endDate) {
                // Maintenance is active
                maintenanceStatusElement.textContent = `Active until ${endDate.toLocaleString()}`;
                
                // Calculate and update progress
                const total = endDate - startDate;
                const elapsed = now - startDate;
                const percentage = Math.min(100, Math.round((elapsed / total) * 100));
                
                if (completionPercentageElement) {
                    completionPercentageElement.style.display = 'block';
                    completionPercentageElement.textContent = `${percentage}% Complete`;
                }
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                }
                if (completionTimeElement) {
                    completionTimeElement.textContent = `Estimated completion: ${endDate.toLocaleTimeString()}`;
                    completionTimeElement.style.display = 'block';
                }
                
                // Update system status to show maintenance
                systemStatusElement.textContent = 'Under Maintenance';
                if (statusDot) {
                    statusDot.classList.add('maintenance');
                    statusDot.classList.remove('active');
                }
                
                // Enable end maintenance button when maintenance is active
                if (endMaintenanceBtn) {
                    endMaintenanceBtn.disabled = false;
                }
            } else {
                // Maintenance has ended
                maintenanceStatusElement.textContent = 'No maintenance scheduled';
                if (completionTimeElement) {
                    completionTimeElement.textContent = 'No active maintenance';
                    completionTimeElement.style.display = 'block';
                }
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                if (completionPercentageElement) {
                    completionPercentageElement.style.display = 'none';
                }
                
                // Update system status
                systemStatusElement.textContent = 'Active';
                if (statusDot) {
                    statusDot.classList.remove('maintenance');
                    statusDot.classList.add('active');
                }
            }
            
            // Update countdown elements
            countdownElements.forEach(countdown => {
                if (now >= startDate && now <= endDate) {
                    countdown.style.display = 'flex';
                    updateCountdown(endDate);
                } else {
                    countdown.style.display = 'none';
                }
            });
            
            // Update last maintenance display
            if (status.history?.length > 0) {
                const last = status.history[status.history.length - 1];
                if (last?.startDate && last?.endDate) {
                    lastMaintenanceElement.textContent = `${new Date(last.startDate).toLocaleString()} - ${new Date(last.endDate).toLocaleString()}`;
                } else {
                    lastMaintenanceElement.textContent = 'Previous maintenance';
                }
            } else if (status.lastMaintenance) {
                lastMaintenanceElement.textContent = `Last: ${new Date(status.lastMaintenance).toLocaleString()}`;
            } else {
                lastMaintenanceElement.textContent = 'No previous maintenance';
            }
        } else {
            // No active maintenance
            maintenanceStatusElement.textContent = 'No maintenance scheduled';
            completionTimeElement.textContent = 'No maintenance scheduled';
            completionPercentageElement.style.display = 'none';
            progressBar.style.width = '0%';
            
            // Update system status to show active
            systemStatusElement.textContent = 'System Active';
            document.querySelector('.system-status .status-dot').classList.add('active');
            document.querySelector('.system-status .status-dot').classList.remove('maintenance');
            
            // Hide all countdowns
            countdownElements.forEach(countdown => {
                countdown.style.display = 'none';
            });
            
            // Update last maintenance display
            if (status?.lastMaintenance) {
                lastMaintenanceElement.textContent = `Last: ${new Date(status.lastMaintenance).toLocaleString()}`;
            } else if (status?.history?.length > 0) {
                const last = status.history[status.history.length - 1];
                if (last?.endDate) {
                    lastMaintenanceElement.textContent = `Last: ${new Date(last.endDate).toLocaleString()}`;
                } else {
                    lastMaintenanceElement.textContent = 'No previous maintenance';
                }
            } else {
                lastMaintenanceElement.textContent = 'No previous maintenance';
            }
        }
    } catch (error) {
        console.error('Error updating maintenance status:', error);
    }
}

function updateCountdown(endDate) {
    const countdownValue = document.querySelector('.countdown-value');
    const now = new Date();
    const timeLeft = endDate - now;
    
    if (timeLeft <= 0) {
        countdownValue.textContent = '00:00:00';
        return;
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    countdownValue.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    setTimeout(() => updateCountdown(endDate), 1000);
}

function updateCompletionStatus(maintenance) {
    const percentageEl = document.querySelector('.completion-percentage');
    const timeEl = document.querySelector('.completion-time');
    const progressBar = document.querySelector('.progress-bar .fill');
    
    if (maintenance && maintenance.startDate && maintenance.endDate) {
        const start = new Date(maintenance.startDate);
        const end = new Date(maintenance.endDate);
        const now = new Date();
        
        if (now >= start && now <= end) {
            const total = end - start;
            const elapsed = now - start;
            const percentage = Math.round((elapsed / total) * 100);
            
            percentageEl.style.display = 'block';
            percentageEl.textContent = `${percentage}% Complete`;
            progressBar.style.width = `${percentage}%`;
            timeEl.textContent = `Estimated completion: ${end.toLocaleTimeString()}`;
        } else if (now < start) {
            percentageEl.style.display = 'none';
            progressBar.style.width = '0%';
            timeEl.textContent = `Starts at: ${start.toLocaleTimeString()}`;
        } else {
            percentageEl.style.display = 'none';
            progressBar.style.width = '0%';
            timeEl.textContent = 'No maintenance scheduled';
        }
    } else {
        percentageEl.style.display = 'none';
        progressBar.style.width = '0%';
        timeEl.textContent = 'No maintenance scheduled';
    }
}

// Maintenance status manager
const MaintenanceManager = {
    checkInterval: null,
    lastCheck: null,
    lastStatus: null,
    isTabActive: true,
    retryCount: 0,
    maxRetries: 3,
    baseDelay: 30000, // 30 seconds base delay
    maxDelay: 300000, // 5 minutes max delay
    eventSource: null,
    
    // Initialize the maintenance status checker
    init() {
        // Check if browser supports Server-Sent Events
        if (typeof EventSource !== 'undefined') {
            this.setupSSE();
        } else {
            console.log('SSE not supported, falling back to polling');
            this.startPolling();
        }
        
        // Handle tab visibility changes
        document.addEventListener('visibilitychange', () => {
            this.isTabActive = !document.hidden;
            if (this.isTabActive) {
                // Tab became active, check for updates
                this.checkMaintenanceStatus();
            }
        });
    },
    
    // Set up Server-Sent Events for real-time updates
    setupSSE() {
        try {
            const token = getAuthToken();
            if (!token) return;
            
            // Close any existing connection
            if (this.eventSource) {
                this.eventSource.close();
            }
            
            // In development, we'll use a query parameter for the token
            // since EventSource doesn't support custom headers
            const url = new URL(`${AdminState.apiBaseUrl}/api/admin/maintenance/updates`);
            url.searchParams.append('token', token);
            
            // Create a new EventSource with the URL
            this.eventSource = new EventSource(url.toString());
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMaintenanceData(data);
                    this.retryCount = 0; // Reset retry counter on successful update
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };
            
            this.eventSource.onerror = (error) => {
                console.error('SSE error:', error);
                this.eventSource.close();
                this.startPolling(); // Fall back to polling on error
            };
            
            // Initial check
            this.checkMaintenanceStatus();
            
        } catch (error) {
            console.error('Error setting up SSE:', error);
            this.startPolling(); // Fall back to polling on error
        }
    },
    
    // Fall back to polling if SSE is not available
    startPolling() {
        // Clear any existing interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Initial check
        this.checkMaintenanceStatus();
        
        // Set up polling with exponential backoff
        this.scheduleNextCheck();
    },
    
    // Schedule the next status check with exponential backoff
    scheduleNextCheck() {
        if (this.checkInterval) {
            clearTimeout(this.checkInterval);
        }
        
        // Calculate delay with exponential backoff, but not more than maxDelay
        const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount), this.maxDelay);
        
        console.log(`Scheduling next maintenance check in ${delay/1000} seconds`);
        
        this.checkInterval = setTimeout(() => {
            this.checkMaintenanceStatus();
        }, delay);
    },
    
    // Check the current maintenance status
    async checkMaintenanceStatus() {
        // Don't check if tab is not active (we'll check when it becomes active)
        if (!this.isTabActive) {
            this.scheduleNextCheck();
            return;
        }
        
        try {
            const token = getAuthToken();
            if (!token) {
                console.log('No token found, redirecting to login');
                window.location.href = '/login.html';
                return;
            }
            
            // Add cache-busting parameter
            const url = new URL(`${AdminState.apiBaseUrl}/api/admin/maintenance/status`);
            url.searchParams.append('_', Date.now());
            
            const response = await fetch(url.toString(), {
                headers: getAuthHeaders(),
                cache: 'no-store' // Prevent caching
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            
            const data = await response.json();
            this.handleMaintenanceData(data.data);
            
            // On success, reset retry counter and use normal delay
            this.retryCount = 0;
            
        } catch (error) {
            console.error('Error checking maintenance status:', error);
            this.retryCount++;
            
            // If we've exceeded max retries, use max delay
            if (this.retryCount > this.maxRetries) {
                this.retryCount = this.maxRetries;
            }
        }
        
        // Schedule next check
        this.scheduleNextCheck();
    },
    
    // Handle maintenance data from either SSE or polling
    handleMaintenanceData(maintenanceData) {
        if (!maintenanceData) return;
        
        // Always update the UI with the latest data, even if it appears unchanged
        // This ensures the UI is in sync with the server state
        this.lastStatus = maintenanceData;
        this.lastCheck = new Date();
        
        // Update the maintenance status UI
        updateMaintenanceStatus(maintenanceData);
        
        // Update the completion status and progress
        updateCompletionStatus(maintenanceData);
        
        // Update the system status and adjust polling frequency
        if (maintenanceData.active) {
            updateSystemStatus('maintenance');
            this.baseDelay = 10000; // 10 seconds during maintenance
            
            // If we have an end date, set up a countdown
            if (maintenanceData.endDate) {
                const endDate = new Date(maintenanceData.endDate);
                const now = new Date();
                
                // Only show countdown if maintenance is active and not yet ended
                if (now < endDate) {
                    // Update countdown immediately
                    updateCountdown(endDate);
                    
                    // Set up interval for countdown updates
                    if (this.countdownInterval) {
                        clearInterval(this.countdownInterval);
                    }
                    
                    this.countdownInterval = setInterval(() => {
                        updateCountdown(endDate);
                    }, 1000);
                } else if (this.countdownInterval) {
                    // Clear interval if maintenance has ended
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }
        } else {
            updateSystemStatus('active');
            this.baseDelay = 30000; // 30 seconds when system is normal
            
            // Clear any existing countdown interval
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        }
    }
};

// Initialize the maintenance manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    MaintenanceManager.init();
    initializeMaintenance();
});

// Initialize monitoring and maintenance functionality
const initializeMaintenance = () => {
    try {
        const maintenanceForm = document.getElementById('maintenanceForm');
        if (!maintenanceForm) return;

        const startDateInput = document.getElementById('maintenanceStartDate');
        const endDateInput = document.getElementById('maintenanceEndDate');
        const announcementTypeInputs = document.querySelectorAll('input[name="announcementType"]');
        const customMessageArea = document.querySelector('.custom-announcement-fields');
        const maintenanceCancelBtn = document.getElementById('cancelMaintenanceBtn');
        const maintenanceTitleInput = document.getElementById('maintenanceTitle');
        const maintenanceMessageInput = document.getElementById('maintenanceMessage');

        // Set min date to now for start date
        function updateMinDates() {
            const now = new Date();
            const formattedNow = now.toISOString().slice(0, 16);
            if (startDateInput) startDateInput.min = formattedNow;
            
            if (startDateInput && startDateInput.value) {
                if (endDateInput) endDateInput.min = startDateInput.value;
            } else if (endDateInput) {
                endDateInput.min = formattedNow;
            }
        }

        // Initial min dates
        updateMinDates();

        // Update min dates every minute
        const minDateInterval = setInterval(updateMinDates, 60000);

        // Update end date min when start date changes
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => {
                endDateInput.min = startDateInput.value;
                if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
                    endDateInput.value = startDateInput.value;
                }
            });
        }

        // Handle announcement type selection
        if (announcementTypeInputs.length > 0 && customMessageArea && maintenanceTitleInput && maintenanceMessageInput) {
            announcementTypeInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const isCustom = input.value === 'custom';
                    customMessageArea.style.display = isCustom ? 'block' : 'none';
                    
                    // Toggle required attribute based on visibility
                    maintenanceTitleInput.required = isCustom;
                    maintenanceMessageInput.required = isCustom;
                    
                    // Clear any existing validation messages
                    maintenanceTitleInput.setCustomValidity('');
                    maintenanceMessageInput.setCustomValidity('');
                });
            });
            
            // Initialize the required state
            maintenanceTitleInput.required = false;
            maintenanceMessageInput.required = false;
        }

        // Add the event listener for the form submission
        maintenanceForm.addEventListener('submit', handleMaintenanceSubmit);
        
        // Initialize cancel button if it exists
        if (maintenanceCancelBtn) {
            maintenanceCancelBtn.addEventListener('click', () => {
                maintenanceForm.reset();
                const customFields = document.querySelector('.custom-announcement-fields');
                if (customFields) customFields.style.display = 'none';
                const modal = document.getElementById('maintenanceModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        // Clean up interval on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(minDateInterval);
        });
        
    } catch (error) {
        console.error('Error initializing maintenance:', error);
    }
};

// Handle end maintenance early
async function handleEndMaintenanceEarly() {
    const endButton = document.getElementById('endMaintenanceBtn');
    if (!endButton) return;
    
    if (!confirm('Are you sure you want to end the maintenance window early?')) {
        return;
    }
    
    try {
        endButton.disabled = true;
        endButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Ending...';
        
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance/end-now`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AdminState.authToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to end maintenance');
        }
        
        const data = await response.json();
        showNotification('Maintenance ended successfully', 'success');
        
        // Update UI
        updateMaintenanceStatus(data);
        
    } catch (error) {
        console.error('Error ending maintenance:', error);
        showNotification(error.message || 'Failed to end maintenance', 'error');
    } finally {
        if (endButton) {
            endButton.disabled = false;
            endButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>End Maintenance Now';
        }
    }
}

// Handle maintenance form submission
async function handleMaintenanceSubmit(event) {
    event.preventDefault();
    
    const maintenanceForm = document.getElementById('maintenanceForm');
    if (!maintenanceForm) return;
    
    const startDateInput = document.getElementById('maintenanceStartDate');
    const endDateInput = document.getElementById('maintenanceEndDate');
    const maintenanceTitleInput = document.getElementById('maintenanceTitle');
    const maintenanceMessageInput = document.getElementById('maintenanceMessage');
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const announcementType = document.querySelector('input[name="announcementType"]:checked').value;
    let title = '';
    let message = '';
    
    if (announcementType === 'custom') {
        title = maintenanceTitleInput.value.trim();
        message = maintenanceMessageInput.value.trim();
        
        // Manually validate required fields
        if (!title) {
            maintenanceTitleInput.setCustomValidity('Please enter a title for the maintenance announcement');
            maintenanceTitleInput.reportValidity();
            return;
        } else {
            maintenanceTitleInput.setCustomValidity('');
        }
        
        if (!message) {
            maintenanceMessageInput.setCustomValidity('Please enter a custom message');
            maintenanceMessageInput.reportValidity();
            return;
        } else {
            maintenanceMessageInput.setCustomValidity('');
        }
    } else {
        message = "System is under maintenance. Please try again later.";
    }

    try {
        // First, create the maintenance record
        const maintenanceResponse = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                startDate,
                endDate,
                message: message || undefined
            })
        });
        
        if (!maintenanceResponse.ok) {
            const error = await maintenanceResponse.json();
            throw new Error(error.message || 'Failed to schedule maintenance');
        }

        const maintenanceData = await maintenanceResponse.json();

        // Create maintenance start announcement
        const announcementData = {
            title: title || 'Scheduled Maintenance',
            content: message || `The system will undergo scheduled maintenance from ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}. We apologize for any inconvenience.`,
            type: 'maintenance',
            priority: 'high',
            startDate: new Date().toISOString(),
            endDate: endDate, // Announcement expires when maintenance ends
            isActive: true
        };

        // Create the announcement
        const announcementResponse = await fetch(`${AdminState.apiBaseUrl}/api/announcements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(announcementData)
        });

        if (!announcementResponse.ok) {
            console.error('Failed to create maintenance announcement');
        }

        // Update system status if maintenance is active now
        const now = new Date();
        if (now >= new Date(startDate) && now <= new Date(endDate)) {
            updateSystemStatus('maintenance');
        }

        // Update UI
        updateMaintenanceStatus(maintenanceData.data);
        updateCompletionStatus(maintenanceData.data);
        
        // Reload announcements to show the new one
        if (typeof loadAnnouncements === 'function') {
            loadAnnouncements();
        }

        showNotification('Maintenance scheduled successfully', 'success');
        maintenanceForm.reset();
        document.querySelector('.custom-announcement-fields').style.display = 'none';
        
        // Close the modal if it's open
        const modal = document.getElementById('maintenanceModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error scheduling maintenance:', error);
        showNotification(error.message || 'Failed to schedule maintenance', 'error');
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initializeMaintenance);

// Authentication functions
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function logout() {
    console.log('Logging out...');
    try {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error during logout:', error);
    }
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
        
        // Check if user is admin
        if (!data.user.isAdmin) {
            console.log('User is not an admin, redirecting');
            window.location.href = '/';
            return false;
        }

        AdminState.user = data.user;
        AdminState.authToken = token;
        updateUserDisplay();
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
        return false;
    }
}

function updateUserDisplay() {
    const adminNameElement = document.getElementById('adminName');
    
    if (adminNameElement && AdminState.user) {
        adminNameElement.textContent = AdminState.user.name;
    }
}

// API Service
// Cloudinary monitoring functions
const CloudinaryManager = {
    /**
     * Fetch Cloudinary usage statistics
     * @returns {Promise<Object>} Cloudinary usage data
     */
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

    /**
     * Render Cloudinary usage statistics
     * @param {HTMLElement} container - The container to render the stats in
     */
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

    /**
     * Initialize Cloudinary monitoring
     */
    async init() {
        try {
            console.log('Initializing Cloudinary monitoring...');
            const container = document.getElementById('cloudinaryStatsContainer');
            if (!container) {
                console.error('Cloudinary stats container not found');
                return;
            }
            
            // Show loading state
            container.innerHTML = '<div class="loading">Loading Cloudinary stats...</div>';
            
            try {
                await this.getUsageStats();
                this.renderUsageStats(container);
                
                // Update every 5 minutes
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

const AdminAPI = {
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

    // Announcement management
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

// Navigation
function updateHeaderForPage(pageId) {
    const map = {
        users: {
            title: 'User Management',
            subtitle: 'Manage system users and permissions'
        },
        analytics: {
            title: 'Analytics',
            subtitle: 'System analytics and insights'
        },
        announcements: {
            title: 'Announcements',
            subtitle: 'Create and manage system announcements for all users'
        },
        settings: {
            title: 'Settings',
            subtitle: 'System configuration'
        },
        maintenance: {
            title: 'Maintenance Mode',
            subtitle: 'Schedule and manage system maintenance windows'
        }
    };

    const pageInfo = map[pageId] || { title: 'Dashboard', subtitle: 'System overview' };
    const headerTitle = document.getElementById('headerPageTitle');
    const headerSubtitle = document.getElementById('headerPageSubtitle');
    
    if (headerTitle) headerTitle.textContent = pageInfo.title;
    if (headerSubtitle) headerSubtitle.textContent = pageInfo.subtitle;
}

function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the selected page
    const page = document.getElementById(`${pageId}Page`);
    if (page) {
        page.classList.add('active');
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Update the page title and subtitle in the header
    updateHeaderForPage(pageId);
    
    // Load data for the page if needed
    switch (pageId) {
        case 'users':
            loadUsers();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'analytics':
            // Initialize Cloudinary monitoring
            CloudinaryManager.init();
            break;
    }
    
    // Close mobile sidebar if open
    closeMobileSidebar();
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    const content = document.querySelector('.admin-content');
    const header = document.querySelector('.admin-header');
    
    sidebar.classList.toggle('collapsed');
    content.classList.toggle('sidebar-collapsed');
    header.classList.toggle('sidebar-collapsed');
}

// User Management
async function loadUsers() {
    try {
        const response = await AdminAPI.getAllUsers();
        AdminState.users = response.data.users;
        
        updateStats();
        renderUsersTable();
    } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users');
    }
}

function updateStats() {
    const totalUsers = AdminState.users.length;
    const activeUsers = AdminState.users.filter(u => u.isActive !== false).length;
    const adminCount = AdminState.users.filter(u => u.isAdmin).length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('adminCount').textContent = adminCount;
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (AdminState.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = AdminState.users.map(user => `
        <tr class="${user.isActive === false ? 'user-inactive' : ''}" data-user-id="${user._id}">
            <td><strong>${escapeHtml(user.name)}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="user-role-badge ${user.isActive === false ? 'role-inactive' : (user.isAdmin ? 'role-admin' : 'role-user')}">
                    ${user.isAdmin ? 'Admin' : 'User'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn ${user.isAdmin ? 'btn-secondary' : 'btn-primary'} btn-small btn-toggle-role" data-user-id="${user._id}" data-make-admin="${!user.isAdmin}" data-user-name="${escapeHtml(user.name)}">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <polyline points="17 11 19 13 23 9"></polyline>
                        </svg>
                        ${user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    ${user._id !== AdminState.user.id ? `
                        <button class="btn ${user.isActive === false ? 'btn-primary' : 'btn-secondary'} btn-small btn-toggle-status" data-user-id="${user._id}" data-activate="${user.isActive === false}" data-user-name="${escapeHtml(user.name)}">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                ${user.isActive === false ? 
                                    '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><polyline points="12 6 12 12 16 14"></polyline>' :
                                    '<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>'
                                }
                            </svg>
                            ${user.isActive === false ? 'Activate' : 'Deactivate'}
                        </button>
                    ` : ''}
                    ${(!user.isAdmin || AdminState.users.filter(u => u.isAdmin).length > 1) && user._id !== AdminState.user.id ? `
                        <button class="btn btn-danger btn-small btn-delete-user" data-user-id="${user._id}" data-user-name="${escapeHtml(user.name)}">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    // Attach event listeners
    attachTableEventListeners();
}

async function toggleUserRole(userId, makeAdmin, userName) {
    const confirmed = await showConfirmDialog(
        makeAdmin ? 'Promote User' : 'Demote User',
        `Are you sure you want to ${makeAdmin ? 'promote' : 'demote'} "${userName}" ${makeAdmin ? 'to admin' : 'from admin'}?`,
        makeAdmin ? 'Promote' : 'Demote'
    );
    
    if (!confirmed) return;
    
    try {
        await AdminAPI.updateUserRole(userId, makeAdmin);
        await loadUsers();
        showSuccess(`User role updated successfully`);
    } catch (error) {
        console.error('Failed to update role:', error);
        showError('Failed to update user role');
    }
}

async function toggleUserStatus(userId, activate, userName) {
    const confirmed = await showConfirmDialog(
        activate ? 'Activate User' : 'Deactivate User',
        `Are you sure you want to ${activate ? 'activate' : 'deactivate'} "${userName}"?`,
        activate ? 'Activate' : 'Deactivate',
        !activate
    );
    
    if (!confirmed) return;
    
    try {
        await AdminAPI.toggleUserStatus(userId, activate);
        await loadUsers();
        showSuccess(`User ${activate ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
        console.error('Failed to update status:', error);
        showError('Failed to update user status');
    }
}

async function confirmDeleteUser(userId, userName) {
    const confirmed = await showConfirmDialog(
        'Delete User',
        `Are you sure you want to delete user "${userName}"? This action cannot be undone.`,
        'Delete',
        true
    );
    
    if (confirmed) {
        deleteUser(userId);
    }
}

async function deleteUser(userId) {
    try {
        await AdminAPI.deleteUser(userId);
        await loadUsers();
        showSuccess('User deleted successfully');
    } catch (error) {
        console.error('Failed to delete user:', error);
        showError('Failed to delete user');
    }
}

function attachTableEventListeners() {
    // Role toggle buttons
    document.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = btn.dataset.userId;
            const makeAdmin = btn.dataset.makeAdmin === 'true';
            const userName = btn.dataset.userName;
            toggleUserRole(userId, makeAdmin, userName);
        });
    });
    
    // Status toggle buttons
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = btn.dataset.userId;
            const activate = btn.dataset.activate === 'true';
            const userName = btn.dataset.userName;
            toggleUserStatus(userId, activate, userName);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = btn.dataset.userId;
            const userName = btn.dataset.userName;
            confirmDeleteUser(userId, userName);
        });
    });
}

function closeModal() {
    const modal = document.getElementById('userModal');
    modal.classList.remove('show');
}

// Announcement Management
async function loadAnnouncements() {
    try {
        const response = await AdminAPI.getAllAnnouncements();
        AdminState.announcements = response.data.announcements;

        updateAnnouncementStats();
        renderAnnouncementsTable();
    } catch (error) {
        console.error('Failed to load announcements:', error);
        showError('Failed to load announcements');
    }
}

// Helper function to check if an announcement is expired
function isAnnouncementExpired(announcement) {
    // Special handling for maintenance announcements - they should respect their endDate
    if (announcement.type === 'maintenance' && announcement.endDate) {
        const now = new Date();
        const endDate = new Date(announcement.endDate);
        return now > endDate;
    }
    // For regular announcements, check both endDate and isActive
    if (announcement.endDate) {
        const now = new Date();
        const endDate = new Date(announcement.endDate);
        return now > endDate;
    }
    return false;
}

function updateAnnouncementStats() {
    const now = new Date();
    const totalAnnouncements = AdminState.announcements.length;
    const activeAnnouncements = AdminState.announcements.filter(a => 
        a.isActive && !isAnnouncementExpired(a)
    ).length;

    document.getElementById('totalAnnouncements').textContent = totalAnnouncements;
    document.getElementById('activeAnnouncements').textContent = activeAnnouncements;
}

function renderAnnouncementsTable() {
    const tbody = document.getElementById('announcementsTableBody');

    if (AdminState.announcements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No announcements found</td></tr>';
        return;
    }

    tbody.innerHTML = AdminState.announcements.map(announcement => {
        const isExpired = isAnnouncementExpired(announcement);
        let statusBadge;
        if (isExpired) {
            statusBadge = '<span class="status-badge status-expired">Expired</span>';
        } else if (announcement.isActive) {
            statusBadge = '<span class="status-badge status-active">Active</span>';
        } else {
            statusBadge = '<span class="status-badge status-inactive">Inactive</span>';
        }
        
        const tr = `
        <tr class="${isExpired ? 'announcement-expired' : ''}" data-announcement-id="${announcement._id}">
            <td><strong>${escapeHtml(announcement.title)}</strong></td>
            <td>${escapeHtml(announcement.content)}</td>
            <td>${statusBadge}</td>
            <td>${formatDate(announcement.startDate)}</td>
            <td>${announcement.endDate ? formatDate(announcement.endDate) : 'No expiration'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-small btn-edit-announcement" data-announcement-id="${announcement._id}">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    ${!isExpired ? `
                        <button class="btn ${announcement.isActive ? 'btn-secondary' : 'btn-primary'} btn-small btn-toggle-status" data-announcement-id="${announcement._id}" data-activate="${!announcement.isActive}">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
                            </svg>
                            ${announcement.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-small btn-delete-announcement" data-announcement-id="${announcement._id}">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>`;
        return tr;
    }).join('');

    // Attach event listeners
    attachAnnouncementEventListeners();
}

function attachAnnouncementEventListeners() {
    // Status toggle buttons
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const announcementId = btn.dataset.announcementId;
            const activate = btn.dataset.activate === 'true';
            toggleAnnouncementStatus(announcementId, activate);
        });
    });

    // Edit buttons
    document.querySelectorAll('.btn-edit-announcement').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const announcementId = btn.dataset.announcementId;
            openEditAnnouncementModal(announcementId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete-announcement').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const announcementId = btn.dataset.announcementId;
            confirmDeleteAnnouncement(announcementId);
        });
    });
}

async function toggleAnnouncementStatus(announcementId, activate) {
    const announcement = AdminState.announcements.find(a => a._id === announcementId);
    if (!announcement) return;
    
    if (isAnnouncementExpired(announcement)) {
        showError('Cannot modify expired announcements');
        return;
    }

    try {
        const response = await AdminAPI.toggleAnnouncementStatus(announcementId, activate);
        await loadAnnouncements();
        showSuccess(`Announcement ${activate ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
        console.error('Failed to toggle announcement status:', error);
        showError('Failed to update announcement status');
    }
}

async function confirmDeleteAnnouncement(announcementId) {
    const announcement = AdminState.announcements.find(a => a._id === announcementId);
    if (!announcement) return;

    const confirmed = await showConfirmDialog(
        'Delete Announcement',
        `Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`,
        'Delete',
        true
    );

    if (confirmed) {
        deleteAnnouncement(announcementId);
    }
}

async function deleteAnnouncement(announcementId) {
    try {
        await AdminAPI.deleteAnnouncement(announcementId);
        await loadAnnouncements();
        showSuccess('Announcement deleted successfully');
    } catch (error) {
        console.error('Failed to delete announcement:', error);
        showError('Failed to delete announcement');
    }
}

// Modal functions
function setupCustomSelect(wrapper) {
    const select = wrapper.querySelector('select');
    if (!select) return;
    
    // Create custom select structure
    const customSelect = document.createElement('div');
    customSelect.className = 'custom-select';
    
    // Create trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-select__trigger';
    const triggerSpan = document.createElement('span');
    // Safely get the selected option text
    const selectedOption = select.options[select.selectedIndex];
    triggerSpan.textContent = selectedOption ? selectedOption.text : '';
    const arrow = document.createElement('div');
    arrow.className = 'arrow';
    trigger.appendChild(triggerSpan);
    trigger.appendChild(arrow);
    
    // Create options
    const options = document.createElement('div');
    options.className = 'custom-options';
    
    Array.from(select.options).forEach(option => {
        const customOption = document.createElement('span');
        customOption.className = 'custom-option';
        if (option.selected) customOption.classList.add('selected');
        customOption.setAttribute('data-value', option.value);
        customOption.textContent = option.text;
        
        // Add click handler to option
        customOption.addEventListener('click', (e) => {
            e.preventDefault();
            triggerSpan.textContent = option.text;
            select.value = option.value;
            
            // Update selected state
            options.querySelectorAll('.custom-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            customOption.classList.add('selected');
            
            customSelect.classList.remove('open');
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);
        });
        
        options.appendChild(customOption);
    });
    
    customSelect.appendChild(trigger);
    customSelect.appendChild(options);
    
    // Add click handlers
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        customSelect.classList.toggle('open');
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });
    
    wrapper.appendChild(customSelect);
}

function openCreateAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (!modal) return;
    
    // Close any open modals first
    closeAnnouncementModal();
    
    // Reset form and modal state
    const form = document.getElementById('announcementForm');
    if (form) form.reset();
    
    // Reset and setup custom selects
    const typeSelect = document.getElementById('announcementType');
    const prioritySelect = document.getElementById('announcementPriority');
    
    if (typeSelect) {
        typeSelect.value = 'info';
        typeSelect.style.display = 'none'; // Hide the original select
    }
    
    if (prioritySelect) {
        prioritySelect.value = 'moderate';
        prioritySelect.style.display = 'none'; // Hide the original select
    }
    
    // Reinitialize custom selects
    const selectWrappers = modal.querySelectorAll('.custom-select-wrapper');
    selectWrappers.forEach(wrapper => {
        // Remove any existing custom select
        const existingCustom = wrapper.querySelector('.custom-select');
        if (existingCustom) {
            existingCustom.remove();
        }
        // Create new custom select
        setupCustomSelect(wrapper);
    });
    
    // Set current date/time as default start date
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('announcementStartDate').value = now.toISOString().slice(0, 16);
    
    // Set modal title and save button text
    const title = modal.querySelector('#announcementModalTitle');
    const saveBtn = modal.querySelector('#saveAnnouncementBtn');
    if (title) title.textContent = 'Create Announcement';
    if (saveBtn) {
        saveBtn.textContent = 'Create Announcement';
        saveBtn.dataset.mode = 'create';
        delete saveBtn.dataset.announcementId;
    }
    
    // Show the modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    // Trigger reflow to ensure the transition works
    void modal.offsetHeight;
    
    // Add show class to trigger the animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function openEditAnnouncementModal(announcementId) {
    const announcement = AdminState.announcements.find(a => a._id === announcementId);
    if (!announcement) return;

    const modal = document.getElementById('announcementModal');
    if (!modal) return;
    
    // Close any open modals first
    closeAnnouncementModal();
    
    const form = document.getElementById('announcementForm');
    if (!form) return;
    
    // Reset form first
    form.reset();
    
    // Fill form with announcement data
    document.getElementById('announcementTitle').value = announcement.title || '';
    document.getElementById('announcementContent').value = announcement.content || '';
    
    // Set select values before initializing custom selects
    const typeSelect = document.getElementById('announcementType');
    const prioritySelect = document.getElementById('announcementPriority');
    
    if (typeSelect) {
        // Map between backend and frontend type values
        const typeMapping = {
            'important': 'important',
            'error': 'important', // Map both 'error' and 'important' to 'important' in frontend
            'warning': 'warning',
            'success': 'success',
            'info': 'info'
        };
        
        // Get the mapped type, default to 'info' if not found
        const frontendType = typeMapping[announcement.type] || 'info';
        
        // If the option doesn't exist in the select, add it
        if (!Array.from(typeSelect.options).some(opt => opt.value === frontendType)) {
            const option = new Option(frontendType.charAt(0).toUpperCase() + frontendType.slice(1), frontendType);
            typeSelect.add(option);
        }
        
        // Set the select value
        typeSelect.value = frontendType;
        typeSelect.style.display = 'none'; // Hide the original select
    }
    
    if (prioritySelect) {
        // Ensure priority is one of the expected values
        const validPriorities = ['low', 'moderate', 'high'];
        const priorityValue = validPriorities.includes(announcement.priority) ? announcement.priority : 'moderate';
        prioritySelect.value = priorityValue;
        prioritySelect.style.display = 'none'; // Hide the original select
    }
    
    // Reinitialize custom selects
    const selectWrappers = modal.querySelectorAll('.custom-select-wrapper');
    selectWrappers.forEach(wrapper => {
        // Remove any existing custom select
        const existingCustom = wrapper.querySelector('.custom-select');
        if (existingCustom) {
            existingCustom.remove();
        }
        // Create new custom select
        setupCustomSelect(wrapper);
    });
    
    // Update custom select display after a small delay to ensure they're initialized
    setTimeout(() => {
        const updateCustomSelectDisplay = (selectId, value) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const wrapper = select.closest('.custom-select-wrapper');
            if (!wrapper) return;
            
            const customSelect = wrapper.querySelector('.custom-select');
            if (!customSelect) return;
            
            const trigger = customSelect.querySelector('.custom-select__trigger span');
            const options = customSelect.querySelectorAll('.custom-option');
            
            if (trigger) {
                const selectedOption = Array.from(select.options).find(opt => opt.value === value);
                if (selectedOption) {
                    trigger.textContent = selectedOption.text || '';
                } else {
                    // If no matching option found, try to find a default or first option
                    const defaultOption = select.options[0];
                    if (defaultOption) {
                        trigger.textContent = defaultOption.text || '';
                        select.value = defaultOption.value;
                    }
                }
            }
            
            if (options && value) {
                options.forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.value === value);
                });
            }
        };
        
        // Update both select displays
        updateCustomSelectDisplay('announcementType', announcement.type || 'info');
        updateCustomSelectDisplay('announcementPriority', announcement.priority || 'moderate');
    }, 50);
    
    // Set active state
    const isActiveCheckbox = document.getElementById('announcementIsActive');
    if (isActiveCheckbox) {
        isActiveCheckbox.checked = announcement.isActive !== false;
    }
    
    // Format dates for datetime-local input
    const startDate = new Date(announcement.startDate);
    startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
    const startDateInput = document.getElementById('announcementStartDate');
    if (startDateInput) {
        startDateInput.value = startDate.toISOString().slice(0, 16);
    }
    
    const endDateInput = document.getElementById('announcementEndDate');
    if (endDateInput) {
        if (announcement.endDate) {
            const endDate = new Date(announcement.endDate);
            endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
            endDateInput.value = endDate.toISOString().slice(0, 16);
        } else {
            endDateInput.value = '';
        }
    }
    
    // Update modal title and save button
    const title = document.getElementById('announcementModalTitle');
    const saveBtn = document.getElementById('saveAnnouncementBtn');
    
    if (title) title.textContent = 'Edit Announcement';
    if (saveBtn) {
        saveBtn.textContent = 'Update Announcement';
        saveBtn.dataset.mode = 'edit';
        saveBtn.dataset.announcementId = announcementId;
    }
    
    // Show the modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    // Trigger reflow to ensure the transition works
    void modal.offsetHeight;
    
    // Add show class to trigger the animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (!modal) return;
    
    // Don't do anything if we're already closing or if the modal isn't actually shown
    if (modal.classList.contains('closing') || !modal.classList.contains('show')) {
        return;
    }
    
    // Add closing class to prevent multiple triggers
    modal.classList.add('closing');
    
    // Start the close animation
    modal.classList.remove('show');
    
    // Disable interaction while closing
    modal.style.pointerEvents = 'none';
    
    // Wait for the transition to complete before cleaning up
    setTimeout(() => {
        // Hide the modal
        modal.style.display = 'none';
        modal.classList.remove('closing');
        
        // Re-enable interaction
        modal.style.pointerEvents = '';
        
        // Reset form and cleanup
        const form = document.getElementById('announcementForm');
        if (form) {
            form.reset();
        }
        
        // Clean up any existing custom selects
        const selectWrappers = modal.querySelectorAll('.custom-select-wrapper');
        selectWrappers.forEach(wrapper => {
            const existingCustom = wrapper.querySelector('.custom-select');
            if (existingCustom) {
                existingCustom.remove();
            }
            
            // Show the original select again
            const originalSelect = wrapper.querySelector('select');
            if (originalSelect) {
                originalSelect.style.display = 'block';
            }
        });
        
        // Clean up any open dropdowns
        document.querySelectorAll('.custom-select').forEach(dropdown => {
            if (dropdown.classList.contains('open')) {
                dropdown.classList.remove('open');
            }
        });
        
        // Reset body state
        document.body.classList.remove('modal-open');
        document.body.style.overflow = ''; // Re-enable body scroll
        
        // Reset any custom select triggers
        document.querySelectorAll('.custom-select__trigger').forEach(trigger => {
            if (trigger.nextElementSibling) {
                trigger.nextElementSibling.style.display = 'none';
            }
        });
        
        // Force a reflow to ensure the DOM is updated
        void modal.offsetHeight;
    }, 300); // Match this with your CSS transition duration
}

async function saveAnnouncement() {
    const form = document.getElementById('announcementForm');
    const saveBtn = document.getElementById('saveAnnouncementBtn');
    const mode = saveBtn.dataset.mode;
    const isEdit = mode === 'edit';

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const announcementData = Object.fromEntries(formData.entries());

    // Get values from custom selects
    const typeSelect = document.getElementById('announcementType');
    const prioritySelect = document.getElementById('announcementPriority');
    
    // Update the values from custom selects if they exist
    if (typeSelect) {
        // Use the selected value directly since the HTML now has the correct values
        announcementData.type = typeSelect.value || 'info';
        console.log('Saving announcement with type:', announcementData.type);
    }
    
    if (prioritySelect) {
        announcementData.priority = prioritySelect.value;
    }

    // Convert checkbox to boolean
    announcementData.isActive = document.getElementById('announcementIsActive').checked;

    // Convert dates
    if (announcementData.startDate) {
        announcementData.startDate = new Date(announcementData.startDate).toISOString();
    }
    if (announcementData.endDate) {
        announcementData.endDate = new Date(announcementData.endDate).toISOString();
    }

    try {
        if (isEdit) {
            const announcementId = saveBtn.dataset.announcementId;
            await AdminAPI.updateAnnouncement(announcementId, announcementData);
            showSuccess('Announcement updated successfully');
        } else {
            await AdminAPI.createAnnouncement(announcementData);
            showSuccess('Announcement created successfully');
        }

        closeAnnouncementModal();
        await loadAnnouncements();
    } catch (error) {
        console.error('Failed to save announcement:', error);
        showError(`Failed to ${isEdit ? 'update' : 'create'} announcement`);
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type) {
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
}

function showConfirmDialog(title, message, confirmText, isDanger = false) {
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

// Custom Select Functionality
function initializeCustomSelects() {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        const select = wrapper.querySelector('select');
        const customSelect = wrapper.querySelector('.custom-select');
        const customSelectTrigger = customSelect.querySelector('.custom-select__trigger span');
        const customOptions = customSelect.querySelector('.custom-options');
        const options = customSelect.querySelectorAll('.custom-option');

        // Initial selected value
        customSelectTrigger.textContent = select.options[select.selectedIndex].text;

        // Toggle dropdown
        customSelectTrigger.parentNode.addEventListener('click', (e) => {
            e.preventDefault();
            customSelect.classList.toggle('open');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });

        // Handle option selection
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                customSelectTrigger.textContent = option.textContent;
                select.value = option.dataset.value;
                
                // Update selected state
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                customSelect.classList.remove('open');
                
                // Trigger change event on the original select
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            });
        });
    });
}

// Handle start maintenance now form submission
async function handleStartMaintenanceNow(event) {
    event.preventDefault();
    
    const durationInput = document.getElementById('maintenanceDuration');
    const reasonInput = document.getElementById('maintenanceReason');
    const startButton = event.target.querySelector('button[type="submit"]');
    
    if (!durationInput || !startButton) return;
    
    const duration = parseInt(durationInput.value, 10);
    if (isNaN(duration) || duration < 5 || duration > 1440) {
        showNotification('Please enter a valid duration between 5 and 1440 minutes', 'error');
        return;
    }
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const reason = reasonInput ? reasonInput.value.trim() : 'Maintenance in progress';
    
    try {
        startButton.disabled = true;
        startButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Starting...';
        
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminState.authToken}`
            },
            body: JSON.stringify({
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                type: 'immediate',
                description: reason,
                severity: 'high'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to start maintenance');
        }
        
        if (response.ok) {
            const data = await response.json();
            showNotification('Maintenance scheduled successfully!', 'success');
            
            // Reset form and radio button state
            if (event.target) {
                event.target.reset();
                
                // Reset radio buttons to default state
                const defaultRadio = document.querySelector('input[name="announcementType"][value="default"]');
                if (defaultRadio) {
                    defaultRadio.checked = true;
                }
                
                // Hide custom fields
                const customFields = document.querySelector('.custom-announcement-fields');
                if (customFields) {
                    customFields.style.display = 'none';
                }
            }
            
            // Refresh maintenance status
            loadMaintenanceStatus();
        }
    } catch (error) {
        console.error('Error starting maintenance:', error);
        showNotification(error.message || 'Failed to start maintenance', 'error');
    } finally {
        if (startButton) {
            startButton.disabled = false;
            startButton.innerHTML = '<i class="fas fa-tools me-2"></i>Start Maintenance Now';
        }
    }
}

// Handle end maintenance early
async function handleEndMaintenanceEarly() {
    const endButton = document.getElementById('endMaintenanceBtn');
    if (!endButton) return;
    
    if (!confirm('Are you sure you want to end the maintenance window early?')) {
        return;
    }
    
    try {
        endButton.disabled = true;
        endButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Ending...';
        
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance/end-now`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AdminState.authToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to end maintenance');
        }
        
        const data = await response.json();
        showNotification('Maintenance ended successfully', 'success');
        
        // Update UI
        updateMaintenanceStatus(data);
        
    } catch (error) {
        console.error('Error ending maintenance:', error);
        showNotification(error.message || 'Failed to end maintenance', 'error');
    } finally {
        if (endButton) {
            endButton.disabled = false;
            endButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>End Maintenance Now';
        }
    }
}

// Maintenance Mode Functions
// Handle end maintenance early
async function handleEndMaintenanceEarly() {
    const endButton = document.getElementById('endMaintenanceBtn');
    if (!endButton) return;
    
    if (!confirm('Are you sure you want to end the maintenance window early?')) {
        return;
    }
    
    try {
        endButton.disabled = true;
        endButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Ending Maintenance...';
        
        const response = await fetch('/api/admin/maintenance/end-early', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${AdminState.authToken}`
            },
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to end maintenance');
        }
        
        showNotification('Maintenance ended successfully', 'success');
        
        // Refresh the maintenance status
        MaintenanceManager.checkMaintenanceStatus();
        
    } catch (error) {
        console.error('Error ending maintenance:', error);
        showNotification(error.message || 'Failed to end maintenance', 'error');
    } finally {
        if (endButton) {
            endButton.disabled = false;
            endButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>End Maintenance Now';
        }
    }
}

function initializeMaintenanceControls() {
    // Initialize start maintenance now form
    const startMaintenanceForm = document.getElementById('startMaintenanceNowForm');
    if (startMaintenanceForm) {
        startMaintenanceForm.addEventListener('submit', handleStartMaintenanceNow);
    }

    // Initialize end maintenance button
    const endMaintenanceBtn = document.getElementById('endMaintenanceBtn');
    if (endMaintenanceBtn) {
        endMaintenanceBtn.addEventListener('click', handleEndMaintenanceEarly);
    }
    const announcementTypeRadios = document.querySelectorAll('input[name="announcementType"]');
    const customFields = document.getElementById('customAnnouncementFields');
    const startMaintenanceBtn = document.getElementById('startMaintenanceBtn');

    // Handle announcement type toggle
    if (customFields) {
        announcementTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                customFields.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        });
    }

    // Handle maintenance form submission
    const maintenanceForm = document.getElementById('maintenanceForm');
    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', handleMaintenanceSubmit);
    }

    // Handle announcement type change
    const announcementTypeInputs = document.querySelectorAll('input[name="announcementType"]');
    const customMessageArea = document.querySelector('.custom-announcement-fields');
    
    if (customMessageArea) {
        announcementTypeInputs.forEach(input => {
            input.addEventListener('change', () => {
                customMessageArea.style.display = input.value === 'custom' ? 'block' : 'none';
            });
        });
    }

    // Handle date validation
    const startDateInput = document.getElementById('maintenanceStartDate');
    const endDateInput = document.getElementById('maintenanceEndDate');
    
    if (startDateInput && endDateInput) {
        // Set min date to now for start date
        function updateMinDates() {
            const now = new Date();
            // Add 5 minutes to allow for setup
            now.setMinutes(now.getMinutes() + 5);
            const formattedNow = now.toISOString().slice(0, 16);
            startDateInput.min = formattedNow;
            
            if (startDateInput.value) {
                // Set end date minimum to 30 minutes after start
                const minEnd = new Date(startDateInput.value);
                minEnd.setMinutes(minEnd.getMinutes() + 30);
                endDateInput.min = minEnd.toISOString().slice(0, 16);
                
                // If end date is less than minimum, update it
                const currentEnd = new Date(endDateInput.value);
                if (currentEnd < minEnd) {
                    endDateInput.value = minEnd.toISOString().slice(0, 16);
                }
            } else {
                const minEnd = new Date(now);
                minEnd.setMinutes(minEnd.getMinutes() + 30);
                endDateInput.min = minEnd.toISOString().slice(0, 16);
            }
        }

        // Initial min dates
        updateMinDates();

        // Update min dates every minute
        const updateInterval = setInterval(updateMinDates, 60000);
        
        // Store interval ID for cleanup
        startDateInput.dataset.updateInterval = updateInterval;

        // Update end date min when start date changes
        startDateInput.addEventListener('change', () => {
            const startDate = new Date(startDateInput.value);
            const minEnd = new Date(startDate);
            minEnd.setMinutes(minEnd.getMinutes() + 30);
            endDateInput.min = minEnd.toISOString().slice(0, 16);
            
            const currentEnd = new Date(endDateInput.value);
            if (currentEnd < minEnd) {
                endDateInput.value = minEnd.toISOString().slice(0, 16);
            }
        });

        // Help text for date inputs
        startDateInput.title = 'Schedule maintenance to start at least 5 minutes in the future';
        endDateInput.title = 'Maintenance must last at least 30 minutes';
    }
}

async function handleMaintenanceSubmit(event) {
    event.preventDefault();
    
    const startDateInput = document.getElementById('maintenanceStartDate');
    const endDateInput = document.getElementById('maintenanceEndDate');
    const messageInput = document.getElementById('maintenanceMessage');
    const isCustom = document.querySelector('input[name="announcementType"]:checked').value === 'custom';
    
    if (!startDateInput || !endDateInput) {
        showNotification('Missing required date inputs', 'error');
        return;
    }

    try {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        // Validate dates
        if (startDate >= endDate) {
            showNotification('End date must be after start date', 'error');
            return;
        }

        // Calculate duration for message
        const durationMs = endDate - startDate;
        const durationMinutes = Math.floor(durationMs / 1000 / 60);
        
        // Get form elements
        const titleInput = document.getElementById('maintenanceTitle');
        const messageInput = document.getElementById('maintenanceMessage');
        
        // Prepare maintenance data with title and content
        const maintenanceData = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            message: {
                title: isCustom && titleInput && titleInput.value.trim() 
                    ? titleInput.value.trim() 
                    : 'Scheduled Maintenance',
                content: isCustom && messageInput && messageInput.value.trim() 
                    ? messageInput.value.trim()
                    : `The system will be undergoing maintenance for ${formatDuration(durationMinutes)}. ` +
                      `During this time, some features may be unavailable. We apologize for any inconvenience.`
            },
            type: 'important' // Ensure type is set to important
        };

        // First, check if there's already a maintenance period
        const statusResponse = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance/status`, {
            headers: getAuthHeaders()
        });
        
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.data && statusData.data.active && statusData.data.endDate) {
                const endDate = new Date(statusData.data.endDate);
                const now = new Date();
                
                if (endDate > now) {
                    // Ask for confirmation to override existing maintenance
                    const confirmOverride = confirm(
                        `There is already an active maintenance period until ${endDate.toLocaleString()}.\n\n` +
                        'Would you like to update the existing maintenance period with the new schedule?'
                    );
                    
                    if (!confirmOverride) {
                        return; // User cancelled
                    }
                }
            }
        }

        // Proceed with creating/updating maintenance
        const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(maintenanceData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to schedule maintenance');
        }

        const data = await response.json();
        showNotification('Maintenance scheduled successfully', 'success');
        
        // Update UI
        updateMaintenanceStatus(data.data);
        updateCompletionStatus(data.data);
        
        // Reset form
        event.target.reset();
        
        // Reset radio button to default
        const defaultRadio = document.querySelector('input[name="announcementType"][value="default"]');
        if (defaultRadio) {
            defaultRadio.checked = true;
        }
        
        // Hide custom fields
        const customFields = document.querySelector('.custom-announcement-fields');
        if (customFields) {
            customFields.style.display = 'none';
        }
    } catch (error) {
        console.error('Error scheduling maintenance:', error);
        showNotification(error.message || 'Failed to schedule maintenance', 'error');
    }
}

function formatDuration(minutes) {
    if (minutes < 60) {
        return `${Math.floor(minutes)} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 60) {
        return '1 hour';
    } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(minutes / 1440);
        const remainingHours = Math.floor((minutes % 1440) / 60);
        if (remainingHours === 0) {
            return `${days} day${days !== 1 ? 's' : ''}`;
        }
        return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }

    // Initialize custom selects
    initializeCustomSelects();
    // Initialize maintenance controls
    initializeMaintenanceControls();
    initializeCustomSelects();
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            navigateToPage(pageId);
        });
    });
    
    // Mobile nav
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', toggleMobileSidebar);
    }
    
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebarCollapse);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Remove any existing click handlers to prevent duplicates
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add new click handler
        newLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const confirmed = await showConfirmDialog(
                    'Logout',
                    'Are you sure you want to log out?',
                    'Logout',
                    false
                );
                
                if (confirmed) {
                    await logout();
                }
            } catch (error) {
                console.error('Error during logout confirmation:', error);
            }
            
            return false;
        });
    }
    
    // Modal close
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    // Refresh users
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', loadUsers);
    }
    
    // Announcement management
    const createAnnouncementBtn = document.getElementById('createAnnouncementBtn');
    if (createAnnouncementBtn) {
        createAnnouncementBtn.addEventListener('click', openCreateAnnouncementModal);
    }
    
    const closeAnnouncementModalBtn = document.getElementById('closeAnnouncementModal');
    if (closeAnnouncementModalBtn) {
        closeAnnouncementModalBtn.addEventListener('click', closeAnnouncementModal);
    }
    
    const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');
    if (cancelAnnouncementBtn) {
        cancelAnnouncementBtn.addEventListener('click', closeAnnouncementModal);
    }
    
    const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');
    if (saveAnnouncementBtn) {
        saveAnnouncementBtn.addEventListener('click', saveAnnouncement);
    }
    
    // Load initial data
    await loadUsers();
    
    // Check if announcements page is active and load announcements if needed
    const active = document.querySelector('.page.active');
    if (active && active.id === 'announcementsPage') {
        await loadAnnouncements();
    }
    
    // Set header based on initially active page
    if (active && active.id.endsWith('Page')) {
        updateHeaderForPage(active.id.replace('Page',''));
    } else {
        updateHeaderForPage('users');
    }

    console.log('Admin dashboard initialized');
});
