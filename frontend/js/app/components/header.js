import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';
import { logout } from '../../services/auth.js';
import { toggleMobileSidebar } from '../../utils/navigation.js';

export function initHeader() {
    updateUserDisplay();
    attachHeaderEventListeners();
    
    // Listen for profile picture updates
    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('profile-picture-updated', handleProfilePictureUpdate);
}

export function updateUserDisplay() {
    if (Elements.userName && AppState.user) {
        Elements.userName.textContent = AppState.user.name || 'User';
    }
    if (Elements.userEmail && AppState.user) {
        Elements.userEmail.textContent = AppState.user.email || '';
    }
    
    // Update profile picture in header
    updateHeaderAvatar();
}

function updateHeaderAvatar() {
    const headerAvatar = document.querySelector('.user-avatar-header');
    if (!headerAvatar) return;
    
    const defaultIcon = `
        <svg viewBox="0 0 24 24" width="24" height="24" style="fill: white;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    `;
    
    const profilePictureUrl = AppState.user?.profilePicture;
    const hasImage = profilePictureUrl && profilePictureUrl !== '/assets/images/default-avatar.png';
    
    if (hasImage) {
        headerAvatar.style.backgroundImage = `url('${profilePictureUrl}')`;
        headerAvatar.style.backgroundColor = 'transparent';
        headerAvatar.innerHTML = '';
    } else {
        headerAvatar.style.backgroundImage = 'none';
        headerAvatar.style.backgroundColor = '#4CAF50';
        headerAvatar.innerHTML = defaultIcon;
    }
    
    headerAvatar.style.backgroundSize = 'cover';
    headerAvatar.style.backgroundPosition = 'center';
    headerAvatar.style.borderRadius = '50%';
    headerAvatar.style.display = 'flex';
    headerAvatar.style.alignItems = 'center';
    headerAvatar.style.justifyContent = 'center';
}

function handleUserUpdate(event) {
    console.log('Header received user-updated event:', event.detail);
    if (event.detail?.user) {
        // Update AppState if needed
        if (event.detail.user.profilePicture) {
            AppState.user.profilePicture = event.detail.user.profilePicture;
        }
        updateHeaderAvatar();
    }
}

function handleProfilePictureUpdate(event) {
    console.log('Header received profile-picture-updated event:', event.detail);
    if (event.detail?.profilePicture !== undefined) {
        AppState.user.profilePicture = event.detail.profilePicture;
        updateHeaderAvatar();
    }
}

function showLogoutConfirmation() {
    if (!Elements.logoutConfirmationModal) return;

    Elements.logoutConfirmationModal.classList.add('show');

    const handleConfirm = () => {
        Elements.logoutConfirmationModal.classList.remove('show');
        logout();
    };

    const handleCancel = () => {
        Elements.logoutConfirmationModal.classList.remove('show');
    };

    const handleOverlayClick = (e) => {
        if (e.target === Elements.logoutConfirmationOverlay) {
            handleCancel();
        }
    };

    if (Elements.logoutConfirmationConfirm) {
        Elements.logoutConfirmationConfirm.onclick = handleConfirm;
    }

    if (Elements.logoutConfirmationCancel) {
        Elements.logoutConfirmationCancel.onclick = handleCancel;
    }

    if (Elements.logoutConfirmationOverlay) {
        Elements.logoutConfirmationOverlay.onclick = handleOverlayClick;
    }
}

function attachHeaderEventListeners() {
    if (Elements.logoutBtn) {
        Elements.logoutBtn.addEventListener('click', showLogoutConfirmation);
    }

    if (Elements.mobileNavToggle) {
        Elements.mobileNavToggle.addEventListener('click', toggleMobileSidebar);
    }
}
