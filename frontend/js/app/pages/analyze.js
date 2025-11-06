import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showSuccess, showError, setProgressBar, hideProgressBar, formatFileSize } from '../../utils/ui.js';
import { clearImage, disableAnalyzeButton } from '../../utils/file-handler.js';
import { loadHistoryPage } from './history.js';

export function resetForNewUpload() {
    // Reset all analysis state
    AppState.isAnalyzed = false;
    AppState.isAnalyzing = false;
    AppState.lastAnalysis = null;
    AppState.currentUploadData = null;

    // Clear results
    if (Elements.resultsContainer) {
        Elements.resultsContainer.innerHTML = '<div class="results-placeholder">Upload an image to view analysis results</div>';
    }

    // Reset buttons
    if (Elements.analyzeBtn) {
        Elements.analyzeBtn.disabled = true;
        Elements.analyzeBtn.textContent = 'Analyze Image';
        Elements.analyzeBtn.style.opacity = '1';
        Elements.analyzeBtn.style.cursor = 'pointer';
    }

    if (Elements.clearBtn) {
        Elements.clearBtn.disabled = true;
        Elements.clearBtn.style.opacity = '1';
        Elements.clearBtn.style.cursor = 'pointer';
    }

    // Clear file input
    if (Elements.fileInput) {
        Elements.fileInput.value = '';
    }

    // Hide progress bar
    hideProgressBar();
}

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

        // Check if the detected plant is aloe vera with sufficient confidence and gap
        const aloeDiseases = ['healthy', 'leaf_spot', 'root_rot', 'sunburn'];
        const diseaseKey = analysisResponse.data.diseaseKey;
        const confidence = analysisResponse.data.confidence;
        
        // Get all predictions and sort by confidence
        const predictions = analysisResponse.data.all_predictions || {};
        const sortedPredictions = Object.entries(predictions)
            .sort((a, b) => b[1] - a[1]);
            
        const topPrediction = sortedPredictions[0] || [];
        const secondPrediction = sortedPredictions[1] || [];
        
        const confidenceGap = topPrediction[1] - (secondPrediction[1] || 0);
        // Adjust thresholds based on disease type
        const isRootRot = diseaseKey === 'root_rot';
        const isSunburn = diseaseKey === 'sunburn';
        const isHealthy = diseaseKey === 'healthy';
        
        // Set minimum confidence thresholds
        const minConfidence = isRootRot ? 85 : (
            isSunburn ? 65 : (
                isHealthy ? 75 : 80  // Healthy needs at least 75% confidence
            )
        );
        const minGap = isRootRot ? 25 : (
            isSunburn ? 10 : 20
        );
        
        const isConfidentEnough = confidence >= minConfidence;
        const hasSignificantGap = confidenceGap >= minGap;
        const isAloeDisease = aloeDiseases.includes(diseaseKey);
        
        console.log('Aloe detection check:', { 
            diseaseKey, 
            confidence, 
            isAloeDisease,
            minConfidence: isRootRot ? 85 : (isSunburn ? 65 : (isHealthy ? 75 : 80)),
            minGap: isRootRot ? 25 : (isSunburn ? 10 : 20),
            confidenceCheck: isConfidentEnough,
            confidenceGap,
            hasSignificantGap,
            predictions: sortedPredictions,
            isRootRot
        });
        
        const isAloeVera = isAloeDisease && isConfidentEnough && hasSignificantGap;

        if (!isAloeVera) {
            // Delete the uploaded file since it's not an aloe vera
            if (AppState.currentUploadData?.filename) {
                try {
                    await ApiService.deleteUpload(AppState.currentUploadData.filename);
                    console.log('Deleted non-aloe image upload');
                } catch (error) {
                    console.error('Error deleting non-aloe image:', error);
                }
            }

            // Show popup for non-aloe vera detection
            const popup = document.createElement('div');
            popup.className = 'aloe-detection-popup';
            popup.innerHTML = `
                <div class="popup-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;">
                    <div class="popup-content" style="background:white; padding:24px; border-radius:8px; max-width:400px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <h3 style="margin:0 0 16px 0; color:#f57c00;">Not an Aloe Vera Leaf</h3>
                        <p style="margin:0 0 20px 0; line-height:1.5;">This app is designed specifically for analyzing aloe vera plants. Please upload a clear photo of an aloe vera leaf to continue.</p>
                        <button class="btn btn-primary aloe-reset-btn" style="padding:10px 20px;">Upload Aloe Vera Leaf</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);

            // Add event listener to the reset button
            const resetBtn = popup.querySelector('.aloe-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    popup.remove();
                    resetForNewUpload();
                });
            }

            // Reset state
            AppState.isAnalyzing = false;
            AppState.currentUploadData = null;
            if (Elements.analyzeBtn) {
                Elements.analyzeBtn.disabled = false;
                Elements.analyzeBtn.textContent = 'Analyze Image';
            }
            hideProgressBar();
            return;
        }

        // Only proceed with saving if it's a confirmed aloe vera image
        if (isAloeVera) {
            AppState.lastAnalysis = analysisResponse.data;
            displayResults(analysisResponse.data);
            showSuccess('Analysis completed successfully!');
            AppState.isAnalyzed = true;
            disableAnalyzeButton();
            await loadHistoryPage(1);
        } else {
            // Reset the upload state if somehow we got here without the previous check catching it
            resetForNewUpload();
        }

        hideProgressBar();
        
    } catch (error) {
        hideLoading();
        hideProgressBar();
        console.error('Analysis error:', error);
        
        // Check if this is a non-aloe image error
        if (error.isAloeError) {
            // Show the non-aloe popup
            const popup = document.createElement('div');
            popup.className = 'aloe-detection-popup';
            popup.innerHTML = `
                <div class="popup-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;">
                    <div class="popup-content" style="background:white; padding:24px; border-radius:8px; max-width:400px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <h3 style="margin:0 0 16px 0; color:#f57c00;">Not an Aloe Vera Leaf</h3>
                        <p style="margin:0 0 20px 0; line-height:1.5;">${error.message || 'This app is designed specifically for analyzing aloe vera plants. Please upload a clear photo of an aloe vera leaf to continue.'}</p>
                        <button class="btn btn-primary aloe-reset-btn" style="padding:10px 20px;">Upload Aloe Vera Leaf</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);

            // Add event listener to the reset button
            const resetBtn = popup.querySelector('.aloe-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    popup.remove();
                    resetForNewUpload();
                });
            }
        } else {
            // Show regular error for other types of errors
            showError('Analysis failed: ' + error.message);
        }
        
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
        const isHealthy = results.status === 'healthy' || results.diseaseKey === 'healthy' || /healthy/i.test(results.disease || '');
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
            ${isHealthy ? `
            <div class="success-message" style="animation-delay: 0.25s">
                Your plant looks healthy. No treatment plan is needed. Keep up the good care!
            </div>
            ` : ''}
            ${causesHTML}
            ${treatmentsHTML}
            ${preventionHTML}
            ${isHealthy ? '' : `
            <div class="result-actions" style="margin-top:16px; display:flex; gap:12px;">
                <button id="createTreatmentPlanBtn" class="btn btn-primary">Create Treatment Plan</button>
            </div>`}
        `;
        const btn = document.getElementById('createTreatmentPlanBtn');
        if (btn && AppState.lastAnalysis) {
            btn.addEventListener('click', async () => {
                try {
                    showLoading('Creating treatment plan...');
                    const resp = await ApiService.createTreatmentPlan({
                        analysisId: AppState.lastAnalysis.analysisId,
                        diseaseKey: AppState.lastAnalysis.diseaseKey,
                        diseaseName: AppState.lastAnalysis.disease,
                        imageUrl: AppState.lastAnalysis.imagePath
                    });
                    hideLoading();
                    showSuccess('Treatment plan created');
                    // Load and show plan in modal
                    if (resp.success) {
                        const planId = resp.data.planId;
                        window.dispatchEvent(new CustomEvent('openTreatmentPlan', { detail: { planId } }));
                    }
                } catch (e) {
                    hideLoading();
                    showError(e.message);
                }
            });
        }
    }
}


