import { Elements } from '../core/elements.js';

const pageHeaderMap = {
    weather: {
        title: 'Weather Forecast & Disease Risk',
        subtitle: 'Monitor weather conditions to prevent aloe vera diseases'
    },
    analyze: {
        title: 'Disease Analysis',
        subtitle: 'Upload an image of your aloe vera plant for AI-powered health analysis'
    },
    history: {
        title: 'Analysis History',
        subtitle: 'View your previous plant health analyses'
    },
    diseases: {
        title: 'Disease Guide',
        subtitle: 'Learn about common aloe vera diseases and their treatments'
    },
    settings: {
        title: 'Settings',
        subtitle: 'Configure your preferences'
    }
};

export function updateHeaderForPage(pageId) {
    const info = pageHeaderMap[pageId] || { title: 'AloeShield', subtitle: '' };
    if (Elements.headerPageTitle) Elements.headerPageTitle.textContent = info.title;
    if (Elements.headerPageSubtitle) Elements.headerPageSubtitle.textContent = info.subtitle;
}

export function navigateToPage(pageId, callbacks = {}) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
    
    updateHeaderForPage(pageId);
    
    if (callbacks[pageId]) {
        callbacks[pageId]();
    }
}

export function closeMobileSidebar() {
    if (Elements.sidebar) Elements.sidebar.classList.remove('open');
    if (Elements.sidebarOverlay) Elements.sidebarOverlay.classList.remove('show');
}

export function toggleMobileSidebar() {
    if (Elements.sidebar) Elements.sidebar.classList.toggle('open');
    if (Elements.sidebarOverlay) Elements.sidebarOverlay.classList.toggle('show');
}

export function toggleSidebarCollapse() {
    const isCollapsed = Elements.sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
        Elements.sidebar.classList.remove('collapsed');
        Elements.mainContent.classList.remove('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', 'false');
    } else {
        Elements.sidebar.classList.add('collapsed');
        Elements.mainContent.classList.add('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', 'true');
    }
    
    updateHeaderOnSidebarToggle();
}

export function loadSidebarState() {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        Elements.sidebar.classList.add('collapsed');
        Elements.mainContent.classList.add('sidebar-collapsed');
    }
    updateHeaderOnSidebarToggle();
}

function updateHeaderOnSidebarToggle() {
    const header = document.querySelector('.app-header');
    const sidebar = Elements.sidebar;
    
    if (sidebar.classList.contains('collapsed')) {
        header.classList.add('sidebar-collapsed');
    } else {
        header.classList.remove('sidebar-collapsed');
    }
}
