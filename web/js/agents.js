class AgentManager {
    constructor() {
        this.socket = null;
        this.agents = new Map();
        this.currentCategory = 'all';
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.loadAgents();
        console.log('🤖 Agent Manager initialized');
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('✅ Agent Manager connected to server');
            this.loadAgents();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Agent Manager disconnected');
        });

        this.socket.on('agent-status-update', (data) => {
            this.updateAgentStatus(data);
        });

        this.socket.on('agent-stats-update', (data) => {
            this.updateAgentStats(data);
        });
    }

    setupEventListeners() {
        // Category tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchCategory(btn.dataset.category);
            });
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadAgents();
            this.showToast('Agent data refreshed', 'success');
        });

        // Add agent button
        document.getElementById('add-agent-btn').addEventListener('click', () => {
            this.showAddAgentDialog();
        });

        // Agent actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('agent-action')) {
                const action = e.target.dataset.action;
                const agentCard = e.target.closest('.agent-card');
                const agentId = agentCard.dataset.agent;
                this.handleAgentAction(agentId, action);
            }
        });

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('agent-modal').addEventListener('click', (e) => {
            if (e.target.id === 'agent-modal') {
                this.closeModal();
            }
        });

        // Add agent card
        document.getElementById('add-agent-card').addEventListener('click', () => {
            this.showAddAgentDialog();
        });
    }

    async loadAgents() {
        try {
            // Load agent data from API
            const response = await fetch('/api/agents');
            if (response.ok) {
                const data = await response.json();
                this.updateAgentData(data);
            } else {
                // Use mock data if API not available
                this.loadMockData();
            }
        } catch (error) {
            console.error('Error loading agents:', error);
            this.loadMockData();
        }
    }

    loadMockData() {
        // Mock agent data for demo
        const mockStats = {
            totalAgents: 15,
            activeAgents: 12,
            totalTasks: 247,
            avgResponse: '1.2s'
        };

        this.updateStats(mockStats);

        // Update agent stats with realistic data
        const agentCards = document.querySelectorAll('.agent-card[data-agent]');
        agentCards.forEach(card => {
            const stats = card.querySelectorAll('.stat-value');
            if (stats.length >= 3) {
                stats[0].textContent = Math.floor(Math.random() * 50) + 10; // Tasks
                stats[1].textContent = (Math.random() * 2 + 0.5).toFixed(1) + 's'; // Avg Time
                stats[2].textContent = Math.floor(Math.random() * 10 + 90) + '%'; // Success Rate
            }
        });
    }

    updateStats(data) {
        document.getElementById('total-agents').textContent = data.totalAgents;
        document.getElementById('active-agents').textContent = data.activeAgents;
        document.getElementById('total-tasks').textContent = data.totalTasks;
        document.getElementById('avg-response').textContent = data.avgResponse;
    }

    switchCategory(category) {
        this.currentCategory = category;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Filter agent cards
        this.filterAgents(category);
    }

    filterAgents(category) {
        const agentCards = document.querySelectorAll('.agent-card');

        agentCards.forEach(card => {
            const shouldShow = category === 'all' ||
                             card.classList.contains(category + '-agent') ||
                             card.id === 'add-agent-card';

            if (shouldShow) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });
    }

    handleAgentAction(agentId, action) {
        switch (action) {
            case 'configure':
                this.showAgentConfig(agentId);
                break;
            case 'test':
                this.testAgent(agentId);
                break;
            case 'logs':
                this.showAgentLogs(agentId);
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    showAgentConfig(agentId) {
        const agentName = this.getAgentName(agentId);
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = `Configure ${agentName}`;
        modalBody.innerHTML = `
            <div class="config-form">
                <div class="form-group">
                    <label for="agent-name">Agent Name</label>
                    <input type="text" id="agent-name" value="${agentName}" class="form-input">
                </div>

                <div class="form-group">
                    <label for="agent-model">AI Model</label>
                    <select id="agent-model" class="form-select">
                        <option value="gpt-4">GPT-4 (Most Capable)</option>
                        <option value="gpt-4-turbo" selected>GPT-4 Turbo (Balanced)</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
                        <option value="claude-3">Claude 3 (Alternative)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="agent-temperature">Creativity Level</label>
                    <input type="range" id="agent-temperature" min="0" max="1" step="0.1" value="0.7" class="form-range">
                    <div class="range-labels">
                        <span>Conservative</span>
                        <span>Balanced</span>
                        <span>Creative</span>
                    </div>
                </div>

                <div class="form-group">
                    <label for="agent-prompt">System Prompt</label>
                    <textarea id="agent-prompt" rows="4" class="form-textarea" placeholder="Enter custom instructions for this agent...">${this.getAgentPrompt(agentId)}</textarea>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="agent-enabled" checked>
                        <span>Agent Enabled</span>
                    </label>
                </div>

                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="agent-logging">
                        <span>Detailed Logging</span>
                    </label>
                </div>

                <div class="form-actions">
                    <button class="btn-secondary" onclick="agentManager.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="agentManager.saveAgentConfig('${agentId}')">Save Changes</button>
                </div>
            </div>
        `;

        this.showModal();
    }

    showAgentLogs(agentId) {
        const agentName = this.getAgentName(agentId);
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = `${agentName} - Activity Logs`;
        modalBody.innerHTML = `
            <div class="logs-container">
                <div class="logs-header">
                    <div class="logs-controls">
                        <select class="form-select" id="log-level">
                            <option value="all">All Levels</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                        </select>
                        <button class="btn-secondary" onclick="agentManager.clearLogs('${agentId}')">Clear Logs</button>
                        <button class="btn-secondary" onclick="agentManager.exportLogs('${agentId}')">Export</button>
                    </div>
                </div>
                <div class="logs-content" id="logs-content">
                    ${this.generateMockLogs(agentId)}
                </div>
            </div>
        `;

        this.showModal();
    }

    generateMockLogs(agentId) {
        const logs = [
            { time: '2024-01-20 14:30:25', level: 'info', message: 'Agent initialized successfully' },
            { time: '2024-01-20 14:31:02', level: 'info', message: 'Processing code analysis request' },
            { time: '2024-01-20 14:31:05', level: 'info', message: 'Analysis completed in 2.3s' },
            { time: '2024-01-20 14:32:15', level: 'warning', message: 'High response time detected (3.2s)' },
            { time: '2024-01-20 14:33:01', level: 'info', message: 'Task completed successfully' },
            { time: '2024-01-20 14:35:12', level: 'error', message: 'API rate limit exceeded, retrying...' },
            { time: '2024-01-20 14:35:18', level: 'info', message: 'Retry successful after 6s delay' }
        ];

        return logs.map(log => `
            <div class="log-entry log-${log.level}">
                <span class="log-time">${log.time}</span>
                <span class="log-level">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }

    async testAgent(agentId) {
        const agentName = this.getAgentName(agentId);
        this.showToast(`Testing ${agentName}...`, 'info');

        try {
            // Simulate agent test
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock test results
            const success = Math.random() > 0.2; // 80% success rate

            if (success) {
                this.showToast(`${agentName} test completed successfully`, 'success');
            } else {
                this.showToast(`${agentName} test failed - check configuration`, 'error');
            }
        } catch (error) {
            this.showToast(`Test failed: ${error.message}`, 'error');
        }
    }

    showAddAgentDialog() {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = 'Create Custom Agent';
        modalBody.innerHTML = `
            <div class="add-agent-form">
                <div class="form-group">
                    <label for="new-agent-name">Agent Name *</label>
                    <input type="text" id="new-agent-name" placeholder="e.g., Database Expert" class="form-input" required>
                </div>

                <div class="form-group">
                    <label for="new-agent-type">Agent Type</label>
                    <select id="new-agent-type" class="form-select">
                        <option value="specialist">Specialist Agent</option>
                        <option value="custom">Custom Agent</option>
                        <option value="template">From Template</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="new-agent-avatar">Avatar Emoji</label>
                    <input type="text" id="new-agent-avatar" placeholder="🗄️" class="form-input" maxlength="2">
                </div>

                <div class="form-group">
                    <label for="new-agent-description">Description</label>
                    <textarea id="new-agent-description" rows="3" class="form-textarea" placeholder="Describe what this agent specializes in..."></textarea>
                </div>

                <div class="form-group">
                    <label for="new-agent-prompt">System Prompt *</label>
                    <textarea id="new-agent-prompt" rows="6" class="form-textarea" placeholder="You are a specialized AI agent that..." required></textarea>
                </div>

                <div class="form-group">
                    <label for="new-agent-model">AI Model</label>
                    <select id="new-agent-model" class="form-select">
                        <option value="gpt-4-turbo" selected>GPT-4 Turbo (Recommended)</option>
                        <option value="gpt-4">GPT-4 (Most Capable)</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
                        <option value="claude-3">Claude 3 (Alternative)</option>
                    </select>
                </div>

                <div class="form-actions">
                    <button class="btn-secondary" onclick="agentManager.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="agentManager.createAgent()">Create Agent</button>
                </div>
            </div>
        `;

        this.showModal();
    }

    async createAgent() {
        const name = document.getElementById('new-agent-name').value;
        const type = document.getElementById('new-agent-type').value;
        const avatar = document.getElementById('new-agent-avatar').value || '🤖';
        const description = document.getElementById('new-agent-description').value;
        const prompt = document.getElementById('new-agent-prompt').value;
        const model = document.getElementById('new-agent-model').value;

        if (!name || !prompt) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }

        try {
            // Create new agent
            const agentData = {
                name,
                type,
                avatar,
                description,
                prompt,
                model,
                enabled: true
            };

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.showToast(`${name} created successfully`, 'success');
            this.closeModal();
            this.addAgentToGrid(agentData);
        } catch (error) {
            this.showToast(`Failed to create agent: ${error.message}`, 'error');
        }
    }

    addAgentToGrid(agentData) {
        const agentsGrid = document.getElementById('agents-grid');
        const addCard = document.getElementById('add-agent-card');

        const newCard = document.createElement('div');
        newCard.className = 'agent-card custom-agent';
        newCard.dataset.agent = agentData.name.toLowerCase().replace(/\s+/g, '-');

        newCard.innerHTML = `
            <div class="agent-header">
                <div class="agent-avatar">${agentData.avatar}</div>
                <div class="agent-status online"></div>
            </div>
            <div class="agent-info">
                <h3>${agentData.name}</h3>
                <p>${agentData.description}</p>
                <div class="agent-tags">
                    <span class="tag">Custom</span>
                    <span class="tag">Active</span>
                </div>
            </div>
            <div class="agent-stats">
                <div class="stat">
                    <span class="stat-label">Tasks</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Avg Time</span>
                    <span class="stat-value">0s</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Success Rate</span>
                    <span class="stat-value">100%</span>
                </div>
            </div>
            <div class="agent-actions">
                <button class="btn-secondary agent-action" data-action="configure">Configure</button>
                <button class="btn-secondary agent-action" data-action="test">Test</button>
                <button class="btn-secondary agent-action" data-action="logs">Logs</button>
            </div>
        `;

        agentsGrid.insertBefore(newCard, addCard);
    }

    saveAgentConfig(agentId) {
        // Get form values
        const name = document.getElementById('agent-name').value;
        const model = document.getElementById('agent-model').value;
        const temperature = document.getElementById('agent-temperature').value;
        const prompt = document.getElementById('agent-prompt').value;
        const enabled = document.getElementById('agent-enabled').checked;
        const logging = document.getElementById('agent-logging').checked;

        // Simulate saving
        this.showToast('Configuration saved successfully', 'success');
        this.closeModal();
    }

    clearLogs(agentId) {
        document.getElementById('logs-content').innerHTML = '<div class="no-logs">No logs available</div>';
        this.showToast('Logs cleared', 'success');
    }

    exportLogs(agentId) {
        // Simulate log export
        this.showToast('Logs exported to downloads', 'success');
    }

    getAgentName(agentId) {
        const agentCard = document.querySelector(`[data-agent="${agentId}"]`);
        return agentCard?.querySelector('h3')?.textContent || 'Unknown Agent';
    }

    getAgentPrompt(agentId) {
        const prompts = {
            'senior-developer': 'You are an expert senior developer with deep knowledge of software architecture, best practices, and multiple programming languages. Help users write high-quality, maintainable code.',
            'architecture-agent': 'You are a software architecture expert who helps design scalable, maintainable systems. Focus on design patterns, system architecture, and technical decision-making.',
            'security-expert': 'You are a cybersecurity expert specializing in secure coding practices, vulnerability assessment, and security architecture. Always prioritize security in your recommendations.',
            'performance-expert': 'You are a performance optimization specialist. Analyze code for bottlenecks, suggest improvements, and help implement efficient algorithms and data structures.',
            'devops-expert': 'You are a DevOps expert skilled in CI/CD, containerization, infrastructure automation, and cloud platforms. Help optimize development and deployment workflows.',
            'qa-tester': 'You are a quality assurance expert who creates comprehensive test strategies, writes automated tests, and ensures software quality through systematic testing approaches.'
        };

        return prompts[agentId] || 'You are a helpful AI assistant specialized in software development tasks.';
    }

    updateAgentStatus(data) {
        const agentCard = document.querySelector(`[data-agent="${data.agentId}"]`);
        if (agentCard) {
            const statusElement = agentCard.querySelector('.agent-status');
            statusElement.className = `agent-status ${data.status}`;
        }
    }

    updateAgentStats(data) {
        const agentCard = document.querySelector(`[data-agent="${data.agentId}"]`);
        if (agentCard) {
            const stats = agentCard.querySelectorAll('.stat-value');
            if (stats.length >= 3) {
                stats[0].textContent = data.tasks || '0';
                stats[1].textContent = data.avgTime || '0s';
                stats[2].textContent = data.successRate || '100%';
            }
        }
    }

    showModal() {
        const modal = document.getElementById('agent-modal');
        modal.classList.add('show');
    }

    closeModal() {
        const modal = document.getElementById('agent-modal');
        modal.classList.remove('show');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS for form elements
const style = document.createElement('style');
style.textContent = `
    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #4a5568;
    }

    .form-input, .form-select, .form-textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s;
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-range {
        width: 100%;
        margin: 10px 0;
    }

    .range-labels {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #718096;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
        width: auto;
    }

    .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
    }

    .logs-container {
        max-height: 400px;
    }

    .logs-header {
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e2e8f0;
    }

    .logs-controls {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .logs-controls .form-select {
        width: auto;
        margin: 0;
    }

    .logs-content {
        max-height: 300px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 12px;
    }

    .log-entry {
        display: flex;
        gap: 12px;
        padding: 6px 8px;
        border-bottom: 1px solid #f7fafc;
    }

    .log-time {
        color: #a0aec0;
        min-width: 140px;
    }

    .log-level {
        min-width: 60px;
        font-weight: bold;
    }

    .log-level.INFO { color: #4299e1; }
    .log-level.WARNING { color: #ed8936; }
    .log-level.ERROR { color: #f56565; }

    .log-message {
        flex: 1;
        color: #4a5568;
    }

    .no-logs {
        text-align: center;
        color: #a0aec0;
        padding: 40px;
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.agentManager = new AgentManager();
});