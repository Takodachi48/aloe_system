export class MaintenanceHandler {
    constructor() {
        this.isMaintenanceMode = false;
        this.maintenanceData = null;
        this.countdownInterval = null;
        this.initialize();
    }

    initialize() {
        // Check maintenance status on page load
        this.checkMaintenanceStatus();
        
        // Check every 5 minutes
        setInterval(() => this.checkMaintenanceStatus(), 5 * 60 * 1000);
    }

    async checkMaintenanceStatus() {
        try {
            console.log('Checking maintenance status...');
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
                console.error('Error response from /api/status:', response.status, response.statusText);
                // If we can't reach the server, assume maintenance mode
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
            console.log('Maintenance status response:', data);
            
            // If maintenance is active in the response
            if (data.maintenance || data.status === 'maintenance') {
                // Only update if the maintenance data has changed or we're not in maintenance mode yet
                if (!this.isMaintenanceMode || 
                    this.maintenanceData?.message !== data.message ||
                    this.maintenanceData?.startDate !== data.startDate ||
                    this.maintenanceData?.endDate !== (data.estimatedEnd || data.endTime)) {
                    
                    console.log('Maintenance mode active or updated, updating overlay');
                    this.handleMaintenanceMode({
                        message: data.message || 'The system is currently undergoing maintenance. Please try again later.',
                        startDate: data.startDate,
                        endDate: data.estimatedEnd || data.endTime,
                        status: 'maintenance',
                        maintenance: true
                    });
                } else {
                    console.log('Maintenance mode active, no changes detected');
                }
            } 
            // If maintenance is not active in the response but is in our state, hide the overlay
            else if (this.isMaintenanceMode) {
                console.log('Maintenance mode ended, removing overlay');
                this.handleMaintenanceEnd();
            } else {
                console.log('System is operational, no maintenance active');
            }
        } catch (error) {
            console.error('Error checking maintenance status:', error);
        }
    }

handleMaintenanceMode(data) {
    if (this.isMaintenanceMode) {
        console.log('Maintenance mode already active, skipping');
        return;
    }
    
    console.log('Entering maintenance mode with data:', data);
    this.isMaintenanceMode = true;
    this.maintenanceData = data;
    
    // Remove any existing overlay first
    const existingOverlay = document.getElementById('maintenance-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create maintenance overlay
    const overlay = document.createElement('div');
    overlay.id = 'maintenance-overlay';
    
    // Create styles for the overlay
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        #maintenance-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            backdrop-filter: blur(12px) saturate(150%) brightness(0.7);
            -webkit-backdrop-filter: blur(12px) saturate(150%) brightness(0.7);
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 2rem;
            box-sizing: border-box;
            animation: fadeIn 0.4s ease-out;
        }
        .maintenance-content {
            background: #FFFFFF;
            padding: 0;
            border-radius: 1.25rem;
            max-width: 820px;
            width: 88vw;
            max-height: calc(100vh - 5rem);
            margin: 1.5rem;
            box-shadow: 0 30px 80px rgba(76, 175, 80, 0.25), 0 0 0 1px rgba(76, 175, 80, 0.1);
            position: relative;
            overflow: hidden;
            animation: scaleIn 0.4s ease-out;
            display: flex;
            flex-direction: column;
        }
        .maintenance-header {
            padding: 1.25rem 1.75rem 0.75rem;
            text-align: center;
        }
        .maintenance-content h2 {
            color: #2E7D32;
            margin: 0;
            font-size: 1.8rem;
            font-weight: 800;
            line-height: 1.2;
            text-align: center;
        }
        .maintenance-content > p {
            color: #2E7D32;
            font-size: 0.95rem;
            line-height: 1.5;
            margin: 0.6rem 0 0 0;
            text-align: center;
            opacity: 0.85;
        }
        .maintenance-body {
            padding: 1.25rem 2rem 2rem;
            display: flex;
            flex-direction: row;
            gap: 1.5rem;
            justify-content: center;
            flex: 1;
            overflow-y: auto;
        }
        @media (max-width: 1000px) {
            .maintenance-content {
                max-width: 100vw;
                padding: 0 1rem;
                border-radius: 1rem;
                margin: 1rem;
                width: calc(100vw - 2rem);
                max-height: calc(100vh - 3rem);
            }
            .maintenance-header {
                padding: 1rem 1.5rem 0.5rem;
            }
            .maintenance-body {
                padding: 1rem 1.25rem 1.25rem;
                gap: 1rem;
            }
            .maintenance-content h2 {
                font-size: 1.5rem;
            }
            .maintenance-content > p {
                font-size: 0.85rem;
            }
            .maintenance-countdown,
            .maintenance-schedule {
                padding: 1.25rem;
                border-radius: 1.5rem;
            }
            #maintenance-countdown {
                font-size: 2rem;
            }
        }
        .maintenance-countdown {
            flex: 1;
            padding: 1.5rem;
            background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
            border-radius: 1.75rem;
            position: relative;
            box-shadow: 0 10px 35px rgba(76, 175, 80, 0.3);
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
        }
        .maintenance-countdown p {
            color: #FFFFFF !important; /* Force white for "Time Remaining" */
            font-size: 0.95rem;
            font-weight: 600;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            text-transform: uppercase;
            letter-spacing: 0.75px;
            margin: 0 0 0.4rem 0;
            opacity: 0.95;
        }
        #maintenance-countdown {
            display: block;
            color: #FFFFFF;
            font-weight: 900;
            font-size: 2.2em;
            padding: 0;
            background: transparent;
            border-radius: 0;
            text-shadow: 0 3px 15px rgba(0, 0, 0, 0.2);
            letter-spacing: 1.2px;
        }
        .maintenance-schedule {
            flex: 1;
            background: linear-gradient(135deg, #F1F8F4 0%, #E8F5E9 100%);
            border-radius: 1.75rem;
            padding: 1.5rem;
            border: 2px solid #A5D6A7;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
        }
        .maintenance-time-block {
            padding: 0;
            background: transparent;
            border-radius: 0;
            border: none;
            margin-bottom: 1.5rem;
        }
        .maintenance-time-block:last-child {
            margin-bottom: 0;
        }
        .maintenance-time-block-inner {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
            padding: 0.75rem 1rem;
            border-bottom: 2px dashed #A5D6A7;
            width: 100%;
        }
        .maintenance-time-block:last-child .maintenance-time-block-inner {
            border-bottom: none;
        }
        .maintenance-time-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #66BB6A;
            text-transform: uppercase;
            letter-spacing: 0.35px;
            margin: 0;
            text-align: left;
        }
        .maintenance-time-value {
            font-size: 0.95rem;
            font-weight: 700;
            color: #2E7D32;
            margin: 0;
            text-align: left;
        }
    `;
    // Add styles to the document
    document.head.appendChild(style);
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'maintenance-content';
    
    const endTime = data.estimatedEnd || data.endDate || data.endTime;
    const startTime = data.startDate;

    const formatDateTime = (dateString) => {
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
    };
    const startFormatted = formatDateTime(startTime);
    const endFormatted = formatDateTime(endTime);

    content.innerHTML = `
      <div class="maintenance-header">
        <h2>We'll Be Right Back</h2>
        <p>${data.message || 'The system is currently undergoing maintenance. Please try again later.'}</p>
      </div>
      <div class="maintenance-body">
        ${endTime ? `
            <div class="maintenance-countdown">
                <p>Time Remaining</p>
                <span id="maintenance-countdown">Calculating...</span>
            </div>
        ` : ''}
        ${(startFormatted || endFormatted) ? `
            <div class="maintenance-schedule">
                ${startFormatted ? `
                    <div class="maintenance-time-block">
                        <div class="maintenance-time-block-inner">
                            <p class="maintenance-time-label">Started</p>
                            <p class="maintenance-time-value">${startFormatted}</p>
                        </div>
                    </div>
                ` : ''}
                ${endFormatted ? `
                    <div class="maintenance-time-block">
                        <div class="maintenance-time-block-inner">
                            <p class="maintenance-time-label">Expected End</p>
                            <p class="maintenance-time-value">${endFormatted}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        ` : ''}
      </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    console.log('Maintenance overlay added to DOM');

    if (endTime) {
        this.startCountdown(new Date(endTime));
    }
}

    handleMaintenanceEnd() {
        console.log('Ending maintenance mode');
        
        // Only proceed if we're actually in maintenance mode
        if (!this.isMaintenanceMode) {
            console.log('Not in maintenance mode, nothing to end');
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
            console.log('Removing maintenance overlay');
            overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(0.95)';
            
            // Remove the overlay after the animation completes
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                    console.log('Maintenance overlay removed from DOM');
                }
            }, 500);
        } else {
            console.log('No maintenance overlay found to remove');
        }
        
        // Show a notification that maintenance is complete
        this.showNotification('Maintenance complete! Welcome back!', 'success');
        
        // Force a full page reload to ensure all components are in sync
        console.log('Reloading page to ensure clean state...');
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