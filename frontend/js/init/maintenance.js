import MaintenanceHandler from '../utils/maintenanceHandler.js';

// Initialize the maintenance handler with debug logging
console.log('Maintenance handler initialization started');

const initMaintenance = () => {
    console.log('Initializing maintenance handler');
    try {
        window.maintenanceHandler = new MaintenanceHandler();
        console.log('Maintenance handler initialized successfully');
        
        // Force a maintenance check immediately after initialization
        setTimeout(() => {
            console.log('Performing initial maintenance check...');
            window.maintenanceHandler.checkMaintenanceStatus().catch(err => {
                console.error('Error in initial maintenance check:', err);
            });
        }, 1000);
    } catch (error) {
        console.error('Failed to initialize maintenance handler:', error);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing maintenance handler');
    initMaintenance();
});

// Also check if the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing maintenance handler immediately');
    initMaintenance();
}
