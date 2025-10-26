import { AppState } from '../../core/state.js';
import { Elements } from '../../core/elements.js';

export function initSettingsPage() {
    loadSettings();
}

export function loadSettings() {
    const settings = {
        notifications: localStorage.getItem('notifications-enabled') !== 'false',
        darkMode: localStorage.getItem('dark-mode') === 'true',
        autoRefresh: localStorage.getItem('auto-refresh') !== 'false'
    };

    renderSettings(settings);
}

function renderSettings(settings) {
    const settingsContainer = document.querySelector('[data-settings-container]');
    if (!settingsContainer) return;

    settingsContainer.innerHTML = `
        <div class="settings-group">
            <h3>Preferences</h3>
            
            <div class="settings-item">
                <label class="settings-label">
                    <input type="checkbox" class="settings-checkbox" data-setting="notifications" ${settings.notifications ? 'checked' : ''}>
                    Enable Notifications
                </label>
                <p class="settings-description">Receive notifications when analysis is complete</p>
            </div>

            <div class="settings-item">
                <label class="settings-label">
                    <input type="checkbox" class="settings-checkbox" data-setting="dark-mode" ${settings.darkMode ? 'checked' : ''}>
                    Dark Mode
                </label>
                <p class="settings-description">Use dark theme for the application</p>
            </div>

            <div class="settings-item">
                <label class="settings-label">
                    <input type="checkbox" class="settings-checkbox" data-setting="auto-refresh" ${settings.autoRefresh ? 'checked' : ''}>
                    Auto-Refresh History
                </label>
                <p class="settings-description">Automatically refresh analysis history</p>
            </div>
        </div>

        <div class="settings-group">
            <h3>Account</h3>
            <div class="settings-item">
                <p class="settings-description">Email: ${AppState.user?.email || 'Not set'}</p>
            </div>
            <div class="settings-item">
                <p class="settings-description">Joined: ${AppState.user?.createdAt ? new Date(AppState.user.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
        </div>
    `;

    attachSettingsEventListeners();
}

function attachSettingsEventListeners() {
    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const setting = e.target.getAttribute('data-setting');
            const value = e.target.checked;
            
            if (value) {
                localStorage.setItem(setting, 'true');
            } else {
                localStorage.removeItem(setting);
            }

            applySetting(setting, value);
        });
    });
}

function applySetting(setting, value) {
    switch (setting) {
        case 'dark-mode':
            if (value) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            break;
        case 'notifications':
            console.log('Notifications', value ? 'enabled' : 'disabled');
            break;
        case 'auto-refresh':
            console.log('Auto-refresh', value ? 'enabled' : 'disabled');
            break;
    }
}

export function loadDarkModeSetting() {
    const darkMode = localStorage.getItem('dark-mode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
}
