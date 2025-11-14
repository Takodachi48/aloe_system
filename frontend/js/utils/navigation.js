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
    },
    forum: {
        title: 'Community Forum',
        subtitle: 'Connect with other aloe vera enthusiasts and share your experiences'
    }
};

export function updateHeaderForPage(pageId) {
    console.log('Updating header for page:', pageId);
    const info = pageHeaderMap[pageId] || { title: 'AloeShield', subtitle: '' };
    
    // Debug: Log the elements we're trying to update
    const titleEl = Elements.headerPageTitle;
    const subtitleEl = Elements.headerPageSubtitle;
    
    console.log('Header elements:', { titleEl, subtitleEl });
    
    if (titleEl) {
        console.log('Setting title to:', info.title);
        titleEl.textContent = info.title;
    } else {
        console.error('Header title element not found!');
    }
    
    if (subtitleEl) {
        console.log('Setting subtitle to:', info.subtitle);
        subtitleEl.textContent = info.subtitle;
    } else {
        console.error('Header subtitle element not found!');
    }
}

// Function to show a specific page and hide others
export function showPage(pageId) {
    // Hide all pages first
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the target page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

export function navigateToPage(pageId, callbacks = {}) {
    // Update the URL to reflect the current page
    if (window.location.pathname !== '/forum.html') {
        const newUrl = `/app?page=${pageId}`;
        if (window.location.pathname + window.location.search !== newUrl) {
            window.history.pushState({ page: pageId }, '', newUrl);
        }
    }
    
    // Show the target page immediately
    showPage(pageId);
    
    // Update active state in navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });
    
    // Close mobile sidebar on small screens
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
    
    // Update header for the current page
    updateHeaderForPage(pageId);
    
    // Call the callback if provided
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
    const header = document.querySelector('.app-header, .admin-header');
    const sidebar = Elements.sidebar;
    
    if (!header || !sidebar) {
        console.warn('Header or sidebar element not found');
        return;
    }
    
    if (sidebar.classList.contains('collapsed')) {
        header.classList.add('sidebar-collapsed');
    } else {
        header.classList.remove('sidebar-collapsed');
    }
}
