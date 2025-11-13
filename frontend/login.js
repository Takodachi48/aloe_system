import { setUser } from './js/core/state.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const switchToRegisterBtn = document.getElementById('switchToRegister');
const switchToLoginBtn = document.getElementById('switchToLogin');
const messageContainer = document.getElementById('messageContainer');
const toggleLoginPassword = document.getElementById('toggleLoginPassword');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');

const apiBaseUrl = window.location.origin;

// Switch between login and register forms
switchToRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    document.querySelector('.login-title').textContent = 'Create Account';
    document.querySelector('.login-subtitle').textContent = 'Join AloeShield today';
    clearMessages();
});

switchToLoginBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    document.querySelector('.login-title').textContent = 'Welcome Back';
    document.querySelector('.login-subtitle').textContent = 'Sign in to continue to AloeShield';
    clearMessages();
});

// Toggle password visibility
toggleLoginPassword.addEventListener('click', () => {
    const passwordInput = document.getElementById('loginPassword');
    togglePasswordVisibility(passwordInput, toggleLoginPassword);
});

toggleRegisterPassword.addEventListener('click', () => {
    const passwordInput = document.getElementById('registerPassword');
    togglePasswordVisibility(passwordInput, toggleRegisterPassword);
});

function togglePasswordVisibility(input, button) {
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    
    const icon = button.querySelector('.eye-icon');
    if (type === 'text') {
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailOrUsername = document.getElementById('loginEmailOrUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!emailOrUsername || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Determine if the input is an email or username
    const isEmail = emailOrUsername.includes('@');
    
    // Create the request body with only one of email or username
    const requestBody = {
        password,
        rememberMe
    };
    
    // Add either email or username to the request body, not both
    if (isEmail) {
        requestBody.email = emailOrUsername.toLowerCase();
    } else {
        requestBody.username = emailOrUsername.toLowerCase();
    }
    
    setLoading('loginBtn', true);
    clearMessages();
    
    try {
        const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Import the setUser function if not already imported
        if (typeof setUser !== 'function') {
            console.error('setUser function not found. Make sure it\'s imported.');
            throw new Error('Internal error: User management not available');
        }
        
        // Store user and token using the enhanced setUser function
        console.log('Storing user session...', { 
            userId: data.user?.id || data.user?._id, 
            rememberMe,
            hasToken: !!data.token 
        });
        
        try {
            // This will validate the token and store it in the appropriate storage
            setUser(data.user, data.token, rememberMe);
            console.log('User session stored successfully');
        } catch (error) {
            console.error('Failed to store user session:', error);
            throw new Error('Failed to initialize user session');
        }
        
        showMessage('Login successful! Redirecting...', 'success');
        
        // Redirect based on user role
        setTimeout(() => {
            console.log('Redirecting...');
            if (data.user.isAdmin) {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/app';
            }
        }, 500);
        
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        setLoading('loginBtn', false);
    }
});

// Handle register form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!name || !username || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    // Username validation (alphanumeric with underscores, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        showMessage('Username must be 3-20 characters long and can only contain letters, numbers, and underscores', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    setLoading('registerBtn', true);
    clearMessages();
    
    try {
        const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        
        // Store token
        console.log('Storing token after registration...', { hasToken: !!data.token });
        localStorage.setItem('authToken', data.token);
        
        // Store user info
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Verify it was stored
        const storedToken = localStorage.getItem('authToken');
        console.log('Token stored successfully. Verification:', storedToken ? 'FOUND' : 'NOT FOUND');
        
        showMessage('Account created successfully! Redirecting...', 'success');
        
        // Redirect to main app (new users are never admins)
        setTimeout(() => {
            console.log('Redirecting to main app...');
            window.location.href = '/';
        }, 500);
        
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        setLoading('registerBtn', false);
    }
});

// Utility functions
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageDiv);
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

function clearMessages() {
    messageContainer.innerHTML = '';
}

function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    if (isLoading) {
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
    } else {
        btn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
        // Verify token is still valid
        fetch(`${apiBaseUrl}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                // Redirect based on user role
                if (user.isAdmin) {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/app';
                }
            } else {
                // Clear invalid auth data
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        })
        .catch(() => {
            // Clear auth data on error
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            localStorage.removeItem('user');
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    console.log('Login page initialized');
});
