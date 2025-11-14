// Import necessary functions
import { navigateToPage } from '../../utils/navigation.js';

// Forum page functionality
let isInitialized = false;

export async function initForum() {
    if (isInitialized) return;
    
    // Initialize forum page
    initForumPage();
    
    // Add event listeners for forum interactions
    setupForumEventListeners();
    
    isInitialized = true;
}

// For direct script loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForum);
} else {
    initForum();
}

/**
 * Initialize the forum page
 */
function initForumPage() {
    // Update active state in the sidebar
    const forumLink = document.querySelector('.nav-item[data-page="forum"]');
    if (forumLink) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        forumLink.classList.add('active');
    }
    
    // Update header for forum page
    if (typeof updateHeaderForPage === 'function') {
        updateHeaderForPage('forum');
    }
    
    // Make sure the forum page is visible
    const forumPage = document.getElementById('forumPage');
    if (forumPage) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        forumPage.classList.add('active');
    }
}

/**
 * Set up event listeners for forum interactions
 */
function setupForumEventListeners() {
    // Create new post button
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', handleCreatePost);
    }
    
    // Handle navigation in the sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        // Remove any existing click handlers to prevent duplicates
        item.removeEventListener('click', handleNavItemClick);
        item.addEventListener('click', handleNavItemClick);
    });
}

function handleNavItemClick(e) {
    const pageId = this.getAttribute('data-page');
    if (!pageId) return;
    
    if (pageId === 'forum') {
        // If already on forum page, just prevent default
        e.preventDefault();
        return;
    }
    
    // For other pages, navigate back to index.html with the page parameter
    e.preventDefault();
    window.location.href = `index.html?page=${pageId}`;
}

/**
 * Handle create post button click
 * @param {Event} e - The click event
 */
function handleCreatePost(e) {
    e.preventDefault();
    // TODO: Implement create post functionality
    console.log('Create post clicked');
    // For now, just show an alert
    alert('Create post functionality will be implemented in the next phase!');
}

/**
 * Handle navigation to external pages (back to index.html)
 * @param {Event} e - The click event
 */
function handleExternalNavigation(e) {
    const pageId = this.getAttribute('data-page');
    if (pageId) {
        e.preventDefault();
        window.location.href = `index.html?page=${pageId}`;
    }
}

// Export functions for testing or future use
export {
    initForumPage,
    setupForumEventListeners,
    handleCreatePost,
    handleExternalNavigation
};
