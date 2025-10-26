const AdminHeader = (() => {
    const updateHeaderForPage = (pageId) => {
        const map = {
            users: {
                title: 'User Management',
                subtitle: 'Manage system users and permissions'
            },
            analytics: {
                title: 'Analytics',
                subtitle: 'System analytics and insights'
            },
            announcements: {
                title: 'Announcements',
                subtitle: 'Create and manage system announcements for all users'
            },
            settings: {
                title: 'Settings',
                subtitle: 'System configuration'
            },
            maintenance: {
                title: 'Maintenance Mode',
                subtitle: 'Schedule and manage system maintenance windows'
            }
        };

        const pageInfo = map[pageId] || { title: 'Dashboard', subtitle: 'System overview' };
        const headerTitle = document.getElementById('headerPageTitle');
        const headerSubtitle = document.getElementById('headerPageSubtitle');
        
        if (headerTitle) headerTitle.textContent = pageInfo.title;
        if (headerSubtitle) headerSubtitle.textContent = pageInfo.subtitle;
    };

    const updateUserDisplay = (user) => {
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement && user) {
            adminNameElement.textContent = user.name;
        }
    };

    const showLogoutConfirmation = () => {
        const logoutConfirmationModal = document.getElementById('logoutConfirmationModal');
        if (!logoutConfirmationModal) {
            console.error('Logout confirmation modal not found');
            return;
        }

        logoutConfirmationModal.classList.add('show');

        const handleConfirm = () => {
            logoutConfirmationModal.classList.remove('show');
            if (window.AdminApp && typeof window.AdminApp.logout === 'function') {
                window.AdminApp.logout();
            }
        };

        const handleCancel = () => {
            logoutConfirmationModal.classList.remove('show');
        };

        const handleOverlayClick = (e) => {
            if (e.target === logoutConfirmationModal) {
                handleCancel();
            }
        };

        // Set up event listeners
        const confirmBtn = logoutConfirmationModal.querySelector('.confirm-btn');
        const cancelBtn = logoutConfirmationModal.querySelector('.cancel-btn');

        if (confirmBtn) {
            confirmBtn.onclick = handleConfirm;
        }

        if (cancelBtn) {
            cancelBtn.onclick = handleCancel;
        }

        logoutConfirmationModal.onclick = handleOverlayClick;
    };

    const attachEventListeners = () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showLogoutConfirmation();
            });
        }
    };

    return {
        updateHeaderForPage,
        updateUserDisplay,
        attachEventListeners
    };
})();
