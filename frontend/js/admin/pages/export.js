// Import auth service
import { getAuthToken, checkAuthentication } from '../../services/auth.js';

// Initialize export page functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication status
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
        return; // Redirect will be handled by checkAuthentication
    }
    // Initialize custom selects
    const setupCustomSelects = () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            const select = wrapper.querySelector('select');
            if (!select) return;
            
            // Don't initialize if already done
            if (wrapper.querySelector('.custom-select')) return;
            
            const customSelect = document.createElement('div');
            customSelect.className = 'custom-select';
            
            // Create trigger
            const trigger = document.createElement('div');
            trigger.className = 'custom-select__trigger';
            const triggerSpan = document.createElement('span');
            const selectedOption = select.options[select.selectedIndex];
            triggerSpan.textContent = selectedOption ? selectedOption.text : '';
            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            trigger.appendChild(triggerSpan);
            trigger.appendChild(arrow);
            
            // Create options container
            const options = document.createElement('div');
            options.className = 'custom-options';
            
            // Create custom options from select options
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
                    
                    // Update selected state
                    options.querySelectorAll('.custom-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    customOption.classList.add('selected');
                    
                    // Close dropdown
                    customSelect.classList.remove('open');
                    
                    // Trigger change event
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                });
                
                options.appendChild(customOption);
            });
            
            // Assemble the custom select
            customSelect.appendChild(trigger);
            customSelect.appendChild(options);
            
            // Toggle dropdown on trigger click
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close all other open selects
                document.querySelectorAll('.custom-select').forEach(sel => {
                    if (sel !== customSelect) {
                        sel.classList.remove('open');
                    }
                });
                
                // Toggle this select
                customSelect.classList.toggle('open');
            });
            
            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!customSelect.contains(e.target)) {
                    customSelect.classList.remove('open');
                }
            });
            
            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    customSelect.classList.remove('open');
                }
            });
            
            // Add to DOM
            wrapper.appendChild(customSelect);
        });
    };
    
    // Initialize the custom selects
    setupCustomSelects();
    
    // Handle PDF report generation form submission
    const pdfExportForm = document.getElementById('exportForm');
    if (pdfExportForm) {
        pdfExportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const reportPeriod = document.getElementById('reportPeriod').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <div class="spinner-border spinner-border-sm" role="status" style="margin-right: 8px;">
                    <span class="sr-only">Loading...</span>
                </div>
                Generating Report...
            `;
            
            try {
                // Make API call to generate PDF report
                const response = await fetch('/api/analysis/export/report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                    },
                    body: JSON.stringify({
                        period: reportPeriod,
                        startDate: startDate || null,
                        endDate: endDate || null
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to generate report');
                }

                // Create a blob from the response
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Create a temporary link to trigger the download
                const a = document.createElement('a');
                a.href = url;
                a.download = `aloe-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
            } catch (error) {
                console.error('Report generation error:', error);
                alert(`Failed to generate report: ${error.message}`);
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-loading');
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
    
    // Handle images export form submission
    const exportImagesForm = document.getElementById('exportImagesForm');
    if (exportImagesForm) {
        exportImagesForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Always export all images, no date filtering
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-loading');
            submitBtn.innerHTML = `
                <span class="spinner-border" role="status"></span>
                <span class="btn-text">Preparing Export...</span>
            `;
            
            // Show progress container
            const progressContainer = this.querySelector('.export-progress');
            const progressBar = this.querySelector('.progress');
            const progressText = this.querySelector('.progress-text');
            progressContainer.style.display = 'block';
            
            try {
                // Show initial progress
                progressBar.style.width = '10%';
                progressText.textContent = 'Preparing files... 10%';
                
                try {
                    // Get auth token using the auth service
                    const authToken = getAuthToken();
                    console.log('Auth token status:', authToken ? 'Token found' : 'No valid token found');
                    
                    if (!authToken) {
                        console.error('No valid authentication token found');
                        // This will trigger the auth check and redirect to login
                        await checkAuthentication();
                        return;
                    }

                    console.log('Making export request to /api/analysis/export/images');
                    
                    // Make API call to export images
                    const response = await fetch('/api/analysis/export/images', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        credentials: 'include', // Include cookies if using them for auth
                        body: JSON.stringify({
                            exportAll: true,
                            startDate: null,
                            endDate: null
                        })
                    });

                    if (!response.ok) {
                        console.error(`Export failed with status: ${response.status} ${response.statusText}`);
                        const errorText = await response.text();
                        console.error('Error response:', errorText);
                        
                        let errorData;
                        try {
                            errorData = JSON.parse(errorText);
                        } catch (e) {
                            errorData = { message: errorText };
                        }
                        
                        if (response.status === 401) {
                            console.log('Authentication required, redirecting to login...');
                            // This will handle the redirect and token cleanup
                            await checkAuthentication();
                            return;
                        }
                        
                        throw new Error(errorData.message || `Export failed with status ${response.status}`);
                    }

                    // Update progress
                    progressBar.style.width = '90%';
                    progressText.textContent = 'Finalizing export... 90%';

                    // Handle file download
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `analysis-images-${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    // Update progress to 100%
                    progressBar.style.width = '100%';
                    progressText.textContent = 'Export complete! Download started...';

                    // Reset form after a short delay
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        progressBar.style.width = '0%';
                        progressText.textContent = 'Preparing files...';
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                        
                        // Reset date inputs and checkboxes
                        document.getElementById('imagesStartDate').value = '';
                        document.getElementById('imagesEndDate').value = '';
                        document.getElementById('exportAllImages').checked = false;
                    }, 2000);

                } catch (error) {
                    console.error('Export error:', error);
                    progressBar.style.width = '0%';
                    progressText.textContent = 'Export failed. Please try again.';
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('btn-loading');
                    submitBtn.innerHTML = `
                        <span class="btn-text">Failed</span>
                        <span class="btn-error-icon" aria-hidden="true">&#10005;</span>
                    `;
                    
                    // More specific error messages based on error type
                    let errorMessage = error.message || 'An unknown error occurred during export';
                    if (error.message.includes('401') || error.message.includes('token')) {
                        errorMessage = 'Your session has expired. Please log in again.';
                        // Optionally redirect to login
                        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
                    }
                    
                    alert(`Export failed: ${errorMessage}`);
                }
                
            } catch (error) {
                console.error('Export error:', error);
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                alert('An error occurred during export. Please try again.');
            }
        });
    }
    
    // Re-initialize if the DOM is updated (e.g., after AJAX)
    const observer = new MutationObserver((mutations) => {
        setupCustomSelects();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
