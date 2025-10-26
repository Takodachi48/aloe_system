const AdminAnalytics = (() => {
    const getAnalyticsSummary = async () => {
        try {
            if (!window.AdminState) {
                throw new Error('AdminState not available');
            }

            const summary = {
                totalUsers: window.AdminState.users?.length || 0,
                activeUsers: window.AdminState.users?.filter(u => u.isActive !== false).length || 0,
                totalAnnouncements: window.AdminState.announcements?.length || 0,
                activeAnnouncements: window.AdminState.announcements?.filter(a => a.isActive).length || 0
            };

            return summary;
        } catch (error) {
            console.error('Error getting analytics summary:', error);
            return null;
        }
    };

    const renderAnalyticsDashboard = async () => {
        try {
            const summary = await getAnalyticsSummary();
            if (!summary) return;

            const container = document.getElementById('analyticsContent');
            if (!container) return;

            container.innerHTML = `
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Total Users</h3>
                        </div>
                        <div class="analytics-card-value">${summary.totalUsers}</div>
                        <div class="analytics-card-subtitle">Registered users in the system</div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Active Users</h3>
                        </div>
                        <div class="analytics-card-value">${summary.activeUsers}</div>
                        <div class="analytics-card-subtitle">Currently active accounts</div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Total Announcements</h3>
                        </div>
                        <div class="analytics-card-value">${summary.totalAnnouncements}</div>
                        <div class="analytics-card-subtitle">System announcements created</div>
                    </div>
                    
                    <div class="analytics-card">
                        <div class="analytics-card-header">
                            <h3>Active Announcements</h3>
                        </div>
                        <div class="analytics-card-value">${summary.activeAnnouncements}</div>
                        <div class="analytics-card-subtitle">Currently active announcements</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering analytics:', error);
        }
    };

    const init = async () => {
        await renderAnalyticsDashboard();
    };

    return {
        getAnalyticsSummary,
        renderAnalyticsDashboard,
        init
    };
})();
