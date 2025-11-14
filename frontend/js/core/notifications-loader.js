// Load the notifications component
export async function loadNotifications() {
    try {
        // Load the notifications HTML
        const response = await fetch('/components/notifications/notifications.html');
        if (!response.ok) {
            throw new Error('Failed to load notifications component');
        }
        
        const html = await response.text();
        const container = document.getElementById('notifications-container');
        if (container) {
            container.innerHTML = html;
            console.log('Notifications component loaded successfully');
            
            // Initialize notifications after the HTML is loaded
            if (!window.notifications) {
                const { Notifications } = await import('../app/components/notifications.js');
                window.notifications = new Notifications();
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading notifications component:', error);
        return false;
    }
}

// Initialize notifications when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // This will be called by the main app initialization
    if (window.initializeNotifications) {
        window.initializeNotifications();
    } else {
        // Fallback in case the main app doesn't call initializeNotifications
        loadNotifications().catch(console.error);
    }
});
