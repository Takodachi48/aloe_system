const AdminAnalytics = (() => {
    let charts = {};

    const chartColors = {
        primary: 'rgb(51, 187, 134)',
        danger: 'rgb(239, 68, 68)',
        warning: 'rgb(245, 158, 11)',
        info: 'rgb(59, 130, 246)',
        secondary: 'rgb(107, 114, 128)',
        success: 'rgb(16, 185, 129)',
        purple: 'rgb(139, 92, 246)',
        pink: 'rgb(236, 72, 153)',
        indigo: 'rgb(99, 102, 241)'
    };

    const chartColorArray = [
        chartColors.primary,
        chartColors.danger,
        chartColors.warning,
        chartColors.info,
        chartColors.secondary,
        chartColors.success,
        chartColors.purple,
        chartColors.pink,
        chartColors.indigo
    ];

    function getColorsWithoutAdjacentDuplicates(count) {
        if (count <= 1) return chartColorArray.slice(0, count);
        
        const colors = [];
        let currentIndex = 0;
        
        for (let i = 0; i < count; i++) {
            colors.push(chartColorArray[currentIndex]);
            currentIndex = (currentIndex + 2) % chartColorArray.length;
        }
        
        return colors;
    }

    async function fetchAnalyticsData() {
        try {
            const tzOffset = new Date().getTimezoneOffset() * 60 * 1000 * -1;
            
            const cacheBust = Date.now();
            const [diseaseStats, responseTime, uptime, dailyScans, hourlyActivity] = await Promise.all([
                fetch(`${AdminState.apiBaseUrl}/api/admin/analytics/disease-stats`, { headers: getAuthHeaders() }).then(r => r.json()),
                fetch(`${AdminState.apiBaseUrl}/api/admin/analytics/response-time?tzOffset=${tzOffset}&_=${cacheBust}`, { headers: getAuthHeaders() }).then(r => r.json()),
                fetch(`${AdminState.apiBaseUrl}/api/admin/analytics/uptime?_=${cacheBust}`, { headers: getAuthHeaders() }).then(r => r.json()),
                fetch(`${AdminState.apiBaseUrl}/api/admin/analytics/daily-scans`, { headers: getAuthHeaders() }).then(r => r.json()),
                fetch(`${AdminState.apiBaseUrl}/api/admin/analytics/hourly-activity?tzOffset=${tzOffset}&_=${cacheBust}`, { headers: getAuthHeaders() }).then(r => r.json())
            ]);

            return {
                diseaseStats: diseaseStats.data || [],
                responseTime: responseTime.data || [],
                uptime: uptime.data || {},
                dailyScans: dailyScans.data || [],
                hourlyActivity: hourlyActivity.data || []
            };
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            return {
                diseaseStats: [],
                responseTime: [],
                uptime: {},
                dailyScans: [],
                hourlyActivity: []
            };
        }
    }

    function updateQuickStats(data) {
        const totalScans = data.diseaseStats.reduce((sum, d) => sum + (d.count || 0), 0);
        const avgConfidence = data.diseaseStats.length > 0
            ? (data.diseaseStats.reduce((sum, d) => sum + (d.avgConfidence || 0), 0) / data.diseaseStats.length).toFixed(1)
            : 0;
        const diseasesDetected = data.diseaseStats.filter(d => d.count > 0).length;

        document.getElementById('totalScans').textContent = totalScans;
        document.getElementById('diseasesDetected').textContent = diseasesDetected;
        document.getElementById('avgConfidence').textContent = avgConfidence + '%';
    }

    function destroyChart(chartId) {
        if (charts[chartId]) {
            charts[chartId].destroy();
            delete charts[chartId];
        }
    }

    function renderDiseasePieChart(data) {
        destroyChart('diseasePieChart');

        const ctx = document.getElementById('diseasePieChart');
        if (!ctx) return;

        const labels = data.map(d => d.diseaseName || d._id || 'Unknown');
        const counts = data.map(d => d.count || 0);

        charts['diseasePieChart'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: getColorsWithoutAdjacentDuplicates(labels.length),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 },
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    function renderConfidenceBarChart(data) {
        destroyChart('confidenceBarChart');

        const ctx = document.getElementById('confidenceBarChart');
        if (!ctx) return;

        const labels = data.map(d => d.diseaseName || d._id || 'Unknown');
        const avgConfidence = data.map(d => Math.round((d.avgConfidence || 0) * 10) / 10);

        charts['confidenceBarChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average Confidence (%)',
                    data: avgConfidence,
                    backgroundColor: chartColors.primary,
                    borderColor: chartColors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        labels: { font: { size: 12 } }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    function renderResponseTimeChart(data) {
        destroyChart('responseTimeChart');

        const ctx = document.getElementById('responseTimeChart');
        if (!ctx) return;

        const labels = data.map(d => d.date.slice(11, 13) + ':00');
        const avgTimes = data.map(d => d.avgTime);
        const minTimes = data.map(d => d.minTime);
        const maxTimes = data.map(d => d.maxTime);

        charts['responseTimeChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg Response Time (ms)',
                        data: avgTimes,
                        borderColor: chartColors.primary,
                        backgroundColor: 'rgba(51, 187, 134, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2
                    },
                    {
                        label: 'Min Response Time (ms)',
                        data: minTimes,
                        borderColor: chartColors.success,
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 1
                    },
                    {
                        label: 'Max Response Time (ms)',
                        data: maxTimes,
                        borderColor: chartColors.danger,
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { font: { size: 12 } } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 11 } }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    }

    function renderDailyScansChart(data) {
        destroyChart('dailyScansChart');

        const ctx = document.getElementById('dailyScansChart');
        if (!ctx) return;

        const labels = data.map(d => d._id);
        const scans = data.map(d => d.scans);

        charts['dailyScansChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Scans per Day',
                    data: scans,
                    borderColor: chartColors.primary,
                    backgroundColor: 'rgba(51, 187, 134, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: chartColors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { font: { size: 12 } } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 11 } }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    }

    function renderHourlyActivityChart(data) {
        destroyChart('hourlyActivityChart');

        const ctx = document.getElementById('hourlyActivityChart');
        if (!ctx) return;

        const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
        const scans = data;

        charts['hourlyActivityChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Scans per Hour',
                    data: scans,
                    backgroundColor: chartColors.primary,
                    borderColor: chartColors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { font: { size: 12 } } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 11 } }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    }

    function renderUptimeStatus(uptimeData) {
        const container = document.getElementById('uptimeContainer');
        if (!container) return;

        const uptime = uptimeData.uptime || 99.9;
        const status = uptimeData.status || 'active';
        const lastDowntime = uptimeData.lastDowntime ? new Date(uptimeData.lastDowntime).toLocaleString() : 'No downtime recorded';

        let statusBadgeClass = 'active';
        let statusText = 'Active';
        if (status === 'maintenance') {
            statusBadgeClass = 'maintenance';
            statusText = 'Maintenance';
        } else if (status === 'down') {
            statusBadgeClass = 'down';
            statusText = 'Down';
        }

        container.innerHTML = `
            <div class="uptime-gauge">
                <span class="uptime-value">${uptime}%</span>
                <span class="uptime-label">Uptime</span>
            </div>
            <div class="uptime-details">
                <p><strong>Current Status:</strong> <span class="status-badge status-${statusBadgeClass}">${statusText}</span></p>
                <p><strong>Last Downtime:</strong> <span id="lastDowntime">${lastDowntime}</span></p>
            </div>
        `;
    }

    async function renderAnalyticsDashboard() {
        try {
            const data = await fetchAnalyticsData();

            updateQuickStats(data);
            renderDiseasePieChart(data.diseaseStats);
            renderConfidenceBarChart(data.diseaseStats);
            renderResponseTimeChart(data.responseTime);
            renderUptimeStatus(data.uptime);
            renderDailyScansChart(data.dailyScans);
            renderHourlyActivityChart(data.hourlyActivity);
        } catch (error) {
            console.error('Error rendering analytics:', error);
        }
    }

    const init = async () => {
        await renderAnalyticsDashboard();
        setInterval(renderAnalyticsDashboard, 5 * 60 * 1000);
    };

    return {
        init,
        renderAnalyticsDashboard
    };
})();
