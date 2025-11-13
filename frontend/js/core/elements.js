// Helper function to safely get element by ID
const getElement = (id) => document.getElementById(id);

// Helper function to safely query selector
const query = (selector) => document.querySelector(selector);

export const Elements = {
    // Getter methods for dynamic elements
    get uploadArea() { return getElement('uploadArea'); },
    get fileInput() { return getElement('fileInput'); },
    get previewArea() { return getElement('previewArea'); },
    get previewImage() { return getElement('previewImage'); },
    get loading() { return getElement('loading'); },
    get resultsContainer() { return getElement('resultsContainer'); },
    get historyGrid() { return getElement('historyGrid'); },
    get fileInfo() { return getElement('fileInfo'); },
    get fileName() { return getElement('fileName'); },
    get fileSize() { return getElement('fileSize'); },
    get progressBar() { return getElement('progressBar'); },
    get progressFill() { return getElement('progressFill'); },
    get analyzeBtn() { return getElement('analyzeBtn'); },
    get clearBtn() { return getElement('clearBtn'); },
    get selectImageBtn() { return getElement('selectImageBtn'); },
    get refreshHistoryBtn() { return getElement('refreshHistoryBtn'); },
    get sidebar() { return query('.sidebar, .admin-sidebar'); },
    get sidebarOverlay() { return getElement('sidebarOverlay'); },
    get mobileNavToggle() { return getElement('mobileNavToggle'); },
    get sidebarToggle() { return getElement('sidebarToggle'); },
    get mainContent() { return query('.main-content, .admin-content'); },
    get diseaseGuideContainer() { return getElement('diseaseGuideContainer'); },
    get historyPagination() { return getElement('historyPagination'); },
    get headerPageTitle() { return getElement('headerPageTitle'); },
    get headerPageSubtitle() { return getElement('headerPageSubtitle'); },
    get logoutBtn() { return getElement('logoutBtn'); },
    get userName() { return getElement('userName') || getElement('adminName'); },
    get userEmail() { return getElement('userEmail'); },
    get analysisModal() { return getElement('analysisModal'); },
    get modalOverlay() { return getElement('modalOverlay'); },
    get modalCloseBtn() { return getElement('modalCloseBtn'); },
    get modalTitle() { return getElement('modalTitle'); },
    get modalAnalysisContent() { return getElement('modalAnalysisContent'); },
    get deleteConfirmationModal() { return getElement('deleteConfirmationModal'); },
    get deleteConfirmationOverlay() { return getElement('deleteConfirmationOverlay'); },
    get deleteConfirmationCancel() { return getElement('deleteConfirmationCancel'); },
    get deleteConfirmationConfirm() { return getElement('deleteConfirmationConfirm'); },
    get deleteConfirmationTitle() { return getElement('deleteConfirmationTitle'); },
    get deleteConfirmationMessage() { return getElement('deleteConfirmationMessage'); },
    get logoutConfirmationModal() { return getElement('logoutConfirmationModal'); },
    get logoutConfirmationOverlay() { return getElement('logoutConfirmationOverlay'); },
    get logoutConfirmationCancel() { return getElement('logoutConfirmationCancel'); },
    get logoutConfirmationConfirm() { return getElement('logoutConfirmationConfirm'); },
    get headerPageTitle() { return getElement('headerPageTitle'); },
    get headerPageSubtitle() { return getElement('headerPageSubtitle'); },
    get currentWeatherContainer() { return getElement('currentWeatherContainer'); },
    get diseaseRiskContainer() { return getElement('diseaseRiskContainer'); },
    get forecastContainer() { return getElement('forecastContainer'); },
    get weatherLocation() { return getElement('weatherLocation'); },
    get setLocationBtn() { return getElement('setLocationBtn'); },
    get useGeolocationBtn() { return getElement('useGeolocationBtn'); },
    get treatmentPlanModal() { return getElement('treatmentPlanModal'); },
    get treatmentPlanOverlay() { return getElement('treatmentPlanOverlay'); },
    get treatmentPlanCloseBtn() { return getElement('treatmentPlanCloseBtn'); },
    get treatmentPlanTitle() { return getElement('treatmentPlanTitle'); },
    get treatmentPlanContent() { return getElement('treatmentPlanContent'); }
};

export function querySelector(selector) {
    return document.querySelector(selector);
}

export function querySelectorAll(selector) {
    return document.querySelectorAll(selector);
}
