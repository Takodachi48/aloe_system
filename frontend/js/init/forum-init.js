// Import necessary functions
import { updateHeaderForPage } from '../utils/navigation.js';
import { 
    initHeader, 
    updateUserDisplay, 
    attachHeaderEventListeners 
} from '../app/components/header.js';
import { initSidebar } from '../app/components/sidebar.js';
import { getSavedUser } from '../services/auth.js';
import { AppState } from '../core/state.js';

// Load header and sidebar components for forum page
async function initializeForumPage() {
    try {
        // Hide all pages first
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show forum page
        const forumPage = document.getElementById('forumPage');
        if (forumPage) {
            forumPage.classList.add('active');
        }

        // Load header first
        try {
            const headerResponse = await fetch('components/header/app-header.html');
            if (!headerResponse.ok) throw new Error('Failed to load header');
            
            const headerHtml = await headerResponse.text();
            const headerContainer = document.getElementById('header-container');
            if (headerContainer) {
                // Clear existing content and event listeners
                headerContainer.innerHTML = '';
                // Add new header content
                headerContainer.innerHTML = headerHtml;
                
                // Update header for forum page after header is loaded
                if (typeof updateHeaderForPage === 'function') {
                    updateHeaderForPage('forum');
                }
                
                // Initialize header with user data
                try {
                    // Load saved user data if available
                    const savedUser = getSavedUser();
                    if (savedUser) {
                        AppState.user = savedUser;
                        console.log('Loaded user from storage:', savedUser);
                    }
                    
                    // Initialize header components
                    if (typeof initHeader === 'function') {
                        console.log('Initializing header...');
                        initHeader();
                    } else {
                        console.error('initHeader function not found');
                    }
                    
                    // Debug: Check if logout button exists
                    const logoutBtn = document.getElementById('logoutBtn');
                    console.log('Logout button element:', logoutBtn);
                    
                    // Manually add click handler as a fallback
                    if (logoutBtn) {
                        console.log('Adding direct click handler to logout button');
                        // Import showLogoutConfirmation and use it
                        import('../app/components/header.js').then(({ showLogoutConfirmation }) => {
                            logoutBtn.addEventListener('click', (e) => {
                                console.log('Logout button clicked - showing confirmation');
                                showLogoutConfirmation();
                            });
                            // Also ensure the event listener is properly set in the header
                            if (typeof attachHeaderEventListeners === 'function') {
                                attachHeaderEventListeners();
                            }
                        }).catch(error => {
                            console.error('Error importing header module:', error);
                        });
                    }
                    
                    // Manually update user display
                    if (typeof updateUserDisplay === 'function') {
                        console.log('Updating user display');
                        updateUserDisplay();
                    }
                } catch (error) {
                    console.error('Error initializing header:', error);
                    // Still try to init header even if user data load fails
                    if (typeof initHeader === 'function') initHeader();
                }
            }
        } catch (headerError) {
            console.error('Error loading header:', headerError);
        }

        // Load sidebar
        try {
            const sidebarResponse = await fetch('components/sidebar/app-sidebar.html');
            if (!sidebarResponse.ok) throw new Error('Failed to load sidebar');
            
            const sidebarHtml = await sidebarResponse.text();
            const sidebarContainer = document.getElementById('sidebar-container');
            
            if (sidebarContainer) {
                sidebarContainer.innerHTML = sidebarHtml;
                
                // Get all navigation items
                const navItems = document.querySelectorAll('.nav-item');
                const forumLink = document.getElementById('forumLink');
                
                // Remove active class from all items
                navItems.forEach(item => item.classList.remove('active'));
                
                // Add active class to forum link since we're on the forum page
                if (forumLink) {
                    forumLink.classList.add('active');
                    forumLink.href = '#'; // Prevent page reload when clicking the active forum link
                }
                
                // Set up navigation for all nav items
                navItems.forEach(item => {
                    // Skip if already handled or no data-page attribute
                    if (item.id === 'forumLink' || !item.hasAttribute('data-page')) return;
                    
                    const page = item.getAttribute('data-page');
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Navigate to /app with the page parameter
                        window.location.href = `/app?page=${page}`;
                    });
                });

                // Initialize sidebar if function exists
                if (typeof initSidebar === 'function') {
                    initSidebar();
                }
            }
        } catch (sidebarError) {
            console.error('Error loading sidebar:', sidebarError);
        }

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (window.location.pathname === '/app') {
                const urlParams = new URLSearchParams(window.location.search);
                const page = urlParams.get('page') || 'analyze';
                const targetPage = document.getElementById(`${page}Page`);
                if (targetPage) {
                    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                    targetPage.classList.add('active');
                    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                    const activeNav = document.querySelector(`[data-page="${page}"]`);
                    if (activeNav) activeNav.classList.add('active');
                    if (typeof updateHeaderForPage === 'function') {
                        updateHeaderForPage(page);
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error initializing forum page:', error);
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForumPage);
} else {
    initializeForumPage();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForumPage);
} else {
    initializeForumPage();
}
