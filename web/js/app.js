// Main Application Class
class AIAgentApp {
    constructor() {
        this.socket = null;
        this.currentView = 'chat';
        this.currentConversation = null;
        this.memoryEnabled = true;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.setupViewSwitching();
        this.loadInitialData();
    }

    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
        });

        // Chat event listeners
        this.socket.on('chat-response', (data) => {
            this.handleChatResponse(data);
        });

        this.socket.on('chat-error', (data) => {
            this.handleChatError(data);
        });

        // Tool chain event listeners
        this.socket.on('chain-started', (data) => {
            this.handleChainStarted(data);
        });

        this.socket.on('chain-completed', (data) => {
            this.handleChainCompleted(data);
        });

        this.socket.on('chain-error', (data) => {
            this.handleChainError(data);
        });

        // File operation listeners
        this.socket.on('files-listed', (data) => {
            this.handleFilesListed(data);
        });

        this.socket.on('file-content', (data) => {
            this.handleFileContent(data);
        });

        this.socket.on('files-error', (data) => {
            this.handleFilesError(data);
        });

        this.socket.on('file-error', (data) => {
            this.handleFileError(data);
        });
    }

    setupEventListeners() {
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            this.showHelp();
        });

        // New conversation button
        document.getElementById('new-conversation').addEventListener('click', () => {
            this.createNewConversation();
        });

        // Memory toggle
        const memoryToggle = document.getElementById('memory-enabled');
        memoryToggle.addEventListener('change', (e) => {
            this.memoryEnabled = e.target.checked;
        });

        // Tool cards
        document.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const tool = card.getAttribute('data-tool');
                this.showToolModal(tool);
            });
        });

        // Modal overlay click to close
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
            
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('chat-input').focus();
            }
        });
    }

    setupViewSwitching() {
        const navItems = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.view');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const viewName = item.getAttribute('data-view');
                this.switchView(viewName);
            });
        });
    }

    switchView(viewName) {
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        this.currentView = viewName;

        // Load view-specific data
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'chains':
                await this.loadToolChains();
                break;
            case 'jobs':
                if (this.jobsPanel) {
                    await this.jobsPanel.loadJobs();
                }
                break;
            case 'memory':
                if (this.memoryManager) {
                    await this.memoryManager.loadMemoryData();
                } else {
                    // Fallback to built-in method if memory manager not ready
                    await this.loadMemoryData();
                }
                break;
            case 'files':
                this.loadFileTree();
                break;
        }
    }

    async loadInitialData() {
        try {
            // Load conversations
            await this.loadConversations();
            
            // Load system status
            await this.loadSystemStatus();
            await this.checkPlatformInit();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async checkPlatformInit() {
        try {
            const res = await fetch('/api/platform');
            const data = await res.json();
            if (!data.initialized) {
                this.showStartup();
            }
        } catch (e) {
            console.warn('Platform status unavailable:', e);
        }
    }

    showStartup() {
        const modal = `
            <div class="startup-modal">
                <div class="modal-header">
                    <span class="modal-icon">🚦</span>
                    <h2>Start Platform</h2>
                </div>
                <p>The platform is not initialized yet. Click start to initialize services.</p>
                <div class="modal-actions">
                    <button class="btn-primary" id="btn-start-platform">Start</button>
                    <button class="btn-secondary" onclick="app.hideModal()">Close</button>
                </div>
            </div>`;
        this.showModal(modal);
        const btn = document.getElementById('btn-start-platform');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Starting...';
                try {
                    const res = await fetch('/api/platform/init', { method: 'POST' });
                    const data = await res.json();
                    if (data.success || data.result?.success) {
                        this.hideModal();
                    } else {
                        alert('Failed to start platform: ' + (data.error || data.result?.error || 'unknown'));
                        btn.disabled = false;
                        btn.textContent = 'Start';
                    }
                } catch (e) {
                    alert('Failed to start platform: ' + e.message);
                    btn.disabled = false;
                    btn.textContent = 'Start';
                }
            });
        }
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/conversations');
            const conversations = await response.json();
            
            this.renderConversations(conversations);
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversations');
        
        if (conversations.length === 0) {
            container.innerHTML = '<p class="text-muted">No conversations yet</p>';
            return;
        }

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" data-id="${conv.id}">
                <div class="conversation-name">${conv.name}</div>
                <div class="conversation-time">${new Date(conv.updated_at).toLocaleDateString()}</div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectConversation(item.getAttribute('data-id'));
            });
        });
    }

    async selectConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const conversation = await response.json();
            
            this.currentConversation = conversation;
            
            // Update UI
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-id') === conversationId);
            });
            
            // Load messages
            this.renderMessages(conversation.messages || []);
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to AI Coding Agent! 🤖</h2>
                    <p>I can help you with:</p>
                    <ul>
                        <li>Code analysis and explanation</li>
                        <li>Code generation and modification</li>
                        <li>Web scraping and analysis</li>
                        <li>Complex multi-step workflows</li>
                        <li>Project management and documentation</li>
                    </ul>
                    <p>Start by typing a message or use the tools in the sidebar!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-content">
                    ${this.formatMessageContent(msg.content)}
                </div>
                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    formatMessageContent(content) {
        // Simple markdown-like formatting
        return content
            .replace(/```([\s\S]*?)```/g, '<div class="code-block">$1</div>')
            .replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>')
            .replace(/\n/g, '<br>');
    }

    async createNewConversation() {
        try {
            const name = prompt('Enter conversation name:');
            if (!name) return;

            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            const result = await response.json();
            
            // Reload conversations
            await this.loadConversations();
            
            // Select the new conversation
            this.selectConversation(result.id);
        } catch (error) {
            console.error('Error creating conversation:', error);
            this.showError('Failed to create conversation');
        }
    }

    async loadToolChains() {
        try {
            const response = await fetch('/api/chains');
            const chains = await response.json();
            
            this.renderToolChains(chains);
        } catch (error) {
            console.error('Error loading tool chains:', error);
        }
    }

    renderToolChains(chains) {
        const container = document.getElementById('chains-list');
        
        if (chains.length === 0) {
            container.innerHTML = '<p class="text-muted">No tool chains created yet</p>';
            return;
        }

        container.innerHTML = chains.map(chain => `
            <div class="tool-card">
                <div class="tool-icon">🔗</div>
                <h3>${chain.name}</h3>
                <p>${chain.description || 'No description'}</p>
                <p class="chain-info">${chain.stepCount} steps • ${chain.status}</p>
                <div class="chain-actions">
                    <button class="tool-btn" onclick="app.executeChain('${chain.id}')">Execute</button>
                    <button class="btn-secondary" onclick="app.editChain('${chain.id}')">Edit</button>
                </div>
            </div>
        `).join('');
    }

    async loadMemoryData() {
        try {
            // Load knowledge base
            const knowledgeResponse = await fetch('/api/knowledge');
            const knowledge = await knowledgeResponse.json();
            
            this.renderKnowledgeBase(knowledge);
        } catch (error) {
            console.error('Error loading memory data:', error);
        }
    }

    renderKnowledgeBase(items) {
        const container = document.getElementById('knowledge-results');
        
        if (items.length === 0) {
            container.innerHTML = '<p class="text-muted">No knowledge items found</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="knowledge-item">
                <h4>${item.title}</h4>
                <p>${item.content.substring(0, 200)}...</p>
                <div class="knowledge-meta">
                    <span>Type: ${item.type}</span>
                    <span>Source: ${item.source || 'Unknown'}</span>
                    <span>Date: ${new Date(item.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    loadFileTree() {
        this.socket.emit('list-files', { path: '.' });
    }

    handleFilesListed(data) {
        const container = document.getElementById('file-tree');
        
        container.innerHTML = data.files.map(file => `
            <div class="file-item" data-path="${file}">
                <span class="file-icon">${file.endsWith('/') ? '📁' : '📄'}</span>
                <span class="file-name">${file}</span>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.getAttribute('data-path');
                if (!path.endsWith('/')) {
                    this.loadFileContent(path);
                }
            });
        });
    }

    loadFileContent(path) {
        this.socket.emit('read-file', { path });
    }

    handleFileContent(data) {
        const viewer = document.getElementById('file-viewer');
        viewer.innerHTML = `
            <div class="file-header">
                <h4>${data.path}</h4>
            </div>
            <div class="code-block">${this.escapeHtml(data.content)}</div>
        `;
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        statusDot.className = `status-dot ${connected ? 'online' : 'offline'}`;
        statusText.textContent = connected ? 'Connected' : 'Disconnected';
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            console.log('System status:', status);
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    showLoading(show = true) {
        const indicator = document.getElementById('loading-indicator');
        indicator.classList.toggle('active', show);
        this.isLoading = show;
    }

    showModal(content) {
        const overlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        
        modalContent.innerHTML = content;
        overlay.classList.add('active');
    }

    hideModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
    }

    showSettings() {
        const settingsHTML = `
            <h2>Settings</h2>
            <div class="settings-form">
                <div class="form-group">
                    <label>Theme</label>
                    <select id="theme-select">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>AI Provider</label>
                    <select id="provider-select">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="local">Local Model</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button class="btn-primary" onclick="app.saveSettings()">Save</button>
                    <button class="btn-secondary" onclick="app.hideModal()">Cancel</button>
                </div>
            </div>
        `;
        
        this.showModal(settingsHTML);
    }

    showHelp() {
        const helpHTML = `
            <h2>Help & Commands</h2>
            <div class="help-content">
                <h3>Chat Commands</h3>
                <ul>
                    <li><code>analyze &lt;file&gt;</code> - Analyze code file</li>
                    <li><code>modify &lt;file&gt; to &lt;instructions&gt;</code> - Modify code</li>
                    <li><code>create &lt;file&gt; with &lt;requirements&gt;</code> - Create new file</li>
                    <li><code>search &lt;query&gt;</code> - Search codebase</li>
                    <li><code>explain &lt;file&gt;</code> - Explain code</li>
                    <li><code>scrape &lt;url&gt;</code> - Scrape website</li>
                </ul>
                
                <h3>Keyboard Shortcuts</h3>
                <ul>
                    <li><kbd>Ctrl+K</kbd> / <kbd>Cmd+K</kbd> - Focus chat input</li>
                    <li><kbd>Escape</kbd> - Close modals</li>
                    <li><kbd>Shift+Enter</kbd> - New line in chat</li>
                </ul>
                
                <h3>Features</h3>
                <ul>
                    <li><strong>Memory:</strong> Conversations are saved automatically</li>
                    <li><strong>Tool Chains:</strong> Create multi-step workflows</li>
                    <li><strong>Web Scraping:</strong> Extract data from websites</li>
                    <li><strong>File Management:</strong> Browse and edit project files</li>
                </ul>
            </div>
            <div class="help-actions">
                <button class="btn-primary" onclick="app.hideModal()">Close</button>
            </div>
        `;
        
        this.showModal(helpHTML);
        const themeSel = document.getElementById('theme-select');
        themeSel.value = localStorage.getItem('theme') || 'light';
        themeSel.addEventListener('change', async (e) => {
            const theme = e.target.value;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            try {
                await fetch('/api/preferences', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'theme', value: theme })
                });
            } catch {}
        });
    }

    showToolModal(tool) {
        // Implementation for tool-specific modals
        console.log('Show tool modal for:', tool);
        // This will be implemented in tools.js
    }

    showError(message) {
        console.error(message);
        this.showToast('error', message);
    }

    showToast(type, message, timeout = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) { alert(message); return; }
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span class="toast-close" onclick="this.parentElement.remove()">×</span>${this.escapeHtml(message)}`;
        container.appendChild(el);
        setTimeout(() => el.remove(), timeout);
    }

    handleChatResponse(data) {
        // Implementation in chat.js
    }

    handleChatError(data) {
        console.error('Chat error:', data);
        this.showError(data.error);
        this.showLoading(false);
    }

    handleChainStarted(data) {
        console.log('Chain started:', data);
        this.showLoading(true);
    }

    handleChainCompleted(data) {
        console.log('Chain completed:', data);
        this.showLoading(false);
        this.loadToolChains(); // Refresh chains list
    }

    handleChainError(data) {
        console.error('Chain error:', data);
        this.showError(data.error);
        this.showLoading(false);
    }

    handleFilesError(data) {
        console.error('Files error:', data);
        this.showError(data.error);
    }

    handleFileError(data) {
        console.error('File error:', data);
        this.showError(data.error);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIAgentApp();
});
