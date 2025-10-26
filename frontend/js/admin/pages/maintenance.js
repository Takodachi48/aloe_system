const AdminMaintenance = (() => {
    function updateMaintenanceStatus(status) {
        try {
            const systemStatusElement = document.querySelector('.system-status .status-value');
            const maintenanceStatusElement = document.querySelector('.maintenance-schedule .scheduled-status');
            const lastMaintenanceElement = document.querySelector('.maintenance-history .last-maintenance-date');
            const countdownElements = document.querySelectorAll('.maintenance-countdown');
            const completionTimeElement = document.querySelector('.completion-time');
            const completionPercentageElement = document.querySelector('.completion-percentage');
            const progressBar = document.querySelector('.progress-bar .fill');
            const statusDot = document.querySelector('.system-status .status-dot');
            const endMaintenanceBtn = document.getElementById('endMaintenanceBtn');
            
            if (!systemStatusElement || !maintenanceStatusElement || !lastMaintenanceElement) {
                console.warn('Required DOM elements not found for maintenance status');
                return;
            }
            
            if (status?.lastMaintenance) {
                const lastMaintenanceDate = new Date(status.lastMaintenance);
                lastMaintenanceElement.textContent = lastMaintenanceDate.toLocaleString();
            } else {
                lastMaintenanceElement.textContent = 'No previous maintenance';
            }
            
            if (status?.active && status.startDate && status.endDate) {
                const startDate = new Date(status.startDate);
                const endDate = new Date(status.endDate);
                const now = new Date();
                
                if (now < startDate) {
                    maintenanceStatusElement.textContent = `Scheduled for ${startDate.toLocaleString()}`;
                    if (completionTimeElement) {
                        completionTimeElement.textContent = `Scheduled to start at: ${startDate.toLocaleString()}`;
                        completionTimeElement.style.display = 'block';
                    }
                    if (completionPercentageElement) {
                        completionPercentageElement.style.display = 'none';
                    }
                    if (progressBar) {
                        progressBar.style.width = '0%';
                    }
                    
                    systemStatusElement.textContent = 'Active';
                    if (statusDot) {
                        statusDot.classList.remove('maintenance');
                        statusDot.classList.add('active');
                    }
                    
                    if (endMaintenanceBtn) {
                        endMaintenanceBtn.disabled = true;
                    }
                } else if (now <= endDate) {
                    maintenanceStatusElement.textContent = `Active until ${endDate.toLocaleString()}`;
                    
                    const total = endDate - startDate;
                    const elapsed = now - startDate;
                    const percentage = Math.min(100, Math.round((elapsed / total) * 100));
                    
                    if (completionPercentageElement) {
                        completionPercentageElement.style.display = 'block';
                        completionPercentageElement.textContent = `${percentage}% Complete`;
                    }
                    if (progressBar) {
                        progressBar.style.width = `${percentage}%`;
                    }
                    if (completionTimeElement) {
                        completionTimeElement.textContent = `Estimated completion: ${endDate.toLocaleTimeString()}`;
                        completionTimeElement.style.display = 'block';
                    }
                    
                    systemStatusElement.textContent = 'Under Maintenance';
                    if (statusDot) {
                        statusDot.classList.add('maintenance');
                        statusDot.classList.remove('active');
                    }
                    
                    if (endMaintenanceBtn) {
                        endMaintenanceBtn.disabled = false;
                    }
                    
                    AdminState.maintenance = { active: true, startDate, endDate };
                } else {
                    maintenanceStatusElement.textContent = 'No maintenance scheduled';
                    if (completionTimeElement) {
                        completionTimeElement.textContent = 'No active maintenance';
                        completionTimeElement.style.display = 'block';
                    }
                    if (progressBar) {
                        progressBar.style.width = '0%';
                    }
                    if (completionPercentageElement) {
                        completionPercentageElement.style.display = 'none';
                    }
                    
                    systemStatusElement.textContent = 'Active';
                    if (statusDot) {
                        statusDot.classList.remove('maintenance');
                        statusDot.classList.add('active');
                    }
                    
                    AdminState.maintenance = { active: false };
                }
                
                countdownElements.forEach(countdown => {
                    if (now >= startDate && now <= endDate) {
                        countdown.style.display = 'flex';
                        updateCountdown(endDate);
                    } else {
                        countdown.style.display = 'none';
                    }
                });
                
                if (status.history?.length > 0) {
                    const last = status.history[status.history.length - 1];
                    if (last?.startDate && last?.endDate) {
                        lastMaintenanceElement.textContent = `${new Date(last.startDate).toLocaleString()} - ${new Date(last.endDate).toLocaleString()}`;
                    } else {
                        lastMaintenanceElement.textContent = 'Previous maintenance';
                    }
                } else if (status.lastMaintenance) {
                    lastMaintenanceElement.textContent = `Last: ${new Date(status.lastMaintenance).toLocaleString()}`;
                } else {
                    lastMaintenanceElement.textContent = 'No previous maintenance';
                }
            } else {
                maintenanceStatusElement.textContent = 'No maintenance scheduled';
                completionTimeElement.textContent = 'No maintenance scheduled';
                if (completionPercentageElement) completionPercentageElement.style.display = 'none';
                if (progressBar) progressBar.style.width = '0%';
                
                systemStatusElement.textContent = 'System Active';
                document.querySelector('.system-status .status-dot').classList.add('active');
                document.querySelector('.system-status .status-dot').classList.remove('maintenance');
                
                countdownElements.forEach(countdown => {
                    countdown.style.display = 'none';
                });
                
                if (status?.lastMaintenance) {
                    lastMaintenanceElement.textContent = `Last: ${new Date(status.lastMaintenance).toLocaleString()}`;
                } else if (status?.history?.length > 0) {
                    const last = status.history[status.history.length - 1];
                    if (last?.endDate) {
                        lastMaintenanceElement.textContent = `Last: ${new Date(last.endDate).toLocaleString()}`;
                    } else {
                        lastMaintenanceElement.textContent = 'No previous maintenance';
                    }
                } else {
                    lastMaintenanceElement.textContent = 'No previous maintenance';
                }
                
                AdminState.maintenance = { active: false };
            }
        } catch (error) {
            console.error('Error updating maintenance status:', error);
        }
    }

    function updateCountdown(endDate) {
        const countdownValue = document.querySelector('.countdown-value');
        const now = new Date();
        const timeLeft = endDate - now;
        
        if (timeLeft <= 0) {
            if (countdownValue) countdownValue.textContent = '00:00:00';
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        if (countdownValue) {
            countdownValue.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    const MaintenanceManager = {
        checkInterval: null,
        lastCheck: null,
        lastStatus: null,
        isTabActive: true,
        retryCount: 0,
        maxRetries: 3,
        baseDelay: 30000,
        maxDelay: 300000,
        countdownInterval: null,
        
        init() {
            this.startPolling();
            
            document.addEventListener('visibilitychange', () => {
                this.isTabActive = !document.hidden;
                if (this.isTabActive) {
                    this.checkMaintenanceStatus();
                }
            });
        },
        
        startPolling() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
            
            this.checkMaintenanceStatus();
            this.scheduleNextCheck();
        },
        
        scheduleNextCheck() {
            if (this.checkInterval) {
                clearTimeout(this.checkInterval);
            }
            
            const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount), this.maxDelay);
            
            this.checkInterval = setTimeout(() => {
                this.checkMaintenanceStatus();
            }, delay);
        },
        
        async checkMaintenanceStatus() {
            if (!this.isTabActive) {
                this.scheduleNextCheck();
                return;
            }
            
            try {
                const token = getAuthToken();
                if (!token) {
                    return;
                }
                
                const url = new URL(`${AdminState.apiBaseUrl}/api/admin/maintenance/status`);
                url.searchParams.append('_', Date.now());
                
                const response = await fetch(url.toString(), {
                    headers: getAuthHeaders(),
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                
                const data = await response.json();
                this.handleMaintenanceData(data.data);
                
                this.retryCount = 0;
            } catch (error) {
                console.error('Error checking maintenance status:', error);
                this.retryCount++;
                
                if (this.retryCount > this.maxRetries) {
                    this.retryCount = this.maxRetries;
                }
            }
            
            this.scheduleNextCheck();
        },
        
        handleMaintenanceData(maintenanceData) {
            if (!maintenanceData) return;
            
            this.lastStatus = maintenanceData;
            this.lastCheck = new Date();
            
            updateMaintenanceStatus(maintenanceData);
            
            if (maintenanceData.active) {
                this.baseDelay = 10000;
                
                if (maintenanceData.endDate) {
                    const endDate = new Date(maintenanceData.endDate);
                    const now = new Date();
                    
                    if (now < endDate) {
                        updateCountdown(endDate);
                        
                        if (this.countdownInterval) {
                            clearInterval(this.countdownInterval);
                        }
                        
                        this.countdownInterval = setInterval(() => {
                            updateCountdown(endDate);
                        }, 1000);
                    } else if (this.countdownInterval) {
                        clearInterval(this.countdownInterval);
                        this.countdownInterval = null;
                    }
                }
            } else {
                this.baseDelay = 30000;
                
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }
        }
    };

    const handleMaintenanceFormSubmit = async (e) => {
        e.preventDefault();
        
        const startDate = document.getElementById('maintenanceStartDate').value;
        const endDate = document.getElementById('maintenanceEndDate').value;
        const announcementType = document.querySelector('input[name="announcementType"]:checked').value;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start < now) {
            showError('Start date must be in the future');
            return;
        }

        if (end <= start) {
            showError('End date must be after start date');
            return;
        }

        let title = '';
        let content = '';

        if (announcementType === 'custom') {
            title = document.getElementById('maintenanceTitle').value.trim();
            content = document.getElementById('maintenanceMessage').value.trim();

            if (!title) {
                showError('Please enter a title for the maintenance announcement');
                return;
            }

            if (!content) {
                showError('Please enter a custom message');
                return;
            }
        } else {
            title = 'Scheduled Maintenance';
            content = `The system will undergo scheduled maintenance from ${start.toLocaleString()} to ${end.toLocaleString()}. We apologize for any inconvenience.`;
        }

        try {
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'Scheduling...';

            const maintenanceResponse = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    message: content
                })
            });
            
            if (!maintenanceResponse.ok) {
                const error = await maintenanceResponse.json();
                throw new Error(error.message || 'Failed to schedule maintenance');
            }

            const maintenanceData = await maintenanceResponse.json();

            if (now >= start && now <= end) {
                AdminState.maintenance = { active: true, startDate: start, endDate: end };
            }

            updateMaintenanceStatus(maintenanceData.data);
            
            if (typeof AdminAnnouncements !== 'undefined' && AdminAnnouncements.loadAnnouncements) {
                AdminAnnouncements.loadAnnouncements();
            }

            showSuccess('Maintenance scheduled successfully');
            document.getElementById('maintenanceForm').reset();
            
            const customFields = document.querySelector('.custom-announcement-fields');
            if (customFields) {
                customFields.style.display = 'none';
            }
        } catch (error) {
            showError(error.message);
        } finally {
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = false;
            button.textContent = 'Schedule Maintenance';
        }
    };

    const handleStartMaintenanceNowSubmit = async (e) => {
        e.preventDefault();

        const duration = parseInt(document.getElementById('maintenanceDuration').value);
        const reason = document.getElementById('maintenanceReason').value;

        if (duration < 5 || duration > 1440) {
            showError('Duration must be between 5 and 1440 minutes');
            return;
        }

        try {
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'Starting...';

            const now = new Date();
            const end = new Date(now.getTime() + duration * 60000);

            const maintenanceResponse = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    startDate: now.toISOString(),
                    endDate: end.toISOString(),
                    message: reason || 'The system is currently undergoing maintenance. Please try again later.'
                })
            });

            if (!maintenanceResponse.ok) {
                const error = await maintenanceResponse.json();
                throw new Error(error.message || 'Failed to start maintenance');
            }

            const maintenanceData = await maintenanceResponse.json();

            AdminState.maintenance = { active: true, startDate: now, endDate: end };
            updateMaintenanceStatus(maintenanceData.data);
            
            if (typeof AdminAnnouncements !== 'undefined' && AdminAnnouncements.loadAnnouncements) {
                AdminAnnouncements.loadAnnouncements();
            }

            showSuccess('Maintenance started successfully');
            document.getElementById('startMaintenanceNowForm').reset();
        } catch (error) {
            showError(error.message);
        } finally {
            const button = e.target.querySelector('button[type="submit"]');
            button.disabled = false;
            button.textContent = 'Start Maintenance Now';
        }
    };

    const handleEndMaintenanceEarly = async () => {
        const endButton = document.getElementById('endMaintenanceBtn');
        if (!endButton) return;
        
        const confirmed = await showConfirmDialog(
            'End Maintenance Early',
            'Are you sure you want to end the maintenance window early? This will bring the system back online immediately.',
            'End Maintenance',
            true
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            endButton.disabled = true;
            endButton.textContent = 'Ending...';
            
            const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance/end-early`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to end maintenance');
            }
            
            const data = await response.json();
            showSuccess('Maintenance ended successfully');
            
            AdminState.maintenance = { active: false };
            updateMaintenanceStatus(data.data);
            
            if (typeof AdminAnnouncements !== 'undefined' && AdminAnnouncements.loadAnnouncements) {
                AdminAnnouncements.loadAnnouncements();
            }
            
        } catch (error) {
            console.error('Error ending maintenance:', error);
            showError(error.message || 'Failed to end maintenance');
        } finally {
            if (endButton) {
                endButton.disabled = false;
                endButton.textContent = 'End Maintenance Now';
            }
        }
    };

    const handleAnnouncementTypeChange = (e) => {
        const customFields = document.querySelector('.custom-announcement-fields');
        if (e.target.value === 'custom') {
            customFields.style.display = 'block';
        } else {
            customFields.style.display = 'none';
        }
    };

    const attachEventListeners = () => {
        const maintenanceForm = document.getElementById('maintenanceForm');
        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', handleMaintenanceFormSubmit);
        }

        const startMaintenanceNowForm = document.getElementById('startMaintenanceNowForm');
        if (startMaintenanceNowForm) {
            startMaintenanceNowForm.addEventListener('submit', handleStartMaintenanceNowSubmit);
        }

        const endMaintenanceBtn = document.getElementById('endMaintenanceBtn');
        if (endMaintenanceBtn) {
            endMaintenanceBtn.addEventListener('click', handleEndMaintenanceEarly);
        }

        const announcementTypeInputs = document.querySelectorAll('input[name="announcementType"]');
        announcementTypeInputs.forEach(input => {
            input.addEventListener('change', handleAnnouncementTypeChange);
        });

        MaintenanceManager.init();
    };

    return {
        attachEventListeners
    };
})();
