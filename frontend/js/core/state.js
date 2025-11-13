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
    // Ensure the user object has all required fields
    const userData = {
        _id: user._id || user.id,
        name: user.name,
        username: user.username,  // Make sure username is included
        email: user.email,
        isAdmin: user.isAdmin || false,
        profilePicture: user.profilePicture || null
    };
    
    // Update AppState
    AppState.user = userData;
    AppState.authToken = token;
    
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) {
        localStorage.setItem('authToken', token);
    }
    
    console.log('User data saved to localStorage:', userData);
}

export function clearUser() {
    AppState.user = null;
    AppState.authToken = null;
}
