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

export function setUser(user, token, remember = true) {
    if (!user) {
        console.error('Cannot set user: user data is null or undefined');
        return;
    }

    // Ensure the user object has all required fields
    const userData = {
        _id: user._id || user.id,
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        isAdmin: user.isAdmin || false,
        profilePicture: user.profilePicture || null
    };
    
    // Validate user ID
    if (!userData._id) {
        console.error('Cannot set user: Invalid user ID', user);
        return;
    }
    
    // If a token is provided, validate it matches the user
    if (token) {
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                const tokenUserId = payload.userId || payload.sub;
                
                if (tokenUserId !== userData._id) {
                    console.error('Token user ID does not match provided user ID', {
                        tokenUserId,
                        userId: userData._id
                    });
                    // Don't proceed with setting the user if the token doesn't match
                    return;
                }
                
                // Update the token in the appropriate storage
                if (remember) {
                    localStorage.setItem('authToken', token);
                    // Clear any session token
                    sessionStorage.removeItem('authToken');
                } else {
                    sessionStorage.setItem('authToken', token);
                    // Clear any stored token in localStorage
                    localStorage.removeItem('authToken');
                }
            }
        } catch (error) {
            console.error('Error validating token:', error);
            // Clear invalid tokens
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            return;
        }
    }
    
    // Update AppState
    AppState.user = userData;
    AppState.authToken = token;
    
    // Save user data to localStorage (always, to persist across page loads)
    localStorage.setItem('user', JSON.stringify(userData));
    
    console.log('User data updated in state and storage:', {
        userId: userData._id,
        email: userData.email,
        hasToken: !!token,
        storage: remember ? 'localStorage' : 'sessionStorage'
    });
}

export function clearUser() {
    AppState.user = null;
    AppState.authToken = null;
}
