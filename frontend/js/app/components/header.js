import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';
import { logout } from '../../services/auth.js';
import { toggleMobileSidebar } from '../../utils/navigation.js';

export function initHeader() {
    updateUserDisplay();
    attachHeaderEventListeners();
}

export function updateUserDisplay() {
    if (Elements.userName && AppState.user) {
        Elements.userName.textContent = AppState.user.name || 'User';
    }
    if (Elements.userEmail && AppState.user) {
        Elements.userEmail.textContent = AppState.user.email || '';
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
