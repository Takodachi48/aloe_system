import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showError, showSuccess } from '../../utils/ui.js';

export async function loadHistoryPage(page = 1) {
    try {
        showLoading('Loading analysis history...');
        const response = await ApiService.getAnalysisHistory(page);
        hideLoading();

        console.log('History API response:', response.data.analyses);
        displayHistoryItems(response.data.analyses);
        
        if (response.data.pagination && response.data.pagination.totalPages > 1) {
            displayPagination(response.data.pagination);
        } else if (Elements.historyPagination) {
            Elements.historyPagination.style.display = 'none';
        }
    } catch (error) {
        hideLoading();
        showError('Failed to load history: ' + error.message);
    }
}

function displayHistoryItems(items) {
    if (!Elements.historyGrid) return;

    if (items.length === 0) {
        Elements.historyGrid.innerHTML = '<div class="empty-state">No analysis history yet</div>';
        return;
    }

    // Debug: log the first item to see field names
    if (items.length > 0) {
        console.log('First history item fields:', Object.keys(items[0]));
        console.log('First history item pot_name:', items[0].pot_name);
    }

    const tableHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Pot Name</th>
                    <th>Disease</th>
                    <th>Confidence</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr class="history-item" data-analysis-id="${item.analysis_id}">
                        <td class="history-thumbnail-cell">
                            <img src="${item.thumbnail_path}" alt="${item.disease_name}" class="history-thumbnail">
                        </td>
                        <td class="history-pot-name">${item.pot_name || item.potName || 'Unnamed Pot'}</td>
                        <td class="history-disease">${item.disease_name}</td>
                        <td>${item.confidence}%</td>
                        <td class="history-date">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="history-actions">
                            <button class="btn btn-sm view-analysis-btn" title="View analysis">View</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    Elements.historyGrid.innerHTML = tableHTML;
    attachHistoryEventListeners();
}

function attachHistoryEventListeners() {
    document.querySelectorAll('.view-analysis-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const analysisId = e.target.closest('tr').getAttribute('data-analysis-id');
            viewAnalysis(analysisId);
        });
    });

    // Delete button functionality has been removed
}

function displayPagination(pagination) {
    if (!Elements.historyPagination) return;

    let html = '';
    
    if (pagination.currentPage > 1) {
        html += `<button class="pagination-btn prev-page-btn" data-page="${pagination.currentPage - 1}">← Previous</button>`;
    }
    
    html += `<span class="pagination-info">Page ${pagination.currentPage} of ${pagination.totalPages}</span>`;
    
    if (pagination.currentPage < pagination.totalPages) {
        html += `<button class="pagination-btn next-page-btn" data-page="${pagination.currentPage + 1}">Next →</button>`;
    }
    
    Elements.historyPagination.innerHTML = html;
    Elements.historyPagination.style.display = 'flex';
    
    attachPaginationEventListeners();
}

function attachPaginationEventListeners() {
    document.querySelectorAll('.prev-page-btn, .next-page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.getAttribute('data-page'));
            loadHistoryPage(page);
        });
    });
}

export async function viewAnalysis(analysisId) {
    try {
        showLoading('Loading analysis details...');
        const response = await ApiService.getAnalysisById(analysisId);
        hideLoading();

        const analysis = response.data;
        displayAnalysisModal(analysis);
    } catch (error) {
        hideLoading();
        showError('Failed to load analysis: ' + error.message);
    }
}

