import { Elements } from '../../core/elements.js';
import { navigateToPage, toggleSidebarCollapse, loadSidebarState } from '../../utils/navigation.js';
import { generateDiseaseGuide } from '../pages/diseases.js';
import { loadHistoryPage } from '../pages/history.js';
import { initWeatherPage } from '../pages/weather.js';

export function initSidebar() {
    loadSidebarState();
    attachSidebarEventListeners();
}

function attachSidebarEventListeners() {
    if (Elements.sidebarToggle) {
        Elements.sidebarToggle.addEventListener('click', toggleSidebarCollapse);
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const pageId = this.getAttribute('data-page');
            
            // Check if we're on the forum page
            const isOnForumPage = window.location.pathname.endsWith('forum.html');
            
            if (isOnForumPage) {
                // If on forum page and clicking a different nav item, navigate back to /app with the page parameter
                if (pageId !== 'forum') {
                    e.preventDefault();
                    window.location.href = `/app?page=${pageId}`;
                    // Also update URL without page reload for SPA behavior
                    window.history.pushState({}, '', `/app?page=${pageId}`);
                } else {
                    // If clicking forum link while already on forum, prevent default
                    e.preventDefault();
                }
            } else {
                // On /app, use the normal navigation
                if (this.tagName === 'A' && this.hasAttribute('href')) {
                    // If it's the forum link, update to use full path
                    if (this.getAttribute('href') === 'forum.html') {
                        this.href = '/forum.html';
                        return;
                    }
                }
                
                e.preventDefault();
                // Update URL to reflect the current page
                window.history.pushState({}, '', `/app?page=${pageId}`);
                handleNavigation(pageId);
            }
        });
    });
}

function handleNavigation(pageId) {
    const callbacks = {
        diseases: generateDiseaseGuide,
        history: () => loadHistoryPage(1)
    };

    navigateToPage(pageId, callbacks);
}
