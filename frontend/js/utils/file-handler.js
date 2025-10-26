import { AppState, resetImageState } from '../core/state.js';
import { Elements } from '../core/elements.js';
import { showError } from './ui.js';

export function handleDragOver(e) {
    e.preventDefault();
    if (Elements.uploadArea) {
        Elements.uploadArea.classList.add('dragover');
    }
}

export function handleDragLeave() {
    if (Elements.uploadArea) {
        Elements.uploadArea.classList.remove('dragover');
    }
}

export function handleDrop(e) {
    e.preventDefault();
    if (Elements.uploadArea) {
        Elements.uploadArea.classList.remove('dragover');
    }
    const file = e.dataTransfer.files[0];
    handleFile(file);
}

export function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

export function handleFile(file) {
    if (!file) return;

    if (!AppState.allowedTypes.includes(file.type)) {
        showError(`File type not supported. Allowed types: ${AppState.allowedTypes.join(', ')}`);
        return;
    }

    if (file.size > AppState.maxFileSize) {
        showError(`File size exceeds maximum of ${AppState.maxFileSize / 1024 / 1024}MB`);
        return;
    }

    AppState.currentFile = file;
    AppState.currentImage = URL.createObjectURL(file);
    AppState.isAnalyzed = false;

    displayPreview(file);
}

function displayPreview(file) {
    if (Elements.fileInfo) {
        Elements.fileInfo.classList.add('show');
    }

    if (Elements.fileName) {
        Elements.fileName.textContent = `📄 ${file.name}`;
    }

    if (Elements.fileSize) {
        const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
        Elements.fileSize.textContent = `${sizeInMB} MB`;
    }

    if (Elements.previewImage) {
        Elements.previewImage.src = AppState.currentImage;
        Elements.previewImage.onload = () => {
            if (Elements.previewArea) {
                Elements.previewArea.style.display = 'block';
            }
        };
    }

    if (Elements.uploadArea) {
        Elements.uploadArea.classList.add('has-image');
    }

    enableAnalyzeButton();
}

function enableAnalyzeButton() {
    if (Elements.analyzeBtn) {
        Elements.analyzeBtn.disabled = false;
        Elements.analyzeBtn.style.opacity = '1';
        Elements.analyzeBtn.style.cursor = 'pointer';
    }

    if (Elements.clearBtn) {
        Elements.clearBtn.disabled = false;
        Elements.clearBtn.style.opacity = '1';
        Elements.clearBtn.style.cursor = 'pointer';
    }
}

export function clearImage() {
    if (AppState.isAnalyzed) {
        showError('Image has been analyzed. Please upload a new image instead of clearing.');
        return;
    }
    
    resetImageState();
    
    if (Elements.previewArea) Elements.previewArea.style.display = 'none';
    if (Elements.fileInfo) Elements.fileInfo.classList.remove('show');
    if (Elements.uploadArea) Elements.uploadArea.classList.remove('has-image');
    if (Elements.fileInput) Elements.fileInput.value = '';
    
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
    
    if (Elements.resultsContainer) {
        Elements.resultsContainer.innerHTML = '<div class="results-placeholder">Upload an image to view analysis results</div>';
    }
}

export function disableAnalyzeButton() {
    if (Elements.analyzeBtn) {
        Elements.analyzeBtn.disabled = true;
        Elements.analyzeBtn.textContent = 'Image Already Analyzed';
        Elements.analyzeBtn.style.opacity = '0.5';
        Elements.analyzeBtn.style.cursor = 'not-allowed';
    }
    
    if (Elements.clearBtn) {
        Elements.clearBtn.disabled = true;
        Elements.clearBtn.style.opacity = '0.5';
        Elements.clearBtn.style.cursor = 'not-allowed';
    }
}
