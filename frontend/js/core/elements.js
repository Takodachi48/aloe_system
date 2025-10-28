export const Elements = {
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
    logoutBtn: document.getElementById('logoutBtn'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    analysisModal: document.getElementById('analysisModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalTitle: document.getElementById('modalTitle'),
    modalAnalysisContent: document.getElementById('modalAnalysisContent'),
    deleteConfirmationModal: document.getElementById('deleteConfirmationModal'),
    deleteConfirmationOverlay: document.getElementById('deleteConfirmationOverlay'),
    deleteConfirmationCancel: document.getElementById('deleteConfirmationCancel'),
    deleteConfirmationConfirm: document.getElementById('deleteConfirmationConfirm'),
    deleteConfirmationTitle: document.getElementById('deleteConfirmationTitle'),
    deleteConfirmationMessage: document.getElementById('deleteConfirmationMessage'),
    logoutConfirmationModal: document.getElementById('logoutConfirmationModal'),
    logoutConfirmationOverlay: document.getElementById('logoutConfirmationOverlay'),
    logoutConfirmationCancel: document.getElementById('logoutConfirmationCancel'),
    logoutConfirmationConfirm: document.getElementById('logoutConfirmationConfirm'),
    currentWeatherContainer: document.getElementById('currentWeatherContainer'),
    diseaseRiskContainer: document.getElementById('diseaseRiskContainer'),
    forecastContainer: document.getElementById('forecastContainer'),
    weatherLocation: document.getElementById('weatherLocation'),
    setLocationBtn: document.getElementById('setLocationBtn'),
    useGeolocationBtn: document.getElementById('useGeolocationBtn')
};

export function getElement(id) {
    return document.getElementById(id);
}

export function querySelector(selector) {
    return document.querySelector(selector);
}

export function querySelectorAll(selector) {
    return document.querySelectorAll(selector);
}
