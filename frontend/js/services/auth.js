import { AppState, setUser, clearUser } from '../core/state.js';

export function getAuthToken() {
    // Get the token from storage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    // If no token, return null
    if (!token) return null;
    
    try {
        // Decode the token to get user info
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const tokenUserId = payload.userId || payload.sub;
            
            // Get current user from AppState or localStorage
            const currentUser = AppState.user || JSON.parse(localStorage.getItem('user') || 'null');
            const currentUserId = currentUser?._id || currentUser?.id;
            
            // If the token doesn't belong to the current user, clear it
            if (currentUserId && tokenUserId !== currentUserId) {
                console.warn('Token user ID does not match current user ID. Clearing token.', {
                    tokenUserId,
                    currentUserId
                });
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                return null;
            }
        }
    } catch (error) {
        console.error('Error validating auth token:', error);
        // If there's an error parsing the token, clear it
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        return null;
    }
    
    return token;
}

export function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function logout() {
    console.log('Logging out and clearing all user data...');
    
    // Clear all authentication tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    
    // Clear all user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('profilePicture');
    
    // Clear other cached data
    localStorage.removeItem('weatherLocation');
    localStorage.removeItem('weatherCoordinates');
    
    // Clear any session-specific data
    sessionStorage.clear();
    
    // Clear the app state
    clearUser();
    
    // Force a hard redirect to ensure complete logout
    window.location.href = '/login.html';
}

import { isMaintenanceMode } from './api.js';

export async function checkAuthentication() {
    // First, get the token with validation
    const token = getAuthToken();
    
    // If we don't have a valid token, clear any existing session
    if (!token) {
        console.log('No valid authentication token found');
        clearUser();
        
        // Don't redirect to login if we're in maintenance mode
        if (isMaintenanceMode) {
            return false;
        }
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = '/login.html';
        }
        return false;
    }
    
    // If we have a token, try to load user data from localStorage
    const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
    
    // If we have a saved user, set it in the state (this will validate the token matches)
    if (savedUser && savedUser._id) {
        console.log('Loading user data from localStorage:', { 
            id: savedUser._id, 
            email: savedUser.email,
            hasProfilePicture: !!savedUser.profilePicture 
        });
        
        // This will validate that the token matches the user
        setUser(savedUser, token);
    }

    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/auth/verify`, {
            headers: getAuthHeaders(),
            cache: 'no-store' // Prevent caching of the auth check
        });

        if (!response.ok) {
            console.log('Authentication check failed, logging out...');
            logout();
            return false;
        }

        const data = await response.json();
        if (data.user) {
            // Ensure the user object has all required fields
            const userData = {
                _id: data.user.id || data.user._id,
                name: data.user.name || '',
                username: data.user.username || '',  // Add username field
                email: data.user.email || '',
                isAdmin: data.user.isAdmin || false,
                profilePicture: data.user.profilePicture || null
            };
            
            // Save the full user data including profile picture
            setUser(userData, token);
            
            // Save the user data to localStorage
            localStorage.setItem('user', JSON.stringify(userData));
            
            console.log('User authenticated:', { 
                id: userData._id, 
                hasProfilePicture: !!userData.profilePicture 
            });
            
            return true;
        }
        
        console.error('No user data in auth response');
        return false;
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
        return false;
    }
}

export function saveAuthToken(token, remember = false) {
    if (remember) {
        localStorage.setItem('authToken', token);
    } else {
        sessionStorage.setItem('authToken', token);
    }
}

export function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

export function getSavedUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}
