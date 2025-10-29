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
        
        // Store token
        console.log('Storing token...', { rememberMe, hasToken: !!data.token });
        localStorage.setItem('authToken', data.token);
        
        // Store user info
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Verify it was stored
        const storedToken = localStorage.getItem('authToken');
        console.log('Token stored successfully. Verification:', storedToken ? 'FOUND' : 'NOT FOUND');
        
        showMessage('Login successful! Redirecting...', 'success');
        
        // Redirect based on user role
        setTimeout(() => {
            console.log('Redirecting...');
            if (data.user.isAdmin) {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/';
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
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
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
            body: JSON.stringify({ name, email, password })
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
    if (token) {
        // Verify token is still valid
        fetch(`${apiBaseUrl}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/index.html';
            } else {
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        })
        .catch(() => {
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
