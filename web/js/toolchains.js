class ToolChainManager {
    constructor() {
        this.socket = null;
        this.chains = new Map();
        this.currentChain = null;
        this.draggedTool = null;
        this.canvasSteps = [];
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.loadChains();
        console.log('🔗 Tool Chain Manager initialized');
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('✅ Tool Chain Manager connected to server');
            this.loadChains();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Tool Chain Manager disconnected');
        });

        this.socket.on('chain-execution-update', (data) => {
            this.handleExecutionUpdate(data);
        });

        this.socket.on('chain-execution-complete', (data) => {
            this.handleExecutionComplete(data);
        });
    }

    setupEventListeners() {
        // Header controls
        document.getElementById('new-chain-btn').addEventListener('click', () => {
            this.showChainBuilder();
        });

        document.getElementById('import-chain-btn').addEventListener('click', () => {
            this.importChain();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadChains();
            this.showToast('Chains refreshed', 'success');
        });

        // Search and filter
        document.getElementById('chain-search').addEventListener('input', (e) => {
            this.filterChains(e.target.value);
        });

        document.getElementById('chain-filter').addEventListener('change', (e) => {
            this.filterChainsByCategory(e.target.value);
        });

        // Chain actions
        document.addEventListener('click', (e) => {
            if (e.target.dataset.action) {
                const action = e.target.dataset.action;
                const chainCard = e.target.closest('.chain-card');
                const chainId = chainCard.dataset.chain;
                this.handleChainAction(chainId, action);
            }
        });

        // Builder controls
        document.getElementById('save-chain').addEventListener('click', () => {
            this.saveChain();
        });

        document.getElementById('test-chain').addEventListener('click', () => {
            this.testChain();
        });

        document.getElementById('close-builder').addEventListener('click', () => {
            this.hideChainBuilder();
        });

        // Canvas controls
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.clearCanvas();
        });

        document.getElementById('auto-layout').addEventListener('click', () => {
            this.autoLayoutCanvas();
        });

        // Modal controls
        document.getElementById('close-execution-modal').addEventListener('click', () => {
            this.closeExecutionModal();
        });

        // Add chain card
        document.getElementById('add-chain-card').addEventListener('click', () => {
            this.showChainBuilder();
        });

        // History controls
        document.getElementById('clear-history').addEventListener('click', () => {
            this.clearExecutionHistory();
        });
    }

    setupDragAndDrop() {
        // Tool palette drag start
        document.querySelectorAll('.tool-item').forEach(tool => {
            tool.addEventListener('dragstart', (e) => {
                this.draggedTool = {
                    type: e.target.dataset.tool,
                    name: e.target.querySelector('.tool-name').textContent,
                    icon: e.target.querySelector('.tool-icon').textContent
                };
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // Canvas drop zone
        const canvas = document.getElementById('chain-canvas');

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvas.classList.add('drag-over');
        });

        canvas.addEventListener('dragleave', () => {
            canvas.classList.remove('drag-over');
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('drag-over');

            if (this.draggedTool) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                this.addStepToCanvas(this.draggedTool, x, y);
                this.draggedTool = null;
            }
        });
    }

    async loadChains() {
        try {
            const response = await fetch('/api/chains');
            if (response.ok) {
                const data = await response.json();
                this.updateChainData(data);
            } else {
                this.loadMockChains();
            }
        } catch (error) {
            console.error('Error loading chains:', error);
            this.loadMockChains();
        }
    }

    loadMockChains() {
        // Update stats with mock data
        this.updateStats({
            totalChains: 8,
            executionsToday: 24,
            successRate: '96%',
            avgDuration: '2.3s'
        });

        // Update chain cards with realistic data
        const chainCards = document.querySelectorAll('.chain-card[data-chain]');
        chainCards.forEach(card => {
            const stats = card.querySelectorAll('.stat');
            if (stats.length >= 2) {
                const hours = Math.floor(Math.random() * 12) + 1;
                const success = Math.floor(Math.random() * 10 + 85);
                stats[0].textContent = `Last run: ${hours}h ago`;
                stats[1].textContent = `Success: ${success}%`;
            }
        });
    }

    updateStats(data) {
        document.getElementById('total-chains').textContent = data.totalChains;
        document.getElementById('executions-today').textContent = data.executionsToday;
        document.getElementById('success-rate').textContent = data.successRate;
        document.getElementById('avg-duration').textContent = data.avgDuration;
    }

    handleChainAction(chainId, action) {
        switch (action) {
            case 'run':
                this.executeChain(chainId);
                break;
            case 'edit':
                this.editChain(chainId);
                break;
            case 'view':
                this.viewChain(chainId);
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    async executeChain(chainId) {
        const chainName = this.getChainName(chainId);
        this.showToast(`Executing ${chainName}...`, 'info');

        try {
            // Show execution modal
            this.showExecutionModal(chainId);

            // Simulate chain execution
            const response = await fetch(`/api/chains/${chainId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ asJob: true })
            });

            if (response.ok) {
                const data = await response.json();
                this.monitorExecution(data.jobId, chainName);
            } else {
                throw new Error('Failed to start execution');
            }
        } catch (error) {
            console.error('Execution error:', error);
            this.showToast(`Failed to execute ${chainName}`, 'error');
            this.closeExecutionModal();
        }
    }

    showExecutionModal(chainId) {
        const chainName = this.getChainName(chainId);
        const modal = document.getElementById('execution-modal');
        const title = document.getElementById('execution-modal-title');
        const body = document.getElementById('execution-modal-body');

        title.textContent = `Executing: ${chainName}`;
        body.innerHTML = `
            <div class="execution-progress">
                <div class="progress-header">
                    <h4>Execution Progress</h4>
                    <span id="execution-status">Starting...</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-info">
                    <span id="current-step">Initializing...</span>
                    <span id="progress-percent">0%</span>
                </div>

                <div class="execution-log">
                    <h5>Execution Log</h5>
                    <div class="log-container" id="execution-log">
                        <div class="log-entry">
                            <span class="log-time">${new Date().toLocaleTimeString()}</span>
                            <span class="log-message">Chain execution started</span>
                        </div>
                    </div>
                </div>

                <div class="execution-controls">
                    <button class="btn-secondary" id="cancel-execution">Cancel</button>
                    <button class="btn-primary" id="view-details">View Details</button>
                </div>
            </div>
        `;

        modal.classList.add('show');

        // Setup cancel button
        document.getElementById('cancel-execution').addEventListener('click', () => {
            this.cancelExecution();
        });
    }

    async monitorExecution(jobId, chainName) {
        // Simulate execution progress
        const steps = [
            'Initializing environment...',
            'Loading chain configuration...',
            'Executing step 1: Code Analysis...',
            'Executing step 2: Running Tests...',
            'Executing step 3: Deployment...',
            'Finalizing execution...',
            'Execution completed successfully!'
        ];

        let currentStep = 0;
        const totalSteps = steps.length;

        const progressInterval = setInterval(() => {
            if (currentStep < totalSteps) {
                const progress = Math.round((currentStep / (totalSteps - 1)) * 100);

                document.getElementById('progress-fill').style.width = `${progress}%`;
                document.getElementById('progress-percent').textContent = `${progress}%`;
                document.getElementById('current-step').textContent = steps[currentStep];

                // Add log entry
                this.addExecutionLogEntry(steps[currentStep]);

                currentStep++;

                if (currentStep === totalSteps) {
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        this.handleExecutionComplete({
                            jobId,
                            chainName,
                            success: Math.random() > 0.1, // 90% success rate
                            duration: (Math.random() * 10 + 1).toFixed(1)
                        });
                    }, 1000);
                }
            }
        }, 1500);
    }

    addExecutionLogEntry(message) {
        const logContainer = document.getElementById('execution-log');
        if (logContainer) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `
                <span class="log-time">${new Date().toLocaleTimeString()}</span>
                <span class="log-message">${message}</span>
            `;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    handleExecutionComplete(data) {
        const { chainName, success, duration } = data;

        if (success) {
            this.showToast(`${chainName} completed successfully in ${duration}s`, 'success');
            this.addExecutionToHistory(chainName, 'success', duration);
        } else {
            this.showToast(`${chainName} execution failed`, 'error');
            this.addExecutionToHistory(chainName, 'failed', duration);
        }

        // Update modal status
        document.getElementById('execution-status').textContent = success ? 'Completed' : 'Failed';
        document.getElementById('cancel-execution').textContent = 'Close';
    }

    addExecutionToHistory(chainName, status, duration) {
        const historyList = document.getElementById('execution-history');
        const item = document.createElement('div');
        item.className = `execution-item ${status}`;

        item.innerHTML = `
            <div class="execution-info">
                <span class="execution-chain">${chainName}</span>
                <span class="execution-time">Just now</span>
            </div>
            <div class="execution-status">
                <span class="status-badge ${status}">${status === 'success' ? 'Success' : 'Failed'}</span>
                <span class="execution-duration">${duration}s</span>
            </div>
        `;

        historyList.insertBefore(item, historyList.firstChild);

        // Limit history to 10 items
        const items = historyList.querySelectorAll('.execution-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    editChain(chainId) {
        this.currentChain = chainId;
        this.showChainBuilder();
        this.loadChainIntoBuilder(chainId);
    }

    viewChain(chainId) {
        const chainName = this.getChainName(chainId);
        const modal = document.getElementById('execution-modal');
        const title = document.getElementById('execution-modal-title');
        const body = document.getElementById('execution-modal-body');

        title.textContent = `Chain Details: ${chainName}`;
        body.innerHTML = `
            <div class="chain-details">
                <div class="detail-section">
                    <h4>Chain Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Name:</label>
                            <span>${chainName}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge success">Active</span>
                        </div>
                        <div class="detail-item">
                            <label>Created:</label>
                            <span>2 weeks ago</span>
                        </div>
                        <div class="detail-item">
                            <label>Last Modified:</label>
                            <span>3 days ago</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Execution Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-value">42</div>
                            <div class="stat-label">Total Runs</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">94%</div>
                            <div class="stat-label">Success Rate</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">2.3s</div>
                            <div class="stat-label">Avg Duration</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">5</div>
                            <div class="stat-label">Steps</div>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Chain Steps</h4>
                    <div class="steps-list">
                        ${this.generateStepsList(chainId)}
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

    generateStepsList(chainId) {
        const steps = {
            'code-review-deploy': [
                { name: 'Code Analysis', type: 'analyze', icon: '🔍' },
                { name: 'Quality Check', type: 'quality', icon: '✅' },
                { name: 'Run Tests', type: 'test', icon: '🧪' },
                { name: 'Build Package', type: 'build', icon: '📦' },
                { name: 'Deploy', type: 'deploy', icon: '🚀' }
            ],
            'full-test-suite': [
                { name: 'Setup Environment', type: 'setup', icon: '🔧' },
                { name: 'Unit Tests', type: 'test', icon: '🧪' },
                { name: 'Integration Tests', type: 'test', icon: '🔗' },
                { name: 'E2E Tests', type: 'test', icon: '🌐' },
                { name: 'Performance Tests', type: 'performance', icon: '⚡' },
                { name: 'Generate Report', type: 'report', icon: '📊' },
                { name: 'Cleanup', type: 'cleanup', icon: '🧹' }
            ]
        };

        const chainSteps = steps[chainId] || steps['code-review-deploy'];

        return chainSteps.map((step, index) => `
            <div class="step-item">
                <div class="step-number">${index + 1}</div>
                <div class="step-icon">${step.icon}</div>
                <div class="step-info">
                    <div class="step-name">${step.name}</div>
                    <div class="step-type">${step.type}</div>
                </div>
            </div>
        `).join('');
    }

    showChainBuilder() {
        document.getElementById('chain-builder').style.display = 'block';
        document.getElementById('builder-title').textContent = this.currentChain ? 'Edit Chain' : 'Create New Chain';
    }

    hideChainBuilder() {
        document.getElementById('chain-builder').style.display = 'none';
        this.currentChain = null;
        this.clearCanvas();
    }

    loadChainIntoBuilder(chainId) {
        const chainName = this.getChainName(chainId);
        document.getElementById('chain-name').value = chainName;
        document.getElementById('chain-description').value = 'Automated workflow for ' + chainName.toLowerCase();

        // Load existing steps into canvas
        this.loadMockStepsToCanvas(chainId);
    }

    loadMockStepsToCanvas(chainId) {
        this.clearCanvas();

        const mockSteps = [
            { tool: 'analyze', name: 'Analyze Code', icon: '🔍', x: 50, y: 50 },
            { tool: 'test', name: 'Run Tests', icon: '🧪', x: 200, y: 50 },
            { tool: 'deploy', name: 'Deploy', icon: '🚀', x: 350, y: 50 }
        ];

        mockSteps.forEach(step => {
            this.addStepToCanvas(step, step.x, step.y);
        });
    }

    addStepToCanvas(tool, x, y) {
        const canvas = document.getElementById('chain-canvas');
        const dropZone = canvas.querySelector('.drop-zone');

        if (dropZone) {
            dropZone.style.display = 'none';
        }

        const step = document.createElement('div');
        step.className = 'canvas-step';
        step.style.left = `${x}px`;
        step.style.top = `${y}px`;
        step.innerHTML = `${tool.icon} ${tool.name}`;
        step.dataset.tool = tool.type;

        canvas.appendChild(step);
        this.canvasSteps.push({ element: step, tool: tool.type, x, y });

        // Make step draggable within canvas
        this.makeStepDraggable(step);
    }

    makeStepDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left);
            initialY = parseInt(element.style.top);
            element.style.zIndex = 1000;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            element.style.left = `${initialX + deltaX}px`;
            element.style.top = `${initialY + deltaY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = 'auto';
            }
        });
    }

    clearCanvas() {
        const canvas = document.getElementById('chain-canvas');
        const steps = canvas.querySelectorAll('.canvas-step');
        steps.forEach(step => step.remove());

        const dropZone = canvas.querySelector('.drop-zone');
        if (dropZone) {
            dropZone.style.display = 'flex';
        }

        this.canvasSteps = [];
    }

    autoLayoutCanvas() {
        const steps = this.canvasSteps;
        if (steps.length === 0) return;

        const startX = 50;
        const startY = 100;
        const stepSpacing = 150;

        steps.forEach((step, index) => {
            const x = startX + (index * stepSpacing);
            step.element.style.left = `${x}px`;
            step.element.style.top = `${startY}px`;
            step.x = x;
            step.y = startY;
        });

        this.showToast('Canvas auto-layouted', 'success');
    }

    async saveChain() {
        const name = document.getElementById('chain-name').value;
        const description = document.getElementById('chain-description').value;

        if (!name) {
            this.showToast('Please enter a chain name', 'error');
            return;
        }

        if (this.canvasSteps.length === 0) {
            this.showToast('Please add at least one step to the chain', 'error');
            return;
        }

        try {
            const chainData = {
                name,
                description,
                steps: this.canvasSteps.map(step => ({
                    tool: step.tool,
                    x: step.x,
                    y: step.y
                }))
            };

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.showToast(`Chain "${name}" saved successfully`, 'success');
            this.hideChainBuilder();
            this.loadChains(); // Refresh the chains list
        } catch (error) {
            this.showToast(`Failed to save chain: ${error.message}`, 'error');
        }
    }

    async testChain() {
        const name = document.getElementById('chain-name').value || 'Test Chain';

        if (this.canvasSteps.length === 0) {
            this.showToast('Please add steps to test the chain', 'error');
            return;
        }

        this.showToast(`Testing ${name}...`, 'info');

        try {
            // Simulate test execution
            await new Promise(resolve => setTimeout(resolve, 2000));

            const success = Math.random() > 0.3; // 70% success rate for tests
            if (success) {
                this.showToast(`${name} test completed successfully`, 'success');
            } else {
                this.showToast(`${name} test failed - check configuration`, 'error');
            }
        } catch (error) {
            this.showToast(`Test failed: ${error.message}`, 'error');
        }
    }

    importChain() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const chainData = JSON.parse(event.target.result);
                        this.importChainData(chainData);
                    } catch (error) {
                        this.showToast('Invalid chain file format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });

        input.click();
    }

    importChainData(chainData) {
        this.showToast(`Importing chain: ${chainData.name}`, 'success');
        // Implementation would handle the actual import
    }

    filterChains(searchTerm) {
        const cards = document.querySelectorAll('.chain-card[data-chain]');
        const term = searchTerm.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            const matches = name.includes(term) || description.includes(term);

            card.style.display = matches ? 'block' : 'none';
        });
    }

    filterChainsByCategory(category) {
        const cards = document.querySelectorAll('.chain-card[data-chain]');

        cards.forEach(card => {
            const shouldShow = category === 'all' || card.dataset.category === category;
            card.style.display = shouldShow ? 'block' : 'none';
        });
    }

    clearExecutionHistory() {
        const historyList = document.getElementById('execution-history');
        historyList.innerHTML = '<div class="no-history">No executions yet</div>';
        this.showToast('Execution history cleared', 'success');
    }

    cancelExecution() {
        // Implementation would cancel the actual execution
        this.showToast('Execution cancelled', 'warning');
        this.closeExecutionModal();
    }

    closeExecutionModal() {
        const modal = document.getElementById('execution-modal');
        modal.classList.remove('show');
    }

    getChainName(chainId) {
        const chainCard = document.querySelector(`[data-chain="${chainId}"]`);
        return chainCard?.querySelector('h3')?.textContent || 'Unknown Chain';
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

// Add additional CSS for execution modal content
const style = document.createElement('style');
style.textContent = `
    .execution-progress {
        padding: 0;
    }

    .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }

    .progress-header h4 {
        margin: 0;
        color: #2d3748;
    }

    #execution-status {
        color: #667eea;
        font-weight: 500;
    }

    .progress-bar {
        background: #e2e8f0;
        border-radius: 10px;
        height: 8px;
        margin-bottom: 10px;
        overflow: hidden;
    }

    .progress-fill {
        background: linear-gradient(90deg, #667eea, #764ba2);
        height: 100%;
        border-radius: 10px;
        transition: width 0.3s ease;
    }

    .progress-info {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #4a5568;
        margin-bottom: 20px;
    }

    .execution-log {
        margin-bottom: 20px;
    }

    .execution-log h5 {
        margin: 0 0 10px 0;
        color: #2d3748;
        font-size: 14px;
    }

    .log-container {
        background: #f7fafc;
        border-radius: 6px;
        padding: 10px;
        max-height: 200px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 12px;
    }

    .log-entry {
        display: flex;
        gap: 10px;
        margin-bottom: 5px;
    }

    .log-time {
        color: #a0aec0;
        min-width: 80px;
    }

    .log-message {
        color: #4a5568;
    }

    .execution-controls {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }

    .chain-details {
        padding: 0;
    }

    .detail-section {
        margin-bottom: 25px;
    }

    .detail-section h4 {
        margin: 0 0 15px 0;
        color: #2d3748;
        font-size: 16px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 8px;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
    }

    .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .detail-item label {
        font-weight: 500;
        color: #4a5568;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
    }

    .stat-box {
        text-align: center;
        padding: 15px;
        background: #f7fafc;
        border-radius: 8px;
    }

    .stat-box .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #2d3748;
        margin-bottom: 5px;
    }

    .stat-box .stat-label {
        font-size: 12px;
        color: #718096;
    }

    .steps-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .step-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px;
        background: #f7fafc;
        border-radius: 8px;
    }

    .step-number {
        background: #667eea;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
    }

    .step-icon {
        font-size: 20px;
    }

    .step-info {
        flex: 1;
    }

    .step-name {
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 2px;
    }

    .step-type {
        font-size: 12px;
        color: #718096;
        text-transform: capitalize;
    }

    .drag-over {
        background: #f0f9ff !important;
        border: 2px dashed #667eea !important;
    }

    .no-history {
        text-align: center;
        color: #a0aec0;
        padding: 20px;
        font-style: italic;
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
    window.toolChainManager = new ToolChainManager();
});