import { Elements } from '../core/elements.js';

export function showLoading(message = 'Loading...') {
    if (Elements.loading) {
        const loadingText = Elements.loading.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        Elements.loading.style.display = 'flex';
    }
}

export function hideLoading() {
    if (Elements.loading) {
        Elements.loading.style.display = 'none';
    }
}

export function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification notification-error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        errorDiv.classList.remove('show');
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

export function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'notification notification-success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        successDiv.classList.remove('show');
        setTimeout(() => successDiv.remove(), 300);
    }, 4000);
}

export function showWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'notification notification-warning';
    warningDiv.textContent = message;
    document.body.appendChild(warningDiv);
    
    setTimeout(() => {
        warningDiv.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        warningDiv.classList.remove('show');
        setTimeout(() => warningDiv.remove(), 300);
    }, 4000);
}

export function setProgressBar(percentage) {
    if (Elements.progressBar && Elements.progressFill) {
        Elements.progressBar.style.display = 'block';
        Elements.progressFill.style.width = `${percentage}%`;
    }
}

export function hideProgressBar() {
    if (Elements.progressBar) {
        setTimeout(() => {
            Elements.progressBar.style.display = 'none';
        }, 500);
    }
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
