export const AppState = {
    analysisHistory: [],
    currentImage: null,
    currentFile: null,
    currentUploadData: null,
    isAnalyzing: false,
    isAnalyzed: false,
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    apiBaseUrl: window.location.origin,
    user: null,
    authToken: null
};

export function resetImageState() {
    AppState.currentImage = null;
    AppState.currentFile = null;
    AppState.currentUploadData = null;
    AppState.isAnalyzed = false;
    AppState.isAnalyzing = false;
}

export function setUser(user, token) {
    AppState.user = user;
    AppState.authToken = token;
}

export function clearUser() {
    AppState.user = null;
    AppState.authToken = null;
}
