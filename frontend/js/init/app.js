import { initializeComponents } from '../core/loadComponents.js';

// Initialize components when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeComponents();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Show error to user
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-message" style="padding: 2rem; color: #dc3545;">
                    <h2>Application Error</h2>
                    <p>Failed to load the application. Please try refreshing the page.</p>
                    <p><small>${error.message}</small></p>
                </div>
            `;
        }
    }
});
