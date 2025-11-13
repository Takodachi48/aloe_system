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
                            <button class="btn btn-sm btn-danger delete-analysis-btn" title="Delete analysis">Delete</button>
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

    document.querySelectorAll('.delete-analysis-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const analysisId = e.target.closest('tr').getAttribute('data-analysis-id');
            deleteAnalysis(analysisId);
        });
    });
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
    if (!Elements.modalAnalysisContent || !Elements.analysisModal) return;

    const causesHTML = analysis.causes && analysis.causes.length > 0 ?
        `<div class="result-item">
            <div class="result-label">Causes</div>
            <div class="recommendation-list">
                ${analysis.causes.map(cause => `<div class="recommendation-item">• ${cause}</div>`).join('')}
            </div>
        </div>` : '';

    const treatmentsHTML = analysis.treatments && analysis.treatments.length > 0 ?
        `<div class="result-item">
            <div class="result-label">Treatments</div>
            <div class="recommendation-list">
                ${analysis.treatments.map(treatment => `<div class="recommendation-item">• ${treatment}</div>`).join('')}
            </div>
        </div>` : '';

    const preventionHTML = analysis.prevention && analysis.prevention.length > 0 ?
        `<div class="result-item">
            <div class="result-label">Prevention</div>
            <div class="recommendation-list">
                ${analysis.prevention.map(tip => `<div class="recommendation-item">• ${tip}</div>`).join('')}
            </div>
        </div>` : '';

    Elements.modalTitle.textContent = analysis.disease_name || analysis.diseaseName;
    const isHealthy = analysis.status === 'healthy' || /healthy/i.test(analysis.disease_name || analysis.diseaseName || '');
    
    Elements.modalAnalysisContent.innerHTML = `
        <div class="modal-layout">
            <img src="${analysis.image_path || analysis.imagePath}" alt="${analysis.disease_name}" class="modal-image">
            <div class="modal-analysis-grid">
                <div class="result-item">
                    <div class="result-label">Disease</div>
                    <div class="result-value">${analysis.disease_name || analysis.diseaseName}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Severity</div>
                    <span class="status-badge status-${analysis.status}">${analysis.severity.toUpperCase()} RISK</span>
                </div>
                <div class="result-item">
                    <div class="result-label">Confidence Level</div>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${analysis.confidence}%"></div>
                    </div>
                    <div class="confidence-text">${analysis.confidence}% confidence</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Description</div>
                    <div class="result-value" style="font-size: 0.95em; font-weight: 400; line-height: 1.6; margin-top: 4px;">${analysis.description || ''}</div>
                </div>
                ${isHealthy ? `
                <div class="success-message">
                    This analysis indicates the plant is healthy. No treatment plan is required.
                </div>` : ''}
                ${causesHTML}
                ${treatmentsHTML}
                ${preventionHTML}
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    ${isHealthy ? '' : `<button class=\"btn\" data-analysis-id=\"${analysis.analysis_id || analysis.analysisId}\" id=\"viewPlansBtn\" style=\"flex: 1;\">View Treatment Plans</button>`}
                    <button class="btn btn-danger" data-analysis-id="${analysis.analysis_id || analysis.analysisId}" id="modalDeleteBtn" style="flex: 1;">Delete Analysis</button>
                </div>
            </div>
        </div>
    `;

    Elements.analysisModal.classList.add('show');
    attachModalEventListeners(analysis.analysis_id || analysis.analysisId);
}

function attachModalEventListeners(analysisId) {
    if (Elements.modalCloseBtn) {
        Elements.modalCloseBtn.removeEventListener('click', closeModal);
        Elements.modalCloseBtn.addEventListener('click', closeModal);
    }

    if (Elements.modalOverlay) {
        Elements.modalOverlay.removeEventListener('click', closeModal);
        Elements.modalOverlay.addEventListener('click', closeModal);
    }

    const deleteBtn = document.getElementById('modalDeleteBtn');
    if (deleteBtn) {
        deleteBtn.removeEventListener('click', handleModalDelete);
        deleteBtn.addEventListener('click', handleModalDelete);
    }

    const viewPlansBtn = document.getElementById('viewPlansBtn');
    if (viewPlansBtn) {
        viewPlansBtn.addEventListener('click', async () => {
            try {
                const resp = await ApiService.getTreatmentPlansByAnalysis(analysisId);
                const first = (resp.data || [])[0];
                if (!first) return showError('No treatment plans for this analysis yet');
                window.dispatchEvent(new CustomEvent('openTreatmentPlan', { detail: { planId: first.plan_id } }));
            } catch (err) {
                showError(err.message);
            }
        });
    }
}

function closeModal() {
    if (Elements.analysisModal) {
        Elements.analysisModal.classList.remove('show');
    }
}

function handleModalDelete(e) {
    const analysisId = e.target.getAttribute('data-analysis-id');
    closeModal();
    deleteAnalysis(analysisId);
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
