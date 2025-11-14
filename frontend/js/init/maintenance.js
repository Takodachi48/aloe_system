import MaintenanceHandler from '../utils/maintenanceHandler.js';

const initMaintenance = () => {
    try {
        window.maintenanceHandler = new MaintenanceHandler();
        
        // Force a maintenance check immediately after initialization
        setTimeout(() => {
            window.maintenanceHandler.checkMaintenanceStatus().catch(() => {
                // Silently fail for the initial check
            });
        }, 1000);
    } catch (error) {
        console.error('Failed to initialize maintenance handler:', error);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMaintenance);

// Also check if the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initMaintenance();
}
