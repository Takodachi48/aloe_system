import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showSuccess, showError } from '../../utils/ui.js';
import { getAuthHeaders } from '../../services/auth.js';

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
    if (usernameInput && AppState.user?.name) {
        usernameInput.value = AppState.user.name;
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
    console.log('handleProfilePictureUpload called');
    
    if (!e || !e.target) {
        console.error('Invalid event object:', e);
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
        
        // Get the auth token
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated - please log in again');
        }
        
        console.log('Sending upload request to /api/upload/profile');
        
        // Upload the image
        const response = await fetch('/api/upload/profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type, let the browser set it with the correct boundary
            },
            body: formData,
            credentials: 'same-origin' // Include cookies if any
        });
        
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
        
        // Extract the profile picture URL from the response
        // The server should return the updated user object with the profilePicture field
        const updatedUser = data.user || data.data?.user;
        let profilePictureUrl = updatedUser?.profilePicture || data.data?.profilePictureUrl || data.profilePictureUrl;
        
        if (!profilePictureUrl) {
            console.warn('No profilePictureUrl in response, checking for image URLs:', data);
            // Fallback to check for any image URL in the response
            const responseData = data.data || data;
            profilePictureUrl = responseData.url || responseData.secure_url || 
                              (responseData.image && responseData.image.url) ||
                              (responseData.files && responseData.files[0]?.url);
            
            if (!profilePictureUrl && responseData) {
                // If we still don't have a URL, try to find the first URL in the response
                const possibleUrl = Object.values(responseData).find(value => 
                    typeof value === 'string' && 
                    (value.startsWith('http') || value.startsWith('/'))
                );
                
                if (possibleUrl) {
                    profilePictureUrl = possibleUrl;
                }
            }
            
            if (!profilePictureUrl) {
                throw new Error('No image URL returned from server');
            }
        }
        
        // Update the user's profile picture in AppState
        if (AppState.user) {
            AppState.user.profilePicture = profilePictureUrl;
            
            // Update the UI with the new profile picture
            setProfilePicture(profilePictureUrl);
            localStorage.setItem('user', JSON.stringify(AppState.user));
            console.log('Saved updated user data to localStorage');
            
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
        } else {
            console.warn('AppState.user is not available');
        }
        
        showSuccess('Profile picture updated successfully');
        console.log('Profile picture update completed successfully');
        
    } catch (error) {
        console.error('Error uploading profile picture:', error);
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
    const nameInput = document.getElementById('usernameInput');
    const newName = nameInput?.value.trim();
    
    if (!updateBtn || !nameInput) {
        console.error('Update button or name input not found');
        return;
    }
    
    const originalBtnText = updateBtn.innerHTML;
    
    try {
        // Show loading state
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
        
        if (!newName) {
            throw new Error('Please enter a display name');
        }
        
        console.log('Sending request to update name...');
        const response = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ name: newName })
        });

        const data = await response.json();
        console.log('Server response:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to update name');
        }

        // Update auth state with new token if provided
        if (data.token) {
            localStorage.setItem('token', data.token);
            
            // Update AppState
            if (AppState.user) {
                AppState.user = {
                    ...AppState.user,
                    name: data.user?.name || newName,
                    email: data.user?.email || AppState.user.email
                };
                
                // Update all name elements in the UI
                const nameElements = document.querySelectorAll('.user-name, .name-display, #userName');
                nameElements.forEach(el => {
                    el.textContent = data.user?.name || newName;
                });
            }
        }
        
        showSuccess('Display name updated successfully');
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