function displayAnalysisModal(analysis) {
    if (!Elements.modalAnalysisContent || !Elements.analysisModal) {
        console.error('Modal elements not found');
        return;
    }

    console.log('Opening modal for analysis:', analysis.analysis_id || analysis.analysisId);

    // Store the modal state
    Elements.analysisModal.dataset.isOpen = 'true';

    // Disable any existing transitions temporarily
    Elements.analysisModal.style.transition = 'none';
    
    // Set initial state
    Elements.analysisModal.style.display = 'flex';
    Elements.analysisModal.style.opacity = '0';
    
    // Force a reflow to ensure the display change is processed
    void Elements.analysisModal.offsetHeight;
    
    // Re-enable transitions
    Elements.analysisModal.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';

    // Generate modal content
    const causesHTML = analysis.causes?.length > 0 ?
        `<div class="result-item">
            <div class="result-label">Causes</div>
            <div class="recommendation-list">
                ${analysis.causes.map(cause => `<div class="recommendation-item">• ${cause}</div>`).join('')}
            </div>
        </div>` : '';

    const treatmentsHTML = analysis.treatments?.length > 0 ?
        `<div class="result-item">
            <div class="result-label">Treatments</div>
            <div class="recommendation-list">
                ${analysis.treatments.map(treatment => `<div class="recommendation-item">• ${treatment}</div>`).join('')}
            </div>
        </div>` : '';

    const preventionHTML = analysis.prevention?.length > 0 ?
        `<div class="result-item">
            <div class="result-label">Prevention</div>
            <div class="recommendation-list">
                ${analysis.prevention.map(tip => `<div class="recommendation-item">• ${tip}</div>`).join('')}
            </div>
        </div>` : '';

    const diseaseName = analysis.disease_name || analysis.diseaseName || 'Unknown';
    const isHealthy = analysis.status === 'healthy' || /healthy/i.test(diseaseName);
    
    // Set the modal content
    Elements.modalTitle.textContent = diseaseName;
    
    Elements.modalAnalysisContent.innerHTML = `
        <div class="modal-layout">
            <img src="${analysis.image_path || analysis.imagePath || ''}" alt="${diseaseName}" class="modal-image">
            <div class="modal-analysis-grid">
                <div class="result-item">
                    <div class="result-label">Disease</div>
                    <div class="result-value">${diseaseName}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Severity</div>
                    <span class="status-badge status-${analysis.status || 'unknown'}">${(analysis.severity || 'UNKNOWN').toUpperCase()} RISK</span>
                </div>
                <div class="result-item">
                    <div class="result-label">Confidence Level</div>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${analysis.confidence || 0}%"></div>
                    </div>
                    <div class="confidence-text">${analysis.confidence || 0}% confidence</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Description</div>
                    <div class="result-value" style="font-size: 0.95em; font-weight: 400; line-height: 1.6; margin-top: 4px;">${analysis.description || 'No description available.'}</div>
                </div>
                ${isHealthy ? `
                <div class="success-message">
                    This analysis indicates the plant is healthy. No treatment plan is required.
                </div>` : ''}
                ${causesHTML}
                ${treatmentsHTML}
                ${preventionHTML}
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    ${!isHealthy ? `<button class="btn" data-analysis-id="${analysis.analysis_id || analysis.analysisId || ''}" id="viewPlansBtn" style="flex: 1; width: 100%;">View Treatment Plans</button>` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Show the modal with a small delay to ensure the content is rendered
    setTimeout(() => {
        Elements.analysisModal.classList.add('show');
        Elements.analysisModal.style.opacity = '1';
        
        // Attach event listeners for the modal with the analysis data
        attachModalEventListeners(analysis);
    }, 10);
}

// Store handler reference at module level
let currentOverlayHandler = null;

// Add this to the displayAnalysisModal function after the modal is shown
function attachModalEventListeners(analysis) {
    // Get a fresh reference to the close button
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) {
        // Remove any existing listeners by cloning and replacing
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        // Add new click handler with a small delay to prevent immediate close
        setTimeout(() => {
            newCloseBtn.addEventListener('click', handleCloseButtonClick);
        }, 50);
    }
    
    // Remove previous overlay handler if it exists
    if (currentOverlayHandler && Elements.analysisModal) {
        Elements.analysisModal.removeEventListener('click', currentOverlayHandler);
    }
    
    // Create new handler - attach to the modal itself
    currentOverlayHandler = function(e) {
        // Close if clicking on the modal background (not on modal-content or its children)
        if (e.target === Elements.analysisModal || e.target === Elements.modalOverlay) {
            closeModal();
        }
    };
    
    // Add the new handler
    if (Elements.analysisModal) {
        Elements.analysisModal.addEventListener('click', currentOverlayHandler);
    }
    
    // Add keyboard event for ESC key
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up the keyboard event listener when modal is closed
    const cleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('modalClosed', cleanup);
    };
    
    document.addEventListener('modalClosed', cleanup);

    const deleteBtn = document.getElementById('modalDeleteBtn');
    if (deleteBtn) {
        deleteBtn.removeEventListener('click', handleModalDelete);
        deleteBtn.addEventListener('click', handleModalDelete);
    }

    const viewPlansBtn = document.getElementById('viewPlansBtn');
    if (viewPlansBtn) {
        // Store the analysis ID in a closure
        const analysisId = analysis.analysis_id || analysis.analysisId;
        
        // Remove any existing listeners
        const newViewPlansBtn = viewPlansBtn.cloneNode(true);
        viewPlansBtn.parentNode.replaceChild(newViewPlansBtn, viewPlansBtn);
        
        // Add new click handler
        newViewPlansBtn.addEventListener('click', async () => {
            try {
                const resp = await ApiService.getTreatmentPlansByAnalysis(analysisId);
                const first = (resp.data || [])[0];
                if (!first) return showError('No treatment plans for this analysis yet');
                window.dispatchEvent(new CustomEvent('openTreatmentPlan', { 
                    detail: { 
                        planId: first.plan_id,
                        analysisId: analysisId
                    } 
                }));
            } catch (err) {
                showError(err.message || 'Failed to load treatment plans');
            }
        });
    }
}

// Handle close button click
function handleCloseButtonClick(e) {
    e.stopPropagation();
    closeModal();
}

// Handle overlay click
function handleOverlayClick(e) {
    if (e.target === Elements.analysisModal || e.target === Elements.modalOverlay) {
        closeModal();
    }
}

function closeModal() {
    console.log('closeModal called');
    const modal = Elements.analysisModal;
    if (!modal || modal.dataset.isOpen !== 'true') {
        return;
    }
    
    // Mark as closing to prevent multiple triggers
    modal.dataset.isOpen = 'false';
    
    // Remove the show class and fade out
    modal.classList.remove('show');
    modal.style.opacity = '0';
    
    // Wait for the transition to complete before hiding the modal
    const onTransitionEnd = () => {
        // Clean up
        modal.style.display = 'none';
        modal.style.transition = 'none'; // Reset transition for next open
        modal.removeEventListener('transitionend', onTransitionEnd);
        
        // Clear content
        if (Elements.modalAnalysisContent) {
            Elements.modalAnalysisContent.innerHTML = '';
        }
        
        // Clean up event listeners
        if (Elements.modalCloseBtn) {
            Elements.modalCloseBtn.removeEventListener('click', handleCloseButtonClick);
        }
        if (currentOverlayHandler) {
            modal.removeEventListener('click', currentOverlayHandler);
            currentOverlayHandler = null;
        }
        
        console.log('Modal fully closed');
    };
    
    // Use transitionend event if transitions are enabled
    if (window.getComputedStyle(modal).transition !== 'all 0s ease 0s') {
        modal.addEventListener('transitionend', onTransitionEnd, { once: true });
        
        // Safety timeout in case transitionend doesn't fire
        setTimeout(() => {
            if (modal.dataset.isOpen === 'false') {
                onTransitionEnd();
            }
        }, 500);
    } else {
        onTransitionEnd();
    }
}


function showDeleteConfirmation(analysisId) {
    if (!Elements.deleteConfirmationModal) return;

    Elements.deleteConfirmationModal.classList.add('show');

    const handleConfirm = () => {
        Elements.deleteConfirmationModal.classList.remove('show');
        performDelete(analysisId);
        cleanupDeleteConfirmationListeners();
    };

    const handleCancel = () => {
        Elements.deleteConfirmationModal.classList.remove('show');
        cleanupDeleteConfirmationListeners();
    };

    const handleOverlayClick = () => {
        handleCancel();
    };

    if (Elements.deleteConfirmationConfirm) {
        Elements.deleteConfirmationConfirm.removeEventListener('click', handleConfirm);
        Elements.deleteConfirmationConfirm.addEventListener('click', handleConfirm);
    }

    if (Elements.deleteConfirmationCancel) {
        Elements.deleteConfirmationCancel.removeEventListener('click', handleCancel);
        Elements.deleteConfirmationCancel.addEventListener('click', handleCancel);
    }

    if (Elements.deleteConfirmationOverlay) {
        Elements.deleteConfirmationOverlay.removeEventListener('click', handleOverlayClick);
        Elements.deleteConfirmationOverlay.addEventListener('click', handleOverlayClick);
    }
}

function cleanupDeleteConfirmationListeners() {
    if (Elements.deleteConfirmationConfirm) {
        Elements.deleteConfirmationConfirm.removeEventListener('click', null);
    }
    if (Elements.deleteConfirmationCancel) {
        Elements.deleteConfirmationCancel.removeEventListener('click', null);
    }
    if (Elements.deleteConfirmationOverlay) {
        Elements.deleteConfirmationOverlay.removeEventListener('click', null);
    }
}

async function performDelete(analysisId) {
    try {
        showLoading('Deleting analysis...');
        await ApiService.deleteAnalysis(analysisId);
        hideLoading();
        showSuccess('Analysis deleted successfully!');
        await loadHistoryPage(1);
    } catch (error) {
        hideLoading();
        showError('Failed to delete analysis: ' + error.message);
    }
}

export async function deleteAnalysis(analysisId) {
    showDeleteConfirmation(analysisId);
}
