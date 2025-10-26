// Application state
const AppState = {
    analysisHistory: [],
    currentImage: null,
    currentFile: null,
    currentUploadData: null,
    isAnalyzing: false,
    isAnalyzed: false, // Track if current image has been analyzed
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    apiBaseUrl: window.location.origin,
    user: null,
    authToken: null
};

// DOM elements
const Elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    previewArea: document.getElementById('previewArea'),
    previewImage: document.getElementById('previewImage'),
    loading: document.getElementById('loading'),
    resultsContainer: document.getElementById('resultsContainer'),
    historyGrid: document.getElementById('historyGrid'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    clearBtn: document.getElementById('clearBtn'),
    selectImageBtn: document.getElementById('selectImageBtn'),
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    mobileNavToggle: document.getElementById('mobileNavToggle'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    mainContent: document.querySelector('.main-content'),
    diseaseGuideContainer: document.getElementById('diseaseGuideContainer'),
    historyPagination: document.getElementById('historyPagination'),
    headerPageTitle: document.getElementById('headerPageTitle'),
    headerPageSubtitle: document.getElementById('headerPageSubtitle'),
    logoutConfirmationModal: document.getElementById('logoutConfirmationModal'),
    logoutConfirmationOverlay: document.getElementById('logoutConfirmationOverlay'),
    logoutConfirmationCancel: document.getElementById('logoutConfirmationCancel'),
    logoutConfirmationConfirm: document.getElementById('logoutConfirmationConfirm')
};

// Authentication functions
function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function updateHeaderForPage(pageId) {
    const map = {
        analyze: {
            title: 'Disease Analysis',
            subtitle: 'Upload an image of your aloe vera plant for AI-powered health analysis'
        },
        history: {
            title: 'Analysis History',
            subtitle: 'View your previous plant health analyses'
        },
        diseases: {
            title: 'Disease Guide',
            subtitle: 'Learn about common aloe vera diseases and their treatments'
        },
        settings: {
            title: 'Settings',
            subtitle: 'Configure your preferences'
        }
    };
    const info = map[pageId] || { title: 'AloeShield', subtitle: '' };
    if (Elements.headerPageTitle) Elements.headerPageTitle.textContent = info.title;
    if (Elements.headerPageSubtitle) Elements.headerPageSubtitle.textContent = info.subtitle;
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function logout() {
    if (!Elements.logoutConfirmationModal) {
        performLogout();
        return;
    }

    Elements.logoutConfirmationModal.classList.add('show');

    const handleConfirm = () => {
        Elements.logoutConfirmationModal.classList.remove('show');
        performLogout();
    };

    const handleCancel = () => {
        Elements.logoutConfirmationModal.classList.remove('show');
    };

    const handleOverlayClick = (e) => {
        if (e.target === Elements.logoutConfirmationOverlay) {
            handleCancel();
        }
    };

    if (Elements.logoutConfirmationConfirm) {
        Elements.logoutConfirmationConfirm.onclick = handleConfirm;
    }

    if (Elements.logoutConfirmationCancel) {
        Elements.logoutConfirmationCancel.onclick = handleCancel;
    }

    if (Elements.logoutConfirmationOverlay) {
        Elements.logoutConfirmationOverlay.onclick = handleOverlayClick;
    }
}

function performLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

async function checkAuthentication() {
    console.log('Checking authentication...');
    console.log('localStorage authToken:', localStorage.getItem('authToken'));
    console.log('sessionStorage authToken:', sessionStorage.getItem('authToken'));
    
    const token = getAuthToken();
    console.log('Token found:', token ? 'YES' : 'NO');
    console.log('Token value (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }

    try {
        console.log('Verifying token with server...');
        const response = await fetch(`${AppState.apiBaseUrl}/api/auth/verify`, {
            headers: getAuthHeaders()
        });

        console.log('Server response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.log('Token verification failed:', errorData);
            logout();
            return false;
        }

        const data = await response.json();
        console.log('Authentication successful:', data.user);
        AppState.user = data.user;
        AppState.authToken = token;
        updateUserDisplay();
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
        return false;
    }
}

function updateUserDisplay() {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    
    if (userNameElement && AppState.user) {
        userNameElement.textContent = AppState.user.name;
    }
    if (userEmailElement && AppState.user) {
        userEmailElement.textContent = AppState.user.email;
    }
}

function updateHeaderOnSidebarToggle() {
    const header = document.querySelector('.app-header');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar.classList.contains('collapsed')) {
        header.classList.add('sidebar-collapsed');
    } else {
        header.classList.remove('sidebar-collapsed');
    }
}

// API service functions
const ApiService = {
    async uploadImage(file, context = 'analysis') {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${AppState.apiBaseUrl}/api/upload/${context}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        return response.json();
    },
    async analyzeImage(uploadData) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                filename: uploadData.filename,
                originalName: uploadData.originalName,
                fileSize: uploadData.size,
                mimeType: uploadData.mimetype
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Analysis failed');
        }

        return response.json();
    },

    async getAnalysisHistory(page = 1, limit = 20) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/history?page=${page}&limit=${limit}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch history');
        }

        return response.json();
    },

    async getAnalysisById(analysisId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/${analysisId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch analysis');
        }

        return response.json();
    },

    async getDiseaseInfo() {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/diseases/info`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch disease information');
        }

        return response.json();
    },

    async deleteAnalysis(analysisId) {
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/${analysisId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete analysis');
        }

        return response.json();
    }
};

// Navigation functions
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
    
    // Special page-specific actions
    if (pageId === 'diseases') {
        generateDiseaseGuide();
    } else if (pageId === 'history') {
        loadHistoryPage(1);
    }

    // Update dynamic header
    updateHeaderForPage(pageId);
}

function toggleMobileSidebar() {
    Elements.sidebar.classList.toggle('open');
    Elements.sidebarOverlay.classList.toggle('show');
}

function closeMobileSidebar() {
    Elements.sidebar.classList.remove('open');
    Elements.sidebarOverlay.classList.remove('show');
}

function toggleSidebarCollapse() {
    const isCollapsed = Elements.sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
        Elements.sidebar.classList.remove('collapsed');
        Elements.mainContent.classList.remove('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', 'false');
    } else {
        Elements.sidebar.classList.add('collapsed');
        Elements.mainContent.classList.add('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', 'true');
    }
    
    updateHeaderOnSidebarToggle();
}

function loadSidebarState() {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        Elements.sidebar.classList.add('collapsed');
        Elements.mainContent.classList.add('sidebar-collapsed');
    }
    updateHeaderOnSidebarToggle();
}

async function generateDiseaseGuide() {
    if (Elements.diseaseGuideContainer.children.length > 0) {
        return; // Already generated
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

                ${disease.causes.length > 0 ? `
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

// File handling functions
function handleDragOver(e) {
    e.preventDefault();
    Elements.uploadArea.classList.add('dragover');
}

function handleDragLeave() {
    Elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    Elements.uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

function validateFile(file) {
    const errors = [];
    
    if (!file) {
        errors.push('No file selected');
        return { valid: false, errors };
    }

    if (!AppState.allowedTypes.includes(file.type)) {
        errors.push('Invalid file type. Please select a JPEG, PNG, or WebP image.');
    }

    if (file.size > AppState.maxFileSize) {
        errors.push(`File size too large. Maximum size is ${AppState.maxFileSize / (1024 * 1024)}MB.`);
    }

    return { valid: errors.length === 0, errors };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    Elements.uploadArea.parentNode.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function showSuccess(message) {
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    Elements.uploadArea.parentNode.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

function showLoading(message = 'Processing...') {
    Elements.loading.style.display = 'block';
    const loadingText = Elements.loading.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = message;
    }
}

function hideLoading() {
    Elements.loading.style.display = 'none';
}

async function handleFile(file) {
    const validation = validateFile(file);
    
    if (!validation.valid) {
        showError(validation.errors.join(' '));
        return;
    }

    AppState.currentFile = file;
    AppState.isAnalyzed = false; // Reset analysis state for new image
    AppState.currentUploadData = null; // Clear previous upload data
    
    // Show file info
    Elements.fileName.textContent = `File: ${file.name}`;
    Elements.fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
    Elements.fileInfo.classList.add('show');

    // Show local preview using FileReader
    const reader = new FileReader();
    reader.onload = function(e) {
        Elements.previewImage.src = e.target.result;
        Elements.previewArea.style.display = 'block';
        Elements.uploadArea.classList.add('has-image');
        
        // Enable analyze button and clear button for new image
        Elements.analyzeBtn.disabled = false;
        Elements.analyzeBtn.textContent = 'Analyze Image'; // Reset button text
        Elements.analyzeBtn.style.opacity = '1'; // Reset visual styling
        Elements.analyzeBtn.style.cursor = 'pointer';
        
        Elements.clearBtn.disabled = false;
        Elements.clearBtn.style.opacity = '1'; // Reset clear button styling
        Elements.clearBtn.style.cursor = 'pointer';
        
        // Clear any previous results
        Elements.resultsContainer.innerHTML = '<div class="results-placeholder">Upload an image to view analysis results</div>';
    };
    reader.readAsDataURL(file);

    showSuccess('Image selected! Click "Analyze Image" to upload and analyze.');
}

function displayResults(results) {
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

function clearImage() {
    // Prevent clearing if image has been analyzed - user should upload new image instead
    if (AppState.isAnalyzed) {
        showError('Image has been analyzed. Please upload a new image instead of clearing.');
        return;
    }
    
    AppState.currentImage = null;
    AppState.currentFile = null;
    AppState.currentUploadData = null;
    AppState.isAnalyzed = false; // Reset analysis state
    Elements.previewArea.style.display = 'none';
    Elements.fileInfo.classList.remove('show');
    Elements.uploadArea.classList.remove('has-image');
    Elements.fileInput.value = '';
    
    // Reset and disable buttons
    Elements.analyzeBtn.disabled = true;
    Elements.analyzeBtn.textContent = 'Analyze Image'; // Reset button text
    Elements.analyzeBtn.style.opacity = '1'; // Reset visual styling
    Elements.analyzeBtn.style.cursor = 'pointer';
    
    Elements.clearBtn.disabled = true;
    Elements.clearBtn.style.opacity = '1'; // Reset clear button styling
    Elements.clearBtn.style.cursor = 'pointer';
    
    // Clear any existing results
    Elements.resultsContainer.innerHTML = '<div class="results-placeholder">Upload an image to view analysis results</div>';
}

async function deleteImage() {
    if (!AppState.currentUploadData || !AppState.currentUploadData.publicId) {
        showError('No image to delete');
        return;
    }

    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading('Deleting image...');
        
        const response = await fetch(`${AppState.apiBaseUrl}/api/upload/${AppState.currentUploadData.publicId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete image');
        }

        hideLoading();
        showSuccess('Image deleted successfully!');
        clearImage();
        
        // Refresh history to remove deleted items
        await loadHistoryPage(1);
        
    } catch (error) {
        hideLoading();
        console.error('Delete error:', error);
        showError('Failed to delete image: ' + error.message);
    }
}

async function analyzeImage() {
    // Prevent analysis if no file, already analyzing, or already analyzed
    if (!AppState.currentFile || AppState.isAnalyzing || AppState.isAnalyzed) {
        console.log('Analysis blocked:', {
            hasFile: !!AppState.currentFile,
            isAnalyzing: AppState.isAnalyzing,
            isAnalyzed: AppState.isAnalyzed
        });
        return;
    }

    AppState.isAnalyzing = true;
    Elements.analyzeBtn.disabled = true;
    Elements.analyzeBtn.textContent = 'Uploading & Analyzing...';
    
    // Show progress bar
    Elements.progressBar.style.display = 'block';
    Elements.progressFill.style.width = '0%';

    try {
        showLoading('Uploading image to cloud...');
        
        // First upload the image
        const uploadResponse = await ApiService.uploadImage(AppState.currentFile);
        AppState.currentUploadData = uploadResponse.data;
        
        // Update progress
        Elements.progressFill.style.width = '50%';
        
        // Update preview to use Cloudinary URL
        AppState.currentImage = AppState.currentUploadData.path;
        Elements.previewImage.src = AppState.currentImage;
        
        showLoading('Analyzing image...');
        Elements.progressFill.style.width = '75%';
        
        // Call the analysis API to get real ML results
        const analysisResponse = await ApiService.analyzeImage(AppState.currentUploadData);
        
        if (!analysisResponse.success || !analysisResponse.data) {
            throw new Error('Invalid analysis response from server');
        }
        
        Elements.progressFill.style.width = '100%';
        hideLoading();
        
        // Display the actual ML results from the backend
        displayResults(analysisResponse.data);
        showSuccess('Analysis completed successfully!');
        
        // Mark image as analyzed and disable both buttons
        AppState.isAnalyzed = true;
        Elements.analyzeBtn.disabled = true;
        Elements.analyzeBtn.textContent = 'Image Already Analyzed';
        Elements.analyzeBtn.style.opacity = '0.5';
        Elements.analyzeBtn.style.cursor = 'not-allowed';
        
        // Also disable clear button - user should upload new image instead
        Elements.clearBtn.disabled = true;
        Elements.clearBtn.style.opacity = '0.5';
        Elements.clearBtn.style.cursor = 'not-allowed';
        
        // Refresh history
        await loadHistoryPage(1);
        
        // Hide progress bar
        setTimeout(() => {
            Elements.progressBar.style.display = 'none';
        }, 500);
        
    } catch (error) {
        hideLoading();
        console.error('Analysis error:', error);
        showError('Analysis failed: ' + error.message);
        Elements.progressBar.style.display = 'none';
    } finally {
        AppState.isAnalyzing = false;
        // Don't re-enable the button here - let the success/error handling manage it
        if (!AppState.isAnalyzed) {
            // Only re-enable if analysis failed
            Elements.analyzeBtn.disabled = false;
            Elements.analyzeBtn.textContent = 'Analyze Image';
        }
    }
}

// History management functions
async function loadHistoryPage(page = 1) {
    try {
        showLoading('Loading history...');
        const response = await ApiService.getAnalysisHistory(page, 20);
        hideLoading();

        updateHistoryDisplay(response.data.analyses);
        updateHistoryPagination(response.data.pagination);

    } catch (error) {
        hideLoading();
        Elements.historyGrid.innerHTML = '<div class="empty-state">Failed to load history: ' + error.message + '</div>';
    }
}

function updateHistoryDisplay(history) {
    if (history.length === 0) {
        Elements.historyGrid.innerHTML = '<div class="empty-state">No analysis history yet</div>';
        return;
    }

    const tableHeader = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Disease</th>
                    <th>Date</th>
                    <th>Confidence</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    const tableRows = history.map((item) => {
        const thumbnailUrl = item.thumbnail_path || 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA2NEg4M1Y2MEg4N1Y2NFpNMTEzIDY0SDE3VjYwSDExM1Y2NFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
        const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <tr class="history-item" data-analysis-id="${item.analysis_id}">
                <td class="history-thumbnail-cell">
                    <img src="${thumbnailUrl}" class="history-thumbnail" alt="Analysis of ${item.original_filename}">
                </td>
                <td class="history-disease">${item.disease_name || 'N/A'}</td>
                <td class="history-date">${formattedDate}</td>
                <td class="history-confidence">
                    <span class="status-badge status-${item.status}">
                        ${item.confidence}%
                    </span>
                </td>
                <td class="history-actions">
                    <button class="btn btn-sm btn-danger delete-history-btn" data-analysis-id="${item.analysis_id}" title="Delete analysis and image">
                        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    const tableFooter = `
            </tbody>
        </table>
    `;

    Elements.historyGrid.innerHTML = tableHeader + tableRows + tableFooter;
}

function updateHistoryPagination(pagination) {
    if (pagination.totalPages <= 1) {
        Elements.historyPagination.style.display = 'none';
        return;
    }

    Elements.historyPagination.style.display = 'flex';
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button data-page="${pagination.currentPage - 1}" 
                ${!pagination.hasPreviousPage ? 'disabled' : ''}>
            Previous
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button data-page="${i}" 
                    class="${i === pagination.currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button data-page="${pagination.currentPage + 1}" 
                ${!pagination.hasNextPage ? 'disabled' : ''}>
            Next
        </button>
    `;
    
    Elements.historyPagination.innerHTML = paginationHTML;
}

async function deleteHistoryItem(analysisId) {
    if (!confirm('Are you sure you want to delete this analysis and its associated image? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading('Deleting analysis and image...');
        
        const response = await fetch(`${AppState.apiBaseUrl}/api/analysis/${analysisId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete analysis');
        }

        hideLoading();
        showSuccess('Analysis and image deleted successfully!');
        
        // Refresh history
        await loadHistoryPage(1);
        
    } catch (error) {
        hideLoading();
        console.error('Delete history error:', error);
        showError('Failed to delete analysis: ' + error.message);
    }
}

async function viewHistoryItem(analysisId) {
    try {
        showLoading('Loading analysis...');
        const response = await ApiService.getAnalysisById(analysisId);
        hideLoading();

        const item = response.data;
        
        // Set up the image and data for viewing
        // Cloudinary URLs are complete URLs, no need to prepend API base URL
        AppState.currentImage = item.image_path;
        Elements.previewImage.src = AppState.currentImage;
        Elements.previewArea.style.display = 'block';
        Elements.uploadArea.classList.add('has-image');
        
        // Display the results
        displayResults({
            disease: item.disease_name,
            confidence: item.confidence,
            status: item.status,
            severity: item.severity,
            description: item.description,
            causes: item.causes,
            treatments: item.treatments,
            prevention: item.prevention
        });
        
        // Navigate to analyze page to show the results
        navigateToPage('analyze');
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        hideLoading();
        showError('Failed to load analysis: ' + error.message);
    }
}

// Event listeners
Elements.uploadArea.addEventListener('dragover', handleDragOver);
Elements.uploadArea.addEventListener('dragleave', handleDragLeave);
Elements.uploadArea.addEventListener('drop', handleDrop);
Elements.uploadArea.addEventListener('click', () => Elements.fileInput.click());
Elements.fileInput.addEventListener('change', handleFileSelect);

// Navigation event listeners
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = item.getAttribute('data-page');
        navigateToPage(pageId);
    });
});

Elements.mobileNavToggle.addEventListener('click', toggleMobileSidebar);
Elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);
Elements.sidebarToggle.addEventListener('click', toggleSidebarCollapse);

// Button event listeners
Elements.analyzeBtn.addEventListener('click', analyzeImage);
Elements.clearBtn.addEventListener('click', clearImage);
Elements.selectImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Elements.fileInput.click();
});
Elements.refreshHistoryBtn.addEventListener('click', () => loadHistoryPage(1));

// Event delegation for history items
Elements.historyGrid.addEventListener('click', (e) => {
    // Check if delete button was clicked
    if (e.target.closest('.delete-history-btn')) {
        e.stopPropagation(); // Prevent triggering the view action
        const deleteBtn = e.target.closest('.delete-history-btn');
        const analysisId = deleteBtn.getAttribute('data-analysis-id');
        if (analysisId) {
            deleteHistoryItem(analysisId);
        }
        return;
    }
    
    // Otherwise, handle view action
    const historyItem = e.target.closest('.history-item');
    if (historyItem) {
        const analysisId = historyItem.getAttribute('data-analysis-id');
        if (analysisId) {
            viewHistoryItem(analysisId);
        }
    }
});

// Event delegation for pagination
Elements.historyPagination.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
        const page = parseInt(e.target.getAttribute('data-page'));
        if (page && page > 0) {
            loadHistoryPage(page);
        }
    }
});

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Initialize the application
async function initializeApp() {
    // Check authentication first
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }
    
    // Initialize UI state
    Elements.analyzeBtn.disabled = true;
    Elements.clearBtn.disabled = true;
    
    loadSidebarState();
    // Set header based on initially active page
    const active = document.querySelector('.page.active');
    if (active && active.id.endsWith('Page')) {
        updateHeaderForPage(active.id.replace('Page',''));
    } else {
        updateHeaderForPage('analyze');
    }
    console.log('AloeShield frontend initialized');
    console.log('User:', AppState.user?.name);
    console.log('API Base URL:', AppState.apiBaseUrl);
    console.log('Supported file types:', AppState.allowedTypes);
    console.log('Max file size:', AppState.maxFileSize / (1024 * 1024), 'MB');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);
