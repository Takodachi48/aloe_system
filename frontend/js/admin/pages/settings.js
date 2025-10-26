const AdminSettings = (() => {
    const renderSettings = () => {
        const container = document.getElementById('settingsPage');
        if (!container) return;

        container.innerHTML = `
            <header>
                <h1>Settings</h1>
                <p class="subtitle">System configuration</p>
            </header>
            <div class="card">
                <h2>Coming Soon</h2>
                <div class="results-placeholder">Settings panel will be available soon...</div>
            </div>
        `;
    };

    const init = () => {
        renderSettings();
    };

    return {
        renderSettings,
        init
    };
})();
