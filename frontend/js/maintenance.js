// Maintenance UI Helper Functions
function getMaintenanceFormElements() {
    return {
        form: document.getElementById('maintenanceForm'),
        startDateInput: document.getElementById('maintenanceStartDate'),
        endDateInput: document.getElementById('maintenanceEndDate'),
        announcementTypeInputs: document.querySelectorAll('input[name="announcementType"]'),
        customMessageArea: document.querySelector('.custom-announcement-fields'),
        maintenanceCancelBtn: document.getElementById('cancelMaintenanceBtn')
    };

    // Set min date to now for start date
    function updateMinDates() {
        const now = new Date();
        const formattedNow = now.toISOString().slice(0, 16);
        startDateInput.min = formattedNow;
        
        if (startDateInput.value) {
            endDateInput.min = startDateInput.value;
        } else {
            endDateInput.min = formattedNow;
        }
    }

    // Initial min dates
    updateMinDates();

    // Update min dates every minute
    setInterval(updateMinDates, 60000);

    // Update end date min when start date changes
    startDateInput.addEventListener('change', () => {
        endDateInput.min = startDateInput.value;
        if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
            endDateInput.value = startDateInput.value;
        }
    });

    // Handle announcement type selection
    announcementTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            customMessageArea.style.display = input.value === 'custom' ? 'block' : 'none';
        });
    });

    // Schedule maintenance form submission
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            
            // Get message based on announcement type
            const selectedType = document.querySelector('input[name="announcementType"]:checked').value;
            let message;
            
            if (selectedType === 'custom') {
                message = maintenanceForm.querySelector('[name="message"]').value;
                if (!message.trim()) {
                    showNotification('Please enter a custom message', 'error');
                    return;
                }
            } else {
                message = "System is under maintenance. Please try again later.";
            }

            const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    message
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to schedule maintenance');
            }

            showNotification('Maintenance scheduled successfully', 'success');
            maintenanceForm.reset();
            
            // Update UI with new maintenance status
            updateMaintenanceStatus(data.data);
            updateCompletionStatus(data.data);
            if (data.data.active) {
                updateSystemStatus('maintenance');
            }
        } catch (error) {
            console.error('Error scheduling maintenance:', error);
            showNotification(error.message, 'error');
        }
    });

    // Cancel maintenance handler
    if (maintenanceCancelBtn) {
        maintenanceCancelBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${AdminState.apiBaseUrl}/api/admin/maintenance/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    }
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to cancel maintenance');
                }

                showNotification('Maintenance canceled successfully', 'success');
                maintenanceForm.reset();
                
                // Reset UI state
                updateSystemStatus('active');
                const maintenanceData = {
                    active: false,
                    startDate: null,
                    endDate: null,
                    message: null
                };
                updateMaintenanceStatus(maintenanceData);
                updateCompletionStatus(maintenanceData);
            } catch (error) {
                console.error('Error canceling maintenance:', error);
                showNotification(error.message, 'error');
            }
        });
    }
}

// Initialize when document is ready
function init() {
    if (typeof initializeMaintenance === 'function') {
        initializeMaintenance();
    } else {
        // If the function isn't available yet, wait a bit and try again
        setTimeout(init, 100);
    }
}

document.addEventListener('DOMContentLoaded', init);
