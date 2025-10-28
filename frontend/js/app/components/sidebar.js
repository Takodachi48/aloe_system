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
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            handleNavigation(pageId);
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
