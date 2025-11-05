import { AppState, setUser, clearUser } from '../core/state.js';

export function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
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
    const token = getAuthToken();
    
    // First, try to load user data from localStorage if available
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedUser) {
        console.log('Loading user data from localStorage:', { id: savedUser._id, hasProfilePicture: !!savedUser.profilePicture });
        setUser(savedUser, token);
    }
    
    if (!token) {
        // Don't redirect to login if we're in maintenance mode
        if (isMaintenanceMode) {
            return false;
        }
        // Clear any existing user data if no token is present
        clearUser();
        window.location.href = '/login.html';
        return false;
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
