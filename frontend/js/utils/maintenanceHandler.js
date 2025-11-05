export class MaintenanceHandler {
    constructor() {
        this.isMaintenanceMode = false;
        this.maintenanceData = null;
        this.countdownInterval = null;
        this.stylesLoaded = false;
        this.initialize();
    }

    async initialize() {
        // Load styles and templates
        await this.loadStyles();
        
        // Check maintenance status on page load
        this.checkMaintenanceStatus();
        
        // Check every 5 minutes
        setInterval(() => this.checkMaintenanceStatus(), 5 * 60 * 1000);
    }

    async loadStyles() {
        if (this.stylesLoaded) return;
        
        // Check if styles are already loaded
        const existingStyle = document.querySelector('link[href*="maintenance.css"]');
        if (existingStyle) {
            this.stylesLoaded = true;
            return;
        }
        
        // Load styles
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/styles/maintenance.css';
        link.onload = () => this.stylesLoaded = true;
        
        document.head.appendChild(link);
    }

    async loadTemplate() {
        // Check if template is already in the DOM
        const existingTemplate = document.getElementById('maintenance-template');
        if (existingTemplate) {
            return existingTemplate.content.cloneNode(true);
        }
        
        try {
            // Try to fetch the template
            const response = await fetch('/templates/maintenance-overlay.html');
            if (!response.ok) throw new Error('Failed to load template');
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Cache the template in a hidden div
            const template = document.createElement('template');
            template.id = 'maintenance-template';
            template.innerHTML = html;
            document.body.appendChild(template);
            
            return template.content.cloneNode(true);
        } catch (error) {
            console.error('Error loading maintenance template:', error);
            return this.getFallbackTemplate();
        }
    }
    
    getFallbackTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
            <div id="maintenance-overlay">
                <div class="maintenance-content">
                    <div class="maintenance-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            <path d="M12 8v4"></path>
                            <path d="M12 16h.01"></path>
                        </svg>
                    </div>
                    <h1 class="maintenance-title">System Maintenance</h1>
                    <p class="maintenance-message" id="maintenance-message">
                        ${this.maintenanceData?.message || 'We\'re currently performing scheduled maintenance. We\'ll be back online shortly.'}
                    </p>
                    <div class="maintenance-countdown" id="maintenance-countdown">
                        Checking status...
                    </div>
                    <p class="maintenance-note">
                        We apologize for the inconvenience. This maintenance is necessary to improve our service.
                        <br>Please check back in a few minutes.
                    </p>
                </div>
            </div>
        `;
        return template.content.cloneNode(true);
    }

    async checkMaintenanceStatus() {
        try {
            const response = await fetch('/api/status', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                if (response.status === 503) {
                    this.handleMaintenanceMode({
                        message: 'The system is currently undergoing maintenance. Please try again later.',
                        status: 'maintenance',
                        maintenance: true
                    });
                }
                return;
            }
            
            const data = await response.json();
            
            if (data.maintenance || data.status === 'maintenance') {
                if (!this.isMaintenanceMode || 
                    this.maintenanceData?.message !== data.message ||
                    this.maintenanceData?.startDate !== data.startDate ||
                    this.maintenanceData?.endDate !== (data.estimatedEnd || data.endTime)) {
                    
                    this.handleMaintenanceMode({
                        message: data.message || 'The system is currently undergoing maintenance. Please try again later.',
                        startDate: data.startDate,
                        endDate: data.estimatedEnd || data.endTime,
                        status: 'maintenance',
                        maintenance: true
                    });
                } 
            } else if (this.isMaintenanceMode) {
                this.handleNormalMode();
            }
        } catch (error) {
            console.error('Error checking maintenance status:', error);
        }
    }

    handleNormalMode() {
        if (!this.isMaintenanceMode) return;
        
        this.isMaintenanceMode = false;
        this.maintenanceData = null;
        this.hideMaintenanceOverlay();
        this.clearRetryCountdown();
    }

    async handleMaintenanceMode(data) {
        if (this.isMaintenanceMode) return;
        
        this.isMaintenanceMode = true;
        this.maintenanceData = data;
        
        await this.showMaintenanceOverlay();
        this.setupRetryCountdown(data.retryAfter);
    }

    formatDateTime(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    async showMaintenanceOverlay() {
        // Remove any existing overlay first
        const existingOverlay = document.getElementById('maintenance-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    
        // Load template
        const template = await this.loadTemplate();
        
        // Create a new div to hold the template content
        const container = document.createElement('div');
        container.appendChild(template);
        
        // Update the message if provided
        if (this.maintenanceData?.message) {
            const messageEl = container.querySelector('#maintenance-message');
            if (messageEl) {
                messageEl.textContent = this.maintenanceData.message;
            }
        }
        
        // Add to the DOM
        document.body.appendChild(container);
        
        // Start countdown if end time is provided
        if (this.maintenanceData?.endDate) {
            this.startCountdown(new Date(this.maintenanceData.endDate));
        }
    }

    handleMaintenanceEnd() {
        // Only proceed if we're actually in maintenance mode
        if (!this.isMaintenanceMode) {
            return;
        }
        
        // Update state first to prevent race conditions
        this.isMaintenanceMode = false;
        this.maintenanceData = null;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // Remove maintenance overlay with animation
        const overlay = document.getElementById('maintenance-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(0.95)';
            
            // Remove the overlay after the animation completes
            setTimeout(() => {
                if (overlay?.parentNode) {
                    overlay.remove();
                }
            }, 500);
        }
        
        // Show a notification that maintenance is complete
        this.showNotification('Maintenance complete! Welcome back!', 'success');
        
        // Force a full page reload to ensure all components are in sync
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    }

    startCountdown(endTime) {
        const countdownElement = document.getElementById('maintenance-countdown');
        if (!countdownElement) return;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        const updateCountdown = () => {
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                countdownElement.textContent = 'Very soon!';
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            countdownElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };

        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }

    showNotification(message, type = 'info') {
        // Create styled notification matching the green theme
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3);
            z-index: 10000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 500;
            animation: fadeIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Export the class for module usage
export default MaintenanceHandler;