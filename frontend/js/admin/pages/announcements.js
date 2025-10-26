const AdminAnnouncements = (() => {
    const isAnnouncementExpired = (announcement) => {
        if (announcement.type === 'maintenance' && announcement.endDate) {
            const now = new Date();
            const endDate = new Date(announcement.endDate);
            return now > endDate;
        }
        if (announcement.endDate) {
            const now = new Date();
            const endDate = new Date(announcement.endDate);
            return now > endDate;
        }
        return false;
    };

    const loadAnnouncements = async () => {
        try {
            if (!window.AdminAPI || typeof window.AdminAPI.getAllAnnouncements !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            const response = await window.AdminAPI.getAllAnnouncements();
            if (window.AdminState) {
                window.AdminState.announcements = response.data.announcements;
            }
            
            updateAnnouncementStats();
            renderAnnouncementsTable();
        } catch (error) {
            console.error('Failed to load announcements:', error);
            if (window.showError) {
                window.showError('Failed to load announcements');
            }
        }
    };

    const updateAnnouncementStats = () => {
        if (!window.AdminState || !window.AdminState.announcements) return;
        
        const totalAnnouncements = window.AdminState.announcements.length;
        const activeAnnouncements = window.AdminState.announcements.filter(a => 
            a.isActive && !isAnnouncementExpired(a)
        ).length;

        const totalEl = document.getElementById('totalAnnouncements');
        const activeEl = document.getElementById('activeAnnouncements');
        
        if (totalEl) totalEl.textContent = totalAnnouncements;
        if (activeEl) activeEl.textContent = activeAnnouncements;
    };

    const renderAnnouncementsTable = () => {
        if (!window.AdminState || !window.AdminState.announcements) return;
        
        const tbody = document.getElementById('announcementsTableBody');
        if (!tbody) return;

        if (window.AdminState.announcements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No announcements found</td></tr>';
            return;
        }

        tbody.innerHTML = window.AdminState.announcements.map(announcement => {
            const isExpired = isAnnouncementExpired(announcement);
            let statusBadge;
            if (isExpired) {
                statusBadge = '<span class="status-badge status-expired">Expired</span>';
            } else if (announcement.isActive) {
                statusBadge = '<span class="status-badge status-active">Active</span>';
            } else {
                statusBadge = '<span class="status-badge status-inactive">Inactive</span>';
            }
            
            const tr = `
            <tr class="${isExpired ? 'announcement-expired' : ''}" data-announcement-id="${announcement._id}">
                <td><strong>${escapeHtml(announcement.title)}</strong></td>
                <td>${escapeHtml(announcement.content)}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(announcement.startDate)}</td>
                <td>${announcement.endDate ? formatDate(announcement.endDate) : 'No expiration'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-small btn-edit-announcement" data-announcement-id="${announcement._id}">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                        </button>
                        ${!isExpired ? `
                            <button class="btn ${announcement.isActive ? 'btn-secondary' : 'btn-primary'} btn-small btn-toggle-status" data-announcement-id="${announcement._id}" data-activate="${!announcement.isActive}">
                                <svg viewBox="0 0 24 24" width="14" height="14">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
                                </svg>
                                ${announcement.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-small btn-delete-announcement" data-announcement-id="${announcement._id}">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>`;
            return tr;
        }).join('');

        attachAnnouncementEventListeners();
    };

    const toggleAnnouncementStatus = async (announcementId, activate) => {
        const announcement = window.AdminState?.announcements?.find(a => a._id === announcementId);
        if (!announcement) return;
        
        if (isAnnouncementExpired(announcement)) {
            if (window.showError) {
                window.showError('Cannot modify expired announcements');
            }
            return;
        }

        try {
            if (!window.AdminAPI || typeof window.AdminAPI.toggleAnnouncementStatus !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            await window.AdminAPI.toggleAnnouncementStatus(announcementId, activate);
            await loadAnnouncements();
            if (window.showSuccess) {
                window.showSuccess(`Announcement ${activate ? 'activated' : 'deactivated'} successfully`);
            }
        } catch (error) {
            console.error('Failed to toggle announcement status:', error);
            if (window.showError) {
                window.showError('Failed to update announcement status');
            }
        }
    };

    const confirmDeleteAnnouncement = async (announcementId) => {
        const announcement = window.AdminState?.announcements?.find(a => a._id === announcementId);
        if (!announcement) return;

        const confirmed = await showConfirmDialog(
            'Delete Announcement',
            `Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`,
            'Delete',
            true
        );

        if (confirmed) {
            deleteAnnouncement(announcementId);
        }
    };

    const deleteAnnouncement = async (announcementId) => {
        try {
            if (!window.AdminAPI || typeof window.AdminAPI.deleteAnnouncement !== 'function') {
                throw new Error('AdminAPI not available');
            }
            
            await window.AdminAPI.deleteAnnouncement(announcementId);
            await loadAnnouncements();
            if (window.showSuccess) {
                window.showSuccess('Announcement deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete announcement:', error);
            if (window.showError) {
                window.showError('Failed to delete announcement');
            }
        }
    };

    const setupCustomSelect = (wrapper) => {
        const select = wrapper.querySelector('select');
        if (!select) return;
        
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select__trigger';
        const triggerSpan = document.createElement('span');
        const selectedOption = select.options[select.selectedIndex];
        triggerSpan.textContent = selectedOption ? selectedOption.text : '';
        const arrow = document.createElement('div');
        arrow.className = 'arrow';
        trigger.appendChild(triggerSpan);
        trigger.appendChild(arrow);
        
        const options = document.createElement('div');
        options.className = 'custom-options';
        
        Array.from(select.options).forEach(option => {
            const customOption = document.createElement('span');
            customOption.className = 'custom-option';
            if (option.selected) customOption.classList.add('selected');
            customOption.setAttribute('data-value', option.value);
            customOption.textContent = option.text;
            
            customOption.addEventListener('click', (e) => {
                e.preventDefault();
                triggerSpan.textContent = option.text;
                select.value = option.value;
                
                options.querySelectorAll('.custom-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                customOption.classList.add('selected');
                
                customSelect.classList.remove('open');
                
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            });
            
            options.appendChild(customOption);
        });
        
        customSelect.appendChild(trigger);
        customSelect.appendChild(options);
        
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            customSelect.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });
        
        wrapper.appendChild(customSelect);
    };

    const openCreateAnnouncementModal = () => {
        const modal = document.getElementById('announcementModal');
        if (!modal) return;
        
        closeAnnouncementModal();
        
        const form = document.getElementById('announcementForm');
        if (form) form.reset();
        
        const typeSelect = document.getElementById('announcementType');
        const prioritySelect = document.getElementById('announcementPriority');
        
        if (typeSelect) {
            typeSelect.value = 'info';
            typeSelect.style.display = 'none';
        }
        
        if (prioritySelect) {
            prioritySelect.value = 'moderate';
            prioritySelect.style.display = 'none';
        }
        
        const selectWrappers = modal.querySelectorAll('.custom-select-wrapper');
        selectWrappers.forEach(wrapper => {
            const existingCustom = wrapper.querySelector('.custom-select');
            if (existingCustom) {
                existingCustom.remove();
            }
            setupCustomSelect(wrapper);
        });
        
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('announcementStartDate').value = now.toISOString().slice(0, 16);
        
        const title = modal.querySelector('#announcementModalTitle');
        const saveBtn = modal.querySelector('#saveAnnouncementBtn');
        if (title) title.textContent = 'Create Announcement';
        if (saveBtn) {
            saveBtn.textContent = 'Create Announcement';
            saveBtn.dataset.mode = 'create';
            delete saveBtn.dataset.announcementId;
        }
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        void modal.offsetHeight;
        
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    };

    const openEditAnnouncementModal = (announcementId) => {
        const announcement = window.AdminState?.announcements?.find(a => a._id === announcementId);
        if (!announcement) return;

        const modal = document.getElementById('announcementModal');
        if (!modal) return;
        
        closeAnnouncementModal();
        
        const form = document.getElementById('announcementForm');
        if (!form) return;
        
        form.reset();
        
        document.getElementById('announcementTitle').value = announcement.title || '';
        document.getElementById('announcementContent').value = announcement.content || '';
        
        const typeSelect = document.getElementById('announcementType');
        const prioritySelect = document.getElementById('announcementPriority');
        
        if (typeSelect) {
            const typeMapping = {
                'important': 'important',
                'error': 'important',
                'warning': 'warning',
                'success': 'success',
                'info': 'info'
            };
            
            const frontendType = typeMapping[announcement.type] || 'info';
            
            if (!Array.from(typeSelect.options).some(opt => opt.value === frontendType)) {
                const option = new Option(frontendType.charAt(0).toUpperCase() + frontendType.slice(1), frontendType);
                typeSelect.add(option);
            }
            
            typeSelect.value = frontendType;
            typeSelect.style.display = 'none';
        }
        
        if (prioritySelect) {
            const validPriorities = ['low', 'moderate', 'high'];
            const priorityValue = validPriorities.includes(announcement.priority) ? announcement.priority : 'moderate';
            prioritySelect.value = priorityValue;
            prioritySelect.style.display = 'none';
        }
        
        const selectWrappers = modal.querySelectorAll('.custom-select-wrapper');
        selectWrappers.forEach(wrapper => {
            const existingCustom = wrapper.querySelector('.custom-select');
            if (existingCustom) {
                existingCustom.remove();
            }
            setupCustomSelect(wrapper);
        });
        
        setTimeout(() => {
            const updateCustomSelectDisplay = (selectId, value) => {
                const select = document.getElementById(selectId);
                if (!select) return;
                
                const wrapper = select.closest('.custom-select-wrapper');
                if (!wrapper) return;
                
                const customSelect = wrapper.querySelector('.custom-select');
                if (!customSelect) return;
                
                const trigger = customSelect.querySelector('.custom-select__trigger span');
                const options = customSelect.querySelectorAll('.custom-option');
                
                if (trigger) {
                    const selectedOption = Array.from(select.options).find(opt => opt.value === value);
                    if (selectedOption) {
                        trigger.textContent = selectedOption.text || '';
                    }
                }
                
                if (options && value) {
                    options.forEach(opt => {
                        opt.classList.toggle('selected', opt.dataset.value === value);
                    });
                }
            };
            
            updateCustomSelectDisplay('announcementType', announcement.type || 'info');
            updateCustomSelectDisplay('announcementPriority', announcement.priority || 'moderate');
        }, 50);
        
        const isActiveCheckbox = document.getElementById('announcementIsActive');
        if (isActiveCheckbox) {
            isActiveCheckbox.checked = announcement.isActive !== false;
        }
        
        const startDate = new Date(announcement.startDate);
        startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
        const startDateInput = document.getElementById('announcementStartDate');
        if (startDateInput) {
            startDateInput.value = startDate.toISOString().slice(0, 16);
        }
        
        const endDateInput = document.getElementById('announcementEndDate');
        if (endDateInput) {
            if (announcement.endDate) {
                const endDate = new Date(announcement.endDate);
                endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
                endDateInput.value = endDate.toISOString().slice(0, 16);
            } else {
                endDateInput.value = '';
            }
        }
        
        const title = document.getElementById('announcementModalTitle');
        const saveBtn = document.getElementById('saveAnnouncementBtn');
        
        if (title) title.textContent = 'Edit Announcement';
        if (saveBtn) {
            saveBtn.textContent = 'Update Announcement';
            saveBtn.dataset.mode = 'edit';
            saveBtn.dataset.announcementId = announcementId;
        }
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        void modal.offsetHeight;
        
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    };

    const closeAnnouncementModal = () => {
        const modal = document.getElementById('announcementModal');
        if (!modal) return;
        
        if (modal.classList.contains('closing') || !modal.classList.contains('show')) {
            return;
        }
        
        modal.classList.add('closing');
        modal.classList.remove('show');
        modal.style.pointerEvents = 'none';
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            modal.style.pointerEvents = '';
            
            const form = document.getElementById('announcementForm');
            if (form) {
                form.reset();
            }
            
            const selectWrappers = modal.querySelectorAll('.custom-select-wrapper');
            selectWrappers.forEach(wrapper => {
                const existingCustom = wrapper.querySelector('.custom-select');
                if (existingCustom) {
                    existingCustom.remove();
                }
                
                const originalSelect = wrapper.querySelector('select');
                if (originalSelect) {
                    originalSelect.style.display = 'block';
                }
            });
            
            document.querySelectorAll('.custom-select').forEach(dropdown => {
                if (dropdown.classList.contains('open')) {
                    dropdown.classList.remove('open');
                }
            });
            
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            
            document.querySelectorAll('.custom-select__trigger').forEach(trigger => {
                if (trigger.nextElementSibling) {
                    trigger.nextElementSibling.style.display = 'none';
                }
            });
            
            void modal.offsetHeight;
        }, 300);
    };

    const saveAnnouncement = async () => {
        const form = document.getElementById('announcementForm');
        const saveBtn = document.getElementById('saveAnnouncementBtn');
        const mode = saveBtn.dataset.mode;
        const isEdit = mode === 'edit';

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const announcementData = Object.fromEntries(formData.entries());

        const typeSelect = document.getElementById('announcementType');
        const prioritySelect = document.getElementById('announcementPriority');
        
        if (typeSelect) {
            announcementData.type = typeSelect.value || 'info';
        }
        
        if (prioritySelect) {
            announcementData.priority = prioritySelect.value;
        }

        announcementData.isActive = document.getElementById('announcementIsActive').checked;

        if (announcementData.startDate) {
            announcementData.startDate = new Date(announcementData.startDate).toISOString();
        }
        if (announcementData.endDate) {
            announcementData.endDate = new Date(announcementData.endDate).toISOString();
        }

        try {
            if (!window.AdminAPI) {
                throw new Error('AdminAPI not available');
            }
            
            if (isEdit) {
                const announcementId = saveBtn.dataset.announcementId;
                if (typeof window.AdminAPI.updateAnnouncement !== 'function') {
                    throw new Error('updateAnnouncement not available');
                }
                await window.AdminAPI.updateAnnouncement(announcementId, announcementData);
                if (window.showSuccess) {
                    window.showSuccess('Announcement updated successfully');
                }
            } else {
                if (typeof window.AdminAPI.createAnnouncement !== 'function') {
                    throw new Error('createAnnouncement not available');
                }
                await window.AdminAPI.createAnnouncement(announcementData);
                if (window.showSuccess) {
                    window.showSuccess('Announcement created successfully');
                }
            }

            closeAnnouncementModal();
            await loadAnnouncements();
        } catch (error) {
            console.error('Failed to save announcement:', error);
            if (window.showError) {
                window.showError(`Failed to ${isEdit ? 'update' : 'create'} announcement`);
            }
        }
    };

    const attachAnnouncementEventListeners = () => {
        document.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const announcementId = btn.dataset.announcementId;
                const activate = btn.dataset.activate === 'true';
                toggleAnnouncementStatus(announcementId, activate);
            });
        });

        document.querySelectorAll('.btn-edit-announcement').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const announcementId = btn.dataset.announcementId;
                openEditAnnouncementModal(announcementId);
            });
        });

        document.querySelectorAll('.btn-delete-announcement').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const announcementId = btn.dataset.announcementId;
                confirmDeleteAnnouncement(announcementId);
            });
        });
    };

    const init = async () => {
        const createBtn = document.getElementById('createAnnouncementBtn');
        if (createBtn) {
            createBtn.addEventListener('click', openCreateAnnouncementModal);
        }
        
        const closeBtn = document.getElementById('closeAnnouncementModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAnnouncementModal);
        }
        
        const cancelBtn = document.getElementById('cancelAnnouncementBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeAnnouncementModal);
        }
        
        const saveBtn = document.getElementById('saveAnnouncementBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAnnouncement);
        }
        
        await loadAnnouncements();
    };

    return {
        loadAnnouncements,
        updateAnnouncementStats,
        renderAnnouncementsTable,
        toggleAnnouncementStatus,
        confirmDeleteAnnouncement,
        deleteAnnouncement,
        openCreateAnnouncementModal,
        openEditAnnouncementModal,
        closeAnnouncementModal,
        saveAnnouncement,
        init
    };
})();
