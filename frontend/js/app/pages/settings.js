import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showSuccess, showError } from '../../utils/ui.js';
import { getAuthHeaders, getAuthToken } from '../../services/auth.js';

/**
 * Extracts the public ID from a Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} The public ID or null if not found
 */
function extractPublicIdFromUrl(url) {
    if (!url) return null;
    
    try {
        // Extract the path after 'upload/' and before the file extension
        const uploadIndex = url.indexOf('/upload/') + 8; // +8 for '/upload/'.length
        if (uploadIndex === -1) return null;
        
        // Get the part after upload/ and before any transformations or version
        let path = url.substring(uploadIndex);
        
        // Remove any version info (e.g., /v1234567890/)
        path = path.replace(/^v\d+\//, '');
        
        // Remove any transformation parameters
        const questionMarkIndex = path.indexOf('?');
        if (questionMarkIndex !== -1) {
            path = path.substring(0, questionMarkIndex);
        }
        
        // Remove file extension
        const lastDotIndex = path.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            path = path.substring(0, lastDotIndex);
        }
        
        return path || null;
    } catch (error) {
        console.error('Error extracting public ID from URL:', error);
        return null;
    }
}

/**
 * Deletes an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function deleteImageFromCloudinary(publicId) {
    if (!publicId) return false;
    
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        // Use DELETE method with publicId in the URL
        const response = await fetch(`/api/upload/${encodeURIComponent(publicId)}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to delete image');
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Don't fail the upload if deletion fails
        return false;
    }
}

// Function to update profile picture in the UI
const setProfilePicture = (url) => {
    const hasImage = url && url !== '/assets/images/default-avatar.png';
    console.log('Setting profile picture:', url || 'default');

    const profilePicturePreview = document.getElementById('profilePicturePreview');
    const headerAvatar = document.querySelector('.user-avatar-header');
    const defaultIcon = `
        <svg viewBox="0 0 24 24" width="24" height="24" style="fill: white;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    `;

    // Update AppState with the new profile picture URL
    if (AppState.user) {
        AppState.user.profilePicture = hasImage ? url : null;
        console.log('Updated user profile picture in AppState');
    }

    // Update profile picture preview
    if (profilePicturePreview) {
        if (hasImage) {
            profilePicturePreview.style.backgroundImage = `url('${url}')`;
            profilePicturePreview.style.backgroundColor = 'transparent';
            profilePicturePreview.innerHTML = ''; // Clear any default icon
        } else {
            profilePicturePreview.style.backgroundImage = 'none';
            profilePicturePreview.style.backgroundColor = '#4CAF50'; // Green background
            profilePicturePreview.innerHTML = defaultIcon;
        }

        profilePicturePreview.style.backgroundSize = 'cover';
        profilePicturePreview.style.backgroundPosition = 'center';
        profilePicturePreview.style.borderRadius = '50%';
        profilePicturePreview.style.display = 'flex';
        profilePicturePreview.style.alignItems = 'center';
        profilePicturePreview.style.justifyContent = 'center';
    }

    // Update header avatar
    if (headerAvatar) {
        if (hasImage) {
            headerAvatar.style.backgroundImage = `url('${url}')`;
            headerAvatar.style.backgroundColor = 'transparent';
            headerAvatar.innerHTML = ''; // Clear any default icon
        } else {
            headerAvatar.style.backgroundImage = 'none';
            headerAvatar.style.backgroundColor = '#4CAF50'; // Green background
            headerAvatar.innerHTML = defaultIcon;
        }

        headerAvatar.style.backgroundSize = 'cover';
        headerAvatar.style.backgroundPosition = 'center';
        headerAvatar.style.borderRadius = '50%';
        headerAvatar.style.display = 'flex';
        headerAvatar.style.alignItems = 'center';
        headerAvatar.style.justifyContent = 'center';
    }

    // Dispatch event to notify other components of the profile picture update
    const event = new CustomEvent('profile-picture-updated', {
        detail: { profilePicture: hasImage ? url : null }
    });
    window.dispatchEvent(event);
};

export function initSettingsPage() {
    console.log('Initializing settings page...');
    
    // Initialize the settings page with current user data
    const settingsEmail = document.getElementById('settingsEmail');
    if (settingsEmail && AppState.user?.email) {
        settingsEmail.value = AppState.user.email;
    }
    
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        // Show username if available, otherwise show name as fallback
        usernameInput.value = AppState.user?.username || AppState.user?.name || '';
    }
    
    // Set up profile picture preview
    const fileInput = document.getElementById('profilePictureInput');
    const profilePicturePreview = document.getElementById('profilePicturePreview');
    const headerAvatar = document.querySelector('.user-avatar-header');
    
    console.log('Profile picture elements:', { 
        preview: profilePicturePreview, 
        header: headerAvatar,
        fileInput: fileInput
    });
    
    // Set cursor to pointer for clickable elements
    if (profilePicturePreview) {
        profilePicturePreview.style.cursor = 'pointer';
    }
    
    // Set initial profile picture from AppState
    if (AppState.user?.profilePicture) {
        console.log('Loading profile picture from user data:', AppState.user.profilePicture);
        setProfilePicture(AppState.user.profilePicture);
    } else {
        // If no profile picture is set, use the default
        console.log('No profile picture found, using default');
        setProfilePicture();
    }
    
    // Listen for user updates from other components
    const handleUserUpdated = (event) => {
        if (event.detail?.user?.profilePicture) {
            setProfilePicture(event.detail.user.profilePicture);
        }
    };
    
    window.addEventListener('user-updated', handleUserUpdated);
    
    // Clean up event listener when component unmounts
    return () => {
        window.removeEventListener('user-updated', handleUserUpdated);
    };
    
    attachSettingsEventListeners();
}

export function loadSettings() {
    // Check if we're on the settings page
    const settingsPage = document.getElementById('settingsPage');
    if (settingsPage && settingsPage.classList.contains('active')) {
        console.log('Settings page is active, initializing...');
        initSettingsPage();
        attachSettingsEventListeners();
    } else {
        console.log('Settings page is not active');
    }
}

// Export the init function for manual initialization if needed
export function initSettings() {
    initSettingsPage();
    attachSettingsEventListeners();
}

function attachSettingsEventListeners() {
    // Profile picture upload
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profilePicturePreview = document.getElementById('profilePicturePreview');
    const uploadPictureBtn = document.getElementById('uploadPictureBtn');
    
    console.log('Attaching event listeners for profile picture upload...');
    console.log('uploadPictureBtn:', uploadPictureBtn);
    console.log('profilePictureInput:', profilePictureInput);
    console.log('profilePicturePreview:', profilePicturePreview);
    
    const handlePictureClick = () => {
        console.log('Profile picture clicked, triggering file input');
        if (profilePictureInput) {
            profilePictureInput.click();
        } else {
            console.error('Profile picture input not found');
        }
    };
    
    if (uploadPictureBtn) {
        uploadPictureBtn.removeEventListener('click', handlePictureClick); // Remove existing listener to prevent duplicates
        uploadPictureBtn.addEventListener('click', handlePictureClick);
    } else {
        console.warn('Upload picture button not found');
    }
    
    if (profilePicturePreview) {
        profilePicturePreview.style.cursor = 'pointer';
        profilePicturePreview.removeEventListener('click', handlePictureClick); // Remove existing listener to prevent duplicates
        profilePicturePreview.addEventListener('click', handlePictureClick);
    } else {
        console.warn('Profile picture preview element not found');
    }
    
    if (profilePictureInput) {
        profilePictureInput.removeEventListener('change', handleProfilePictureUpload); // Remove existing listener to prevent duplicates
        profilePictureInput.addEventListener('change', handleProfilePictureUpload);
    } else {
        console.error('Profile picture file input not found');
    }

    // Username update button
    const updateUsernameBtn = document.getElementById('updateUsernameBtn');
    if (updateUsernameBtn) {
        updateUsernameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleNameUpdate(e);
        });
    }

    // Update password
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', handlePasswordUpdate);
    }
}

// Listen for page changes to initialize settings when the page becomes active
window.addEventListener('page-changed', (event) => {
    if (event.detail.pageId === 'settingsPage') {
        console.log('Settings page activated, initializing...');
        initSettingsPage();
        attachSettingsEventListeners();
    }
});

// This function is no longer needed as we're not using settings checkboxes anymore

async function handleProfilePictureUpload(e) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const log = (...args) => console.log(`[ProfilePic][${requestId}]`, ...args);
    
    log('handleProfilePictureUpload called');
    log('Current AppState user:', AppState.user ? {
        id: AppState.user._id || AppState.user.id,
        email: AppState.user.email,
        hasProfilePic: !!AppState.user.profilePicture
    } : 'No user in AppState');
    
    if (!e || !e.target) {
        log('Invalid event object:', e);
        return;
    }
    
    const file = e.target.files[0];
    if (!file) {
        console.warn('No file selected');
        return;
    }
    
    console.log('Selected file:', file);
    
    const uploadBtn = document.getElementById('uploadPictureBtn');
    const originalBtnText = uploadBtn?.innerHTML;
    
    try {
        console.log('Starting file upload...');
        
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        // Get the current user and old profile picture URL
        const currentUser = AppState.user || JSON.parse(localStorage.getItem('user') || '{}');
        const oldProfilePicUrl = currentUser?.profilePicture;
        
        // Get the auth token using the auth service
        let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.error('No authentication token found in storage');
            // Try to get the token from AppState if available
            if (AppState.authToken) {
                console.log('Using token from AppState');
                token = AppState.authToken;
            } else {
                // If still no token, force a logout
                console.error('No authentication token available, forcing logout');
                window.dispatchEvent(new CustomEvent('logout'));
                throw new Error('Session expired. Please log in again.');
            }
        }
        
        // If there's an existing profile picture, delete it first
        if (oldProfilePicUrl && oldProfilePicUrl.includes('cloudinary')) {
            try {
                log('Deleting old profile picture...');
                const publicId = extractPublicIdFromUrl(oldProfilePicUrl);
                if (publicId) {
                    await deleteImageFromCloudinary(publicId);
                    log('Old profile picture deleted successfully');
                }
            } catch (deleteError) {
                // Don't fail the upload if deletion fails, just log it
                console.warn('Failed to delete old profile picture:', deleteError);
            }
        }
        
        // Log token details (without exposing the actual token)
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                log('JWT Token payload:', {
                    userId: payload.userId || payload.sub,
                    email: payload.email,
                    exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration',
                    iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'No issued at'
                });
            }
        } catch (tokenError) {
            log('Error parsing JWT token:', tokenError);
        }
        
        log('Sending upload request to /api/upload/profile');
        log('Request headers:', {
            'Authorization': `Bearer ${token.substring(0, 10)}...`,
            'Content-Type': 'multipart/form-data'
        });
        
        // Add request ID to track this request
        formData.append('requestId', requestId);
        
        // Upload the image
        log('Initiating file upload...', {
            file: {
                name: file.name,
                type: file.type,
                size: file.size
            }
        });
        
        // Get auth headers which will include the token if available
        const headers = {
            ...getAuthHeaders(),
            'X-Request-ID': requestId
        };
        
        log('Sending request with headers:', {
            ...headers,
            'Authorization': headers.Authorization ? 'Bearer [TOKEN]' : 'No token'
        });
        
        const response = await fetch('/api/upload/profile', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        log('Received response status:', response.status, response.statusText);
        
        console.log('Upload response status:', response.status);
        
        let data;
        try {
            data = await response.json();
            console.log('Upload response data:', data);
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            throw new Error('Invalid server response');
        }
        
        if (!response.ok) {
            throw new Error(data.message || `Server returned ${response.status}: ${response.statusText}`);
        }
        
        // Extract the profile picture URL - now with proper structure
        let profilePictureUrl = null;
        
        // Check in order of priority
        if (data.user && data.user.profilePicture) {
            profilePictureUrl = data.user.profilePicture;
        } else if (data.data && data.data.profilePictureUrl) {
            profilePictureUrl = data.data.profilePictureUrl;
        } else if (data.data && data.data.path) {
            profilePictureUrl = data.data.path;
        }
        
        console.log('Extracted profile picture URL:', profilePictureUrl);
        
        if (!profilePictureUrl) {
            throw new Error('No profile picture URL returned from server');
        }
        
        // Update the user's profile picture in AppState
        if (AppState.user) {
            log('Updating AppState with new profile picture URL:', profilePictureUrl);
            const oldProfilePic = AppState.user.profilePicture;
            AppState.user.profilePicture = profilePictureUrl;
            
            // Save to localStorage
            try {
                localStorage.setItem('user', JSON.stringify(AppState.user));
                log('Successfully updated user data in localStorage');
                
                // Verify the value was saved correctly
                const savedUser = JSON.parse(localStorage.getItem('user'));
                log('Verified localStorage user data:', {
                    id: savedUser?._id || savedUser?.id,
                    profilePicture: savedUser?.profilePicture,
                    matchesExpected: savedUser?.profilePicture === profilePictureUrl
                });
                
                if (savedUser?.profilePicture !== profilePictureUrl) {
                    console.error('LocalStorage verification failed: Profile picture URL does not match');
                }
            } catch (storageError) {
                console.error('Error saving to localStorage:', storageError);
            }
            
            // Log the change
            log('Profile picture URL updated:', {
                from: oldProfilePic,
                to: profilePictureUrl
            });
        }
        
        // Update the UI with the new profile picture
        setProfilePicture(profilePictureUrl);
        
        // Notify other components of the update
        console.log('Dispatching user-updated event with profile picture:', profilePictureUrl);
        const event = new CustomEvent('user-updated', { 
            detail: { 
                user: AppState.user,
                profilePicture: profilePictureUrl
            },
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(event);
        console.log('Dispatched user-updated event');
        
        showSuccess('Profile picture updated successfully');
        console.log('Profile picture update completed successfully');
        
    } catch (error) {
        const errorDetails = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        };
        
        log('Error uploading profile picture:', errorDetails);
        
        // Check localStorage state
        try {
            const currentUser = JSON.parse(localStorage.getItem('user'));
            log('Current user in localStorage at error time:', currentUser ? {
                id: currentUser._id || currentUser.id,
                email: currentUser.email,
                profilePicture: currentUser.profilePicture
            } : 'No user in localStorage');
        } catch (e) {
            log('Error reading localStorage:', e);
        }
        
        showError(error.message || 'Failed to upload profile picture. Please try again.');
    } finally {
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalBtnText || 'Change Picture';
        }
        // Reset the file input to allow re-uploading the same file
        if (e.target) {
            e.target.value = '';
        }
    }
}

async function handleNameUpdate(e) {
    e.preventDefault();
    
    const updateBtn = document.getElementById('updateUsernameBtn');
    const usernameInput = document.getElementById('usernameInput');
    const newUsername = usernameInput?.value.trim();
    
    if (!updateBtn || !usernameInput) {
        console.error('Update button or username input not found');
        return;
    }
    
    const originalBtnText = updateBtn.innerHTML;
    
    try {
        // Show loading state
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
        
        if (!newUsername) {
            throw new Error('Please enter a username');
        }
        
        // Username validation (alphanumeric with underscores, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(newUsername)) {
            throw new Error('Username must be 3-20 characters long and can only contain letters, numbers, and underscores');
        }
        
        console.log('Sending request to update username...');
        const response = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ username: newUsername })
        });

        const data = await response.json();
        console.log('Server response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to update username');
        }

        // Update auth state with new token if provided
        if (data.token) {
            localStorage.setItem('token', data.token);
            
            // Update AppState
            if (AppState.user) {
                AppState.user = {
                    ...AppState.user,
                    username: data.user?.username || newUsername,
                    name: data.user?.name || AppState.user.name,
                    email: data.user?.email || AppState.user.email
                };
                
                // Save updated user to localStorage
                localStorage.setItem('user', JSON.stringify(AppState.user));
                
                // Update all name elements in the UI
                const nameElements = document.querySelectorAll('.user-name, .name-display, #userName');
                nameElements.forEach(el => {
                    el.textContent = data.user?.username || newUsername;
                });
                
                // Trigger user update event
                window.dispatchEvent(new CustomEvent('user-updated', {
                    detail: { user: AppState.user }
                }));
            }
        }
        
        showSuccess('Username updated successfully');
    } catch (error) {
        console.error('Error updating display name:', error);
        showError(error.message || 'Failed to update display name');
    } finally {
        // Reset button state
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalBtnText;
    }
}

async function handlePasswordUpdate() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('Please fill in all password fields');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ currentPassword, newPassword })
        }).then(res => res.json());
        
        if (response.success) {
            // Clear the password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            showSuccess('Password updated successfully');
        } else {
            throw new Error(response.message || 'Failed to update password');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showError(error.message || 'Failed to update password');
    }
}

// Initialize settings when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    initSettings();
}
