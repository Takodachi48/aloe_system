import { Elements } from './elements.js';
import { updateHeaderForPage } from '../utils/navigation.js';

/**
 * Loads components (header and sidebar) into the page
 * This module should be imported in both index.html and admin.html
 */

// Check if we're in the admin section
const isAdminPage = window.location.pathname.includes('admin.html');

// Set the paths for the components
const headerPath = isAdminPage 
    ? 'components/header/admin-header.html' 
    : 'components/header/app-header.html';
    
const sidebarPath = isAdminPage 
    ? 'components/sidebar/admin-sidebar.html' 
    : 'components/sidebar/app-sidebar.html';

/**
 * Load a component into the specified container
 * @param {string} containerId - The ID of the container element
 * @param {string} path - The path to the component HTML file
 * @returns {Promise} A promise that resolves when the component is loaded
 */
async function loadComponent(containerId, path) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID '${containerId}' not found`);
        throw new Error(`Container not found: ${containerId}`);
    }

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        container.innerHTML = html;
        console.log(`Component loaded: ${path}`);
        return true;
    } catch (error) {
        console.error(`Error loading component from ${path}:`, error);
        container.innerHTML = `
            <div class="error-message">
                Error loading component: ${path.split('/').pop()}
            </div>
        `;
        throw error;
    }
}

/**
 * Initialize the components
 */
export async function initializeComponents() {
    try {
        // Load components in parallel
        await Promise.all([
            loadComponent('header-container', headerPath),
            loadComponent('sidebar-container', sidebarPath)
        ]);

        // Initialize any component-specific functionality
        if (isAdminPage) {
            // Initialize admin-specific components if needed
        } else {
            // Initialize regular app components
            const { initializeApp } = await import('../app/app.js');
            await initializeApp();
        }

        return true;
    } catch (error) {
        console.error('Error initializing components:', error);
        throw error;
    }
}

// Auto-initialize when loaded directly
if (import.meta.url === document.currentScript?.src) {
    document.addEventListener('DOMContentLoaded', () => {
        initializeComponents().catch(console.error);
    });
}

export default {
    initializeComponents,
    loadComponent
};
