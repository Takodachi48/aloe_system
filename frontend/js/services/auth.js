import { AppState, setUser, clearUser } from '../core/state.js';

export function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

export function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function logout() {
    console.log('Logging out...');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('weatherLocation');
    localStorage.removeItem('weatherCoordinates');
    clearUser();
    window.location.href = '/login.html';
}

export async function checkAuthentication() {
    const token = getAuthToken();
    
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }

    try {
        const response = await fetch(`${AppState.apiBaseUrl}/api/auth/verify`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            logout();
            return false;
        }

        const data = await response.json();
        setUser(data.user, token);
        return true;
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
