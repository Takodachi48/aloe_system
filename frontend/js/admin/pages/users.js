const AdminUsers = (() => {
    const loadUsers = async () => {
        try {
            if (!window.AdminAPI || typeof window.AdminAPI.getAllUsers !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            const response = await window.AdminAPI.getAllUsers();
            if (window.AdminState) {
                window.AdminState.users = response.data.users;
            }
            
            updateStats();
            renderUsersTable();
        } catch (error) {
            console.error('Failed to load users:', error);
            if (window.showError) {
                window.showError('Failed to load users');
            }
        }
    };

    const updateStats = () => {
        if (!window.AdminState || !window.AdminState.users) return;
        
        const totalUsers = window.AdminState.users.length;
        const activeUsers = window.AdminState.users.filter(u => u.isActive !== false).length;
        const adminCount = window.AdminState.users.filter(u => u.isAdmin).length;
        
        const totalEl = document.getElementById('totalUsers');
        const activeEl = document.getElementById('activeUsers');
        const adminEl = document.getElementById('adminCount');
        
        if (totalEl) totalEl.textContent = totalUsers;
        if (activeEl) activeEl.textContent = activeUsers;
        if (adminEl) adminEl.textContent = adminCount;
    };

    const renderUsersTable = () => {
        if (!window.AdminState || !window.AdminState.users) return;
        
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        if (window.AdminState.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = window.AdminState.users.map(user => `
            <tr class="${user.isActive === false ? 'user-inactive' : ''}" data-user-id="${user._id}">
                <td><strong>${escapeHtml(user.name)}</strong></td>
                <td>${user.username ? escapeHtml(user.username) : '<span class="text-muted">N/A</span>'}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>
                    <span class="user-role-badge ${user.isActive === false ? 'role-inactive' : (user.isAdmin ? 'role-admin' : 'role-user')}">
                        ${user.isAdmin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn ${user.isAdmin ? 'btn-secondary' : 'btn-primary'} btn-small btn-toggle-role" data-user-id="${user._id}" data-make-admin="${!user.isAdmin}" data-user-name="${escapeHtml(user.name)}">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <polyline points="17 11 19 13 23 9"></polyline>
                            </svg>
                            ${user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        ${user._id !== (window.AdminState?.user?.id) ? `
                            <button class="btn ${user.isActive === false ? 'btn-primary' : 'btn-secondary'} btn-small btn-toggle-status" data-user-id="${user._id}" data-activate="${user.isActive === false}" data-user-name="${escapeHtml(user.name)}">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    ${user.isActive === false ? 
                                        '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><polyline points="12 6 12 12 16 14"></polyline>' :
                                        '<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>'
                                    }
                                </svg>
                                ${user.isActive === false ? 'Activate' : 'Deactivate'}
                            </button>
                        ` : ''}
                        ${(!user.isAdmin || (window.AdminState?.users?.filter(u => u.isAdmin).length || 0) > 1) && user._id !== (window.AdminState?.user?.id) ? `
                            <button class="btn btn-danger btn-small btn-delete-user" data-user-id="${user._id}" data-user-name="${escapeHtml(user.name)}">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
        attachTableEventListeners();
    };

    const toggleUserRole = async (userId, makeAdmin, userName) => {
        const confirmed = await showConfirmDialog(
            makeAdmin ? 'Promote User' : 'Demote User',
            `Are you sure you want to ${makeAdmin ? 'promote' : 'demote'} "${userName}" ${makeAdmin ? 'to admin' : 'from admin'}?`,
            makeAdmin ? 'Promote' : 'Demote'
        );
        
        if (!confirmed) return;
        
        try {
            if (!window.AdminAPI || typeof window.AdminAPI.updateUserRole !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            await window.AdminAPI.updateUserRole(userId, makeAdmin);
            await loadUsers();
            if (window.showSuccess) {
                window.showSuccess('User role updated successfully');
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            if (window.showError) {
                window.showError('Failed to update user role');
            }
        }
    };

    const toggleUserStatus = async (userId, activate, userName) => {
        const confirmed = await showConfirmDialog(
            activate ? 'Activate User' : 'Deactivate User',
            `Are you sure you want to ${activate ? 'activate' : 'deactivate'} "${userName}"?`,
            activate ? 'Activate' : 'Deactivate',
            !activate
        );
        
        if (!confirmed) return;
        
        try {
            if (!window.AdminAPI || typeof window.AdminAPI.toggleUserStatus !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            await window.AdminAPI.toggleUserStatus(userId, activate);
            await loadUsers();
            if (window.showSuccess) {
                window.showSuccess(`User ${activate ? 'activated' : 'deactivated'} successfully`);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            if (window.showError) {
                window.showError('Failed to update user status');
            }
        }
    };

    const confirmDeleteUser = async (userId, userName) => {
        const confirmed = await showConfirmDialog(
            'Delete User',
            `Are you sure you want to delete user "${userName}"? This action cannot be undone.`,
            'Delete',
            true
        );
        
        if (confirmed) {
            deleteUser(userId);
        }
    };

    const deleteUser = async (userId) => {
        try {
            if (!window.AdminAPI || typeof window.AdminAPI.deleteUser !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            await window.AdminAPI.deleteUser(userId);
            await loadUsers();
            if (window.showSuccess) {
                window.showSuccess('User deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            if (window.showError) {
                window.showError('Failed to delete user');
            }
        }
    };

    const attachTableEventListeners = () => {
        document.querySelectorAll('.btn-toggle-role').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = btn.dataset.userId;
                const makeAdmin = btn.dataset.makeAdmin === 'true';
                const userName = btn.dataset.userName;
                toggleUserRole(userId, makeAdmin, userName);
            });
        });
        
        document.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = btn.dataset.userId;
                const activate = btn.dataset.activate === 'true';
                const userName = btn.dataset.userName;
                toggleUserStatus(userId, activate, userName);
            });
        });
        
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = btn.dataset.userId;
                const userName = btn.dataset.userName;
                confirmDeleteUser(userId, userName);
            });
        });
    };

    const init = async () => {
        const refreshBtn = document.getElementById('refreshUsersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadUsers);
        }
        await loadUsers();
    };

    return {
        loadUsers,
        updateStats,
        renderUsersTable,
        toggleUserRole,
        toggleUserStatus,
        confirmDeleteUser,
        deleteUser,
        init
    };
})();
