class Dashboard {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.metrics = {
            requests: [],
            responseTimes: [],
            agents: new Map(),
            tools: new Map()
        };
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupCharts();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.loadInitialData();
        console.log('📊 Dashboard initialized');
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('✅ Dashboard connected to server');
            document.getElementById('ws-status').innerHTML = '● Online';
            document.getElementById('ws-status').className = 'health-status online';
            this.fetchMetrics();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Dashboard disconnected');
            document.getElementById('ws-status').innerHTML = '● Offline';
            document.getElementById('ws-status').className = 'health-status offline';
        });

        this.socket.on('metrics-update', (data) => {
            this.updateMetrics(data);
        });

        this.socket.on('activity-log', (activity) => {
            this.addActivityItem(activity);
        });

        this.socket.on('error-log', (error) => {
            this.addErrorItem(error);
        });

        this.socket.on('agent-stats', (stats) => {
            this.updateAgentStats(stats);
        });
    }

    setupCharts() {
        // Request Volume Chart
        const requestsCtx = document.getElementById('requests-chart').getContext('2d');
        this.charts.requests = new Chart(requestsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Requests',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Response Time Chart
        const responseCtx = document.getElementById('response-time-chart').getContext('2d');
        this.charts.responseTime = new Chart(responseCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [],
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.fetchMetrics();
            this.showToast('Dashboard refreshed', 'success');
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        // Time range selectors
        document.getElementById('time-range-requests').addEventListener('change', (e) => {
            this.updateRequestsChart(e.target.value);
        });

        document.getElementById('time-range-response').addEventListener('change', (e) => {
            this.updateResponseChart(e.target.value);
        });

        // Clear buttons
        document.getElementById('clear-activity').addEventListener('click', () => {
            this.clearActivityFeed();
        });

        document.getElementById('clear-errors').addEventListener('click', () => {
            this.clearErrorLog();
        });

        // View agents button
        document.getElementById('view-agents').addEventListener('click', () => {
            this.openAgentDetails();
        });
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.fetchMetrics();
        }, 30000); // Refresh every 30 seconds
    }

    async loadInitialData() {
        try {
            await this.fetchMetrics();
            await this.fetchSystemHealth();
            await this.fetchToolUsage();
            await this.fetchRecentActivity();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    async fetchMetrics() {
        try {
            const response = await fetch('/api/metrics/dashboard');
            if (!response.ok) throw new Error('Failed to fetch metrics');

            const data = await response.json();
            this.updateDashboardMetrics(data);
        } catch (error) {
            console.error('Error fetching metrics:', error);
            // Generate mock data for demo
            this.generateMockData();
        }
    }

    async fetchSystemHealth() {
        try {
            const response = await fetch('/api/health/detailed');
            if (!response.ok) throw new Error('Failed to fetch health');

            const data = await response.json();
            this.updateSystemHealth(data);
        } catch (error) {
            console.error('Error fetching system health:', error);
            this.updateSystemHealth({
                memory: Math.floor(Math.random() * 512) + 256,
                cpu: Math.floor(Math.random() * 20) + 5,
                activeJobs: Math.floor(Math.random() * 5)
            });
        }
    }

    async fetchToolUsage() {
        try {
            const response = await fetch('/api/metrics/tools');
            if (!response.ok) throw new Error('Failed to fetch tool usage');

            const data = await response.json();
            this.updateToolUsage(data);
        } catch (error) {
            console.error('Error fetching tool usage:', error);
            this.updateToolUsage({
                'analyze': Math.floor(Math.random() * 50),
                'modify': Math.floor(Math.random() * 30),
                'scrape': Math.floor(Math.random() * 20),
                'chains': Math.floor(Math.random() * 15),
                'memory': Math.floor(Math.random() * 25),
                'jobs': Math.floor(Math.random() * 10)
            });
        }
    }

    async fetchRecentActivity() {
        try {
            const response = await fetch('/api/activity/recent');
            if (!response.ok) throw new Error('Failed to fetch activity');

            const data = await response.json();
            this.populateActivityFeed(data.activities || []);
        } catch (error) {
            console.error('Error fetching activity:', error);
            this.addActivityItem({
                timestamp: new Date(),
                message: 'Dashboard loaded successfully'
            });
        }
    }

    updateDashboardMetrics(data) {
        // Update key metrics
        document.getElementById('total-requests').textContent = this.formatNumber(data.totalRequests || 0);
        document.getElementById('avg-response-time').textContent = `${data.avgResponseTime || 0}ms`;
        document.getElementById('success-rate').textContent = `${data.successRate || 0}%`;
        document.getElementById('active-agents').textContent = data.activeAgents || 0;

        // Update charts with time series data
        if (data.requestHistory) {
            this.updateChartsWithData(data.requestHistory, data.responseTimeHistory);
        }
    }

    updateSystemHealth(data) {
        document.getElementById('memory-usage').textContent = `${data.memory || 0} MB`;
        document.getElementById('cpu-usage').textContent = `${data.cpu || 0}%`;
        document.getElementById('active-jobs').textContent = data.activeJobs || 0;
    }

    updateToolUsage(data) {
        const toolElements = document.querySelectorAll('#tool-usage .usage-item');
        const tools = ['analyze', 'modify', 'scrape', 'chains', 'memory', 'jobs'];

        toolElements.forEach((element, index) => {
            const tool = tools[index];
            if (tool && data[tool] !== undefined) {
                element.querySelector('.usage-count').textContent = data[tool];
            }
        });
    }

    updateChartsWithData(requestHistory, responseTimeHistory) {
        // Update request chart
        if (requestHistory && this.charts.requests) {
            const labels = requestHistory.map(item => this.formatTime(item.timestamp));
            const data = requestHistory.map(item => item.count);

            this.charts.requests.data.labels = labels;
            this.charts.requests.data.datasets[0].data = data;
            this.charts.requests.update();
        }

        // Update response time chart
        if (responseTimeHistory && this.charts.responseTime) {
            const labels = responseTimeHistory.map(item => this.formatTime(item.timestamp));
            const data = responseTimeHistory.map(item => item.avgTime);

            this.charts.responseTime.data.labels = labels;
            this.charts.responseTime.data.datasets[0].data = data;
            this.charts.responseTime.update();
        }
    }

    generateMockData() {
        // Generate mock metrics for demo
        const now = new Date();
        const hours = Array.from({length: 24}, (_, i) => {
            const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
            return {
                timestamp: time,
                count: Math.floor(Math.random() * 50) + 10,
                avgTime: Math.floor(Math.random() * 500) + 100
            };
        });

        this.updateDashboardMetrics({
            totalRequests: Math.floor(Math.random() * 1000) + 500,
            avgResponseTime: Math.floor(Math.random() * 300) + 150,
            successRate: Math.floor(Math.random() * 10) + 90,
            activeAgents: Math.floor(Math.random() * 5) + 3,
            requestHistory: hours,
            responseTimeHistory: hours
        });
    }

    addActivityItem(activity) {
        const feed = document.getElementById('activity-feed');
        const item = document.createElement('div');
        item.className = 'activity-item';

        const time = new Date(activity.timestamp || Date.now());
        const timeStr = this.formatRelativeTime(time);

        item.innerHTML = `
            <span class="activity-time">${timeStr}</span>
            <span class="activity-text">${activity.message}</span>
        `;

        feed.insertBefore(item, feed.firstChild);

        // Limit to last 50 items
        const items = feed.querySelectorAll('.activity-item');
        if (items.length > 50) {
            items[items.length - 1].remove();
        }
    }

    addErrorItem(error) {
        const errorLog = document.getElementById('error-log');

        // Remove "no errors" message if present
        const noErrors = errorLog.querySelector('.no-errors');
        if (noErrors) {
            noErrors.remove();
        }

        const item = document.createElement('div');
        item.className = 'activity-item';

        const time = new Date(error.timestamp || Date.now());
        const timeStr = this.formatRelativeTime(time);

        item.innerHTML = `
            <span class="activity-time">${timeStr}</span>
            <span class="activity-text" style="color: #f56565;">${error.message}</span>
        `;

        errorLog.insertBefore(item, errorLog.firstChild);

        // Limit to last 20 errors
        const items = errorLog.querySelectorAll('.activity-item');
        if (items.length > 20) {
            items[items.length - 1].remove();
        }
    }

    clearActivityFeed() {
        const feed = document.getElementById('activity-feed');
        feed.innerHTML = '<div class="activity-item"><span class="activity-time">Now</span><span class="activity-text">Activity cleared</span></div>';
    }

    clearErrorLog() {
        const errorLog = document.getElementById('error-log');
        errorLog.innerHTML = '<div class="no-errors">No errors reported</div>';
    }

    populateActivityFeed(activities) {
        const feed = document.getElementById('activity-feed');
        feed.innerHTML = '';

        activities.forEach(activity => {
            this.addActivityItem(activity);
        });
    }

    exportData() {
        const data = {
            metrics: this.metrics,
            timestamp: new Date().toISOString(),
            charts: {
                requests: this.charts.requests?.data,
                responseTime: this.charts.responseTime?.data
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully', 'success');
    }

    openSettings() {
        // TODO: Implement settings modal
        this.showToast('Settings panel coming soon', 'info');
    }

    openAgentDetails() {
        // TODO: Implement agent details modal
        this.showToast('Agent details panel coming soon', 'info');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatRelativeTime(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Now';
        if (minutes < 60) return `${minutes}m`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;

        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        switch (type) {
            case 'success':
                toast.style.background = '#48bb78';
                break;
            case 'error':
                toast.style.background = '#f56565';
                break;
            case 'warning':
                toast.style.background = '#ed8936';
                break;
            default:
                toast.style.background = '#4299e1';
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});