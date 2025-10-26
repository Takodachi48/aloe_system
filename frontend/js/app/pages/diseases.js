import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showError } from '../../utils/ui.js';

export async function generateDiseaseGuide() {
    if (!Elements.diseaseGuideContainer) return;
    
    if (Elements.diseaseGuideContainer.children.length > 0) {
        return;
    }

    try {
        showLoading('Loading disease information...');
        const response = await ApiService.getDiseaseInfo();
        hideLoading();

        const guideHTML = response.data.map(disease => `
            <div class="card" style="margin-bottom: 24px;">
                <h2>${disease.name}</h2>
                <div style="margin-bottom: 16px;">
                    <span class="status-badge status-${disease.severity === 'low' ? 'healthy' : disease.severity === 'medium' ? 'warning' : 'danger'}" style="margin-bottom: 16px; display: inline-block;">
                        ${disease.severity.toUpperCase()} RISK
                    </span>
                </div>
                
                <div class="result-item">
                    <div class="result-label">Description</div>
                    <div class="result-value" style="font-size: 0.95em; font-weight: 400; line-height: 1.6; margin-top: 4px;">
                        ${disease.description}
                    </div>
                </div>

                ${disease.causes && disease.causes.length > 0 ? `
                    <div class="result-item">
                        <div class="result-label">Common Causes</div>
                        <div class="recommendation-list">
                            ${disease.causes.map(cause => `<div class="recommendation-item">• ${cause}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="result-item">
                    <div class="result-label">Treatment Recommendations</div>
                    <div class="recommendation-list">
                        ${disease.treatments.map(treatment => `<div class="recommendation-item">• ${treatment}</div>`).join('')}
                    </div>
                </div>

                <div class="result-item">
                    <div class="result-label">Prevention Tips</div>
                    <div class="recommendation-list">
                        ${disease.prevention.map(tip => `<div class="recommendation-item">• ${tip}</div>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        Elements.diseaseGuideContainer.innerHTML = guideHTML;
    } catch (error) {
        hideLoading();
        showError('Failed to load disease information: ' + error.message);
    }
}
