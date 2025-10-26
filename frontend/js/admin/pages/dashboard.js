const AdminDashboard = (() => {
    const updateSystemStatus = (status) => {
        const statusDot = document.querySelector('.status-dot');
        const statusValue = document.querySelector('.status-value');
        
        if (!statusDot || !statusValue) return;
        
        statusDot.className = 'status-dot';
        
        if (status === 'maintenance') {
            statusDot.classList.add('maintenance');
            statusValue.textContent = 'Under Maintenance';
        } else {
            statusDot.classList.add('active');
            statusValue.textContent = 'System Active';
        }
        
        statusDot.style.animation = 'none';
        statusDot.offsetHeight;
        statusDot.style.animation = 'pulse 2s infinite';
    };

    const updateCountdown = (endDate) => {
        const countdownValue = document.querySelector('.countdown-value');
        const now = new Date();
        const timeLeft = endDate - now;
        
        if (!countdownValue) return;
        
        if (timeLeft <= 0) {
            countdownValue.textContent = '00:00:00';
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        countdownValue.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        setTimeout(() => updateCountdown(endDate), 1000);
    };

    const updateMaintenanceStatus = (status) => {
        try {
            const systemStatusElement = document.querySelector('.system-status .status-value');
            const maintenanceStatusElement = document.querySelector('.maintenance-schedule .scheduled-status');
            const lastMaintenanceElement = document.querySelector('.maintenance-history .last-maintenance-date');
            const countdownElements = document.querySelectorAll('.maintenance-countdown');
            const completionTimeElement = document.querySelector('.completion-time');
            const completionPercentageElement = document.querySelector('.completion-percentage');
            const progressBar = document.querySelector('.progress-bar .fill');
            const statusDot = document.querySelector('.system-status .status-dot');
            
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
                    }
                }
            } else {
                maintenanceStatusElement.textContent = 'No maintenance scheduled';
                if (completionTimeElement) {
                    completionTimeElement.textContent = 'No maintenance scheduled';
                }
                if (completionPercentageElement) {
                    completionPercentageElement.style.display = 'none';
                }
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
                
                systemStatusElement.textContent = 'System Active';
                if (statusDot) {
                    statusDot.classList.add('active');
                    statusDot.classList.remove('maintenance');
                }
                
                countdownElements.forEach(countdown => {
                    countdown.style.display = 'none';
                });
            }
        } catch (error) {
            console.error('Error updating maintenance status:', error);
        }
    };

    const updateCompletionStatus = (maintenance) => {
        const percentageEl = document.querySelector('.completion-percentage');
        const timeEl = document.querySelector('.completion-time');
        const progressBar = document.querySelector('.progress-bar .fill');
        
        if (!percentageEl || !timeEl || !progressBar) return;
        
        if (maintenance && maintenance.startDate && maintenance.endDate) {
            const start = new Date(maintenance.startDate);
            const end = new Date(maintenance.endDate);
            const now = new Date();
            
            if (now >= start && now <= end) {
                const total = end - start;
                const elapsed = now - start;
                const percentage = Math.round((elapsed / total) * 100);
                
                percentageEl.style.display = 'block';
                percentageEl.textContent = `${percentage}% Complete`;
                progressBar.style.width = `${percentage}%`;
                timeEl.textContent = `Estimated completion: ${end.toLocaleTimeString()}`;
            } else if (now < start) {
                percentageEl.style.display = 'none';
                progressBar.style.width = '0%';
                timeEl.textContent = `Starts at: ${start.toLocaleTimeString()}`;
            } else {
                percentageEl.style.display = 'none';
                progressBar.style.width = '0%';
                timeEl.textContent = 'No maintenance scheduled';
            }
        } else {
            percentageEl.style.display = 'none';
            progressBar.style.width = '0%';
            timeEl.textContent = 'No maintenance scheduled';
        }
    };

    const init = async () => {
        try {
            updateSystemStatus('active');
            if (window.CloudinaryManager && typeof window.CloudinaryManager.init === 'function') {
                await window.CloudinaryManager.init();
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    };

    return {
        updateSystemStatus,
        updateCountdown,
        updateMaintenanceStatus,
        updateCompletionStatus,
        init
    };
})();
