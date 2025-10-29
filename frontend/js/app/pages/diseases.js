import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showError } from '../../utils/ui.js';

const riskCategories = {
    'Minor / Easily Treatable': {
        color: 'success',
        description: 'Responds well to basic treatment or isolation.',
        examples: ['Early Rust', 'Light Leaf Spot']
    },
    'Manageable / Moderate': {
        color: 'warning',
        description: 'Needs care and monitoring; can spread if ignored.',
        examples: ['Fungal Rot', 'Mild Sunburn']
    },
    'Difficult / Severe': {
        color: 'danger',
        description: 'Hard to treat, often requires continuous management.',
        examples: ['Root Rot', 'Bacterial Soft Rot']
    },
    'Persistent / Recurrent': {
        color: 'danger',
        description: 'Commonly reappears even after treatment.',
        examples: ['Aloe Rust (in humid climates)']
    }
};

function getRiskBadgeColor(riskCategory) {
    if (!riskCategory) return 'healthy';
    if (riskCategory.includes('Healthy')) return 'healthy';
    for (const [category, config] of Object.entries(riskCategories)) {
        if (riskCategory.includes(category.split('/')[0].trim()) || riskCategory.includes(category)) {
            return config.color;
        }
    }
    return 'warning';
}

function createImageModal() {
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.zIndex = '10000';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.innerHTML = `
        <img id="modal-image" src="" alt="Disease detail" style="max-width: 90%; max-height: 80%; object-fit: contain; border-radius: 8px;">
        <button id="modal-close" style="position: absolute; top: 20px; right: 20px; background: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-size: 18px; font-weight: bold;">✕</button>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.id === 'modal-close') {
            modal.style.display = 'none';
        }
    });
}

function openImageModal(imageSrc) {
    let modal = document.getElementById('image-modal');
    if (!modal) {
        createImageModal();
        modal = document.getElementById('image-modal');
    }
    document.getElementById('modal-image').src = imageSrc;
    modal.style.display = 'flex';
}

export async function generateDiseaseGuide() {
    if (!Elements.diseaseGuideContainer) return;
    
    if (Elements.diseaseGuideContainer.children.length > 0) {
        return;
    }

    try {
        showLoading('Loading disease information...');
        const response = await ApiService.getDiseaseInfo();
        hideLoading();

        const guideHTML = response.data.map(disease => {
            const diseaseFolder = disease.key;
            const thumbnailImages = [1, 2, 3, 4].map(i => 
                `/uploads/thumbnails/${diseaseFolder}/${i}.jpg`
            );
            
            return `
            <div class="card" style="margin-bottom: 24px;">
                <h2>${disease.name}</h2>
                
                ${disease.image ? `
                    <div style="margin-bottom: 16px; text-align: center;">
                        <img src="${disease.image}" alt="${disease.name}" style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover;">
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 16px;">
                    <div style="margin-bottom: 8px;">
                        <span class="status-badge status-${getRiskBadgeColor(disease.riskCategory)}" style="display: inline-block; font-weight: 600;">
                            ${disease.riskCategory || 'UNKNOWN'}
                        </span>
                    </div>
                    <div style="font-size: 0.9em; color: #666; font-style: italic;">
                        ${disease.riskDescription || ''}
                    </div>
                </div>
                
                <div class="result-item">
                    <div class="result-label">Overview</div>
                    <div class="result-value" style="font-size: 0.95em; font-weight: 400; line-height: 1.6; margin-top: 4px;">
                        ${disease.description}
                    </div>
                </div>

                <div class="result-item">
                    <div class="result-label">Visual Reference</div>
                    <div class="disease-gallery" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 8px;">
                        ${thumbnailImages.map((img, idx) => `
                            <div class="gallery-thumbnail" style="position: relative; overflow: hidden; border-radius: 8px; aspect-ratio: 1; background: #f0f0f0; cursor: pointer; transition: transform 0.2s; user-select: none;" data-src="${img}">
                                <img src="${img}" alt="Disease image ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `).join('')}
                    </div>
                    <div style="font-size: 0.85em; color: #999; margin-top: 8px;">Click any image to view in detail</div>
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
            `;
        }).join('');

        Elements.diseaseGuideContainer.innerHTML = guideHTML;
        
        document.querySelectorAll('.gallery-thumbnail').forEach(thumbnail => {
            thumbnail.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
            });
            thumbnail.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
            thumbnail.addEventListener('click', function() {
                openImageModal(this.dataset.src);
            });
            
            const img = thumbnail.querySelector('img');
            img.addEventListener('error', function() {
                this.style.display = 'none';
                thumbnail.style.backgroundColor = '#e0e0e0';
            });
        });
    } catch (error) {
        hideLoading();
        showError('Failed to load disease information: ' + error.message);
    }
}
