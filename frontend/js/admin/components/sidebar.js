const AdminSidebar = (() => {
    const navigateToPage = (pageId) => {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        const activeNavItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        const activePage = document.getElementById(`${pageId}Page`);
        if (activePage) {
            activePage.classList.add('active');
            AdminHeader.updateHeaderForPage(pageId);
        }
    };

    const toggleMobileSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('show');
    };

    const closeMobileSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('show');
    };

    const toggleSidebarCollapse = () => {
        const sidebar = document.getElementById('sidebar');
        const header = document.querySelector('.admin-header');
        const content = document.querySelector('.admin-content');
        
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            if (header) header.classList.toggle('sidebar-collapsed');
            if (content) content.classList.toggle('sidebar-collapsed');
        }
    };

    const attachEventListeners = () => {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.getAttribute('data-page');
                navigateToPage(pageId);
                closeMobileSidebar();
            });
        });

        const mobileNavToggle = document.getElementById('mobileNavToggle');
        if (mobileNavToggle) {
            mobileNavToggle.addEventListener('click', toggleMobileSidebar);
        }

        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeMobileSidebar);
        }

        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', toggleSidebarCollapse);
        }
    };

    return {
        navigateToPage,
        toggleMobileSidebar,
        closeMobileSidebar,
        toggleSidebarCollapse,
        attachEventListeners
    };
})();
