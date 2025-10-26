import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showSuccess, showError, setProgressBar, hideProgressBar, formatFileSize } from '../../utils/ui.js';
import { clearImage, disableAnalyzeButton } from '../../utils/file-handler.js';
import { loadHistoryPage } from './history.js';

export async function analyzeImage() {
    if (!AppState.currentFile || AppState.isAnalyzing || AppState.isAnalyzed) {
        console.log('Analysis blocked:', {
            hasFile: !!AppState.currentFile,
            isAnalyzing: AppState.isAnalyzing,
            isAnalyzed: AppState.isAnalyzed
        });
        return;
    }

    AppState.isAnalyzing = true;
    if (Elements.analyzeBtn) {
        Elements.analyzeBtn.disabled = true;
        Elements.analyzeBtn.textContent = 'Uploading & Analyzing...';
    }
    
    setProgressBar(0);

    try {
        showLoading('Uploading image to cloud...');
        
        const uploadResponse = await ApiService.uploadImage(AppState.currentFile);
        AppState.currentUploadData = uploadResponse.data;
        
        setProgressBar(50);
        
        AppState.currentImage = AppState.currentUploadData.path;
        if (Elements.previewImage) {
            Elements.previewImage.src = AppState.currentImage;
        }
        
        showLoading('Analyzing image...');
        setProgressBar(75);
        
        const analysisResponse = await ApiService.analyzeImage(AppState.currentUploadData);
        
        if (!analysisResponse.success || !analysisResponse.data) {
            throw new Error('Invalid analysis response from server');
        }
        
        setProgressBar(100);
        hideLoading();
        
        displayResults(analysisResponse.data);
        showSuccess('Analysis completed successfully!');
        
        AppState.isAnalyzed = true;
        disableAnalyzeButton();
        
        await loadHistoryPage(1);
        
        hideProgressBar();
        
    } catch (error) {
        hideLoading();
        hideProgressBar();
        console.error('Analysis error:', error);
        showError('Analysis failed: ' + error.message);
        AppState.isAnalyzing = false;
        if (Elements.analyzeBtn) {
            Elements.analyzeBtn.disabled = false;
            Elements.analyzeBtn.textContent = 'Analyze Image';
        }
    }
}

export function displayResults(results) {
    const causesHTML = results.causes && results.causes.length > 0 ?
        `<div class="result-item" style="animation-delay: 0.3s">
            <div class="result-label">Possible Causes</div>
            <div class="recommendation-list">
                ${results.causes.map(cause => `<div class="recommendation-item">• ${cause}</div>`).join('')}
            </div>
        </div>` : '';

    const treatmentsHTML = results.treatments && results.treatments.length > 0 ?
        `<div class="result-item" style="animation-delay: 0.4s">
            <div class="result-label">Treatment Recommendations</div>
            <div class="recommendation-list">
                ${results.treatments.map(treatment => `<div class="recommendation-item">• ${treatment}</div>`).join('')}
            </div>
        </div>` : '';

    const preventionHTML = results.prevention && results.prevention.length > 0 ?
        `<div class="result-item" style="animation-delay: 0.5s">
            <div class="result-label">Prevention Tips</div>
            <div class="recommendation-list">
                ${results.prevention.map(tip => `<div class="recommendation-item">• ${tip}</div>`).join('')}
            </div>
        </div>` : '';

    if (Elements.resultsContainer) {
        Elements.resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="result-label">Detection Result</div>
                <div class="result-value">${results.disease}</div>
                <span class="status-badge status-${results.status}">${results.severity.toUpperCase()} RISK</span>
            </div>
            <div class="result-item" style="animation-delay: 0.1s">
                <div class="result-label">Confidence Level</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${results.confidence}%"></div>
                </div>
                <div class="confidence-text">${results.confidence}% confidence</div>
            </div>
            <div class="result-item" style="animation-delay: 0.2s">
                <div class="result-label">Description</div>
                <div class="result-value" style="font-size: 0.95em; font-weight: 400; line-height: 1.6; margin-top: 4px;">${results.description}</div>
            </div>
            ${causesHTML}
            ${treatmentsHTML}
            ${preventionHTML}
        `;
    }
}


