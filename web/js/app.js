// Enhanced Main Application Class
class AIAgentApp {
    constructor() {
        this.socket = null;
        this.currentView = 'chat';
        this.currentConversation = null;
        this.memoryEnabled = true;
        this.isLoading = false;

        // Enhanced features
        this.collaborationMode = false;
        this.activeUsers = new Map();
        this.realtimeUpdates = true;
        this.notifications = [];
        this.workspaceState = new Map();
        this.autoSave = true;
        this.theme = localStorage.getItem('theme') || 'light';
        this.preferences = this.loadPreferences();
        this.performanceMetrics = {
            responseTime: [],
            errorCount: 0,
            successCount: 0
        };

        // Real-time collaboration features
        this.cursors = new Map();
        this.selections = new Map();
        this.liveEditing = false;
        this.conflictResolution = new ConflictResolver();

        this.init();
    }

    init() {
        this.applyTheme();
        this.setupSocket();
        this.setupEventListeners();
        this.setupViewSwitching();
        this.setupRealtimeFeatures();
        this.setupNotificationSystem();
        this.setupPerformanceMonitoring();
        this.loadInitialData();
        this.initializeWorkspace();

        // Initialize enhanced features
        this.setupKeyboardShortcuts();
        this.setupAutoSave();
        this.setupCollaborationFeatures();

        console.log('🚀 Enhanced AI Agent App initialized');
    }

    loadPreferences() {
        const defaultPreferences = {
            autoSave: true,
            notifications: true,
            soundEffects: false,
            compactMode: false,
            showLineNumbers: true,
            wordWrap: true,
            fontSize: 14,
            tabSize: 2,
            theme: 'light',
            language: 'en'
        };

        try {
            const saved = localStorage.getItem('aiagent_preferences');
            return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
        } catch (error) {
            console.warn('Failed to load preferences:', error);
            return defaultPreferences;
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('aiagent_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.warn('Failed to save preferences:', error);
        }
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.preferences.theme = this.theme;
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
        this.savePreferences();
        this.showNotification(`Switched to ${this.theme} theme`, 'info');
    }

    setupSocket() {
        this.socket = io({
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true
        });

        this.socket.on('connect', () => {
            console.log('🔌 Connected to server');
            this.updateConnectionStatus(true);
            this.showNotification('Connected to server', 'success');
            this.joinCollaborationRoom();
            this.syncWorkspaceState();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.updateConnectionStatus(false);
            this.showNotification('Disconnected from server', 'warning');
            this.handleDisconnection(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
            this.showNotification('Connection failed', 'error');
            this.performanceMetrics.errorCount++;
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Reconnected after', attemptNumber, 'attempts');
            this.showNotification('Reconnected successfully', 'success');
            this.syncWorkspaceState();
        });

        // Enhanced chat event listeners
        this.socket.on('chat-response', (data) => {
            this.handleChatResponse(data);
            this.trackPerformance('chat-response', data.responseTime);
        });

        this.socket.on('chat-error', (data) => {
            this.handleChatError(data);
            this.performanceMetrics.errorCount++;
        });

        this.socket.on('chat-stream-chunk', (data) => {
            this.handleStreamChunk(data);
        });

        // Tool chain event listeners
        this.socket.on('chain-started', (data) => {
            this.handleChainStarted(data);
            this.showNotification(`Tool chain "${data.name}" started`, 'info');
        });

        this.socket.on('chain-completed', (data) => {
            this.handleChainCompleted(data);
            this.showNotification(`Tool chain "${data.name}" completed`, 'success');
        });

        this.socket.on('chain-progress', (data) => {
            this.handleChainProgress(data);
        });

        // Real-time collaboration events
        this.socket.on('user-joined', (data) => {
            this.handleUserJoined(data);
        });

        this.socket.on('user-left', (data) => {
            this.handleUserLeft(data);
        });

        this.socket.on('cursor-update', (data) => {
            this.handleCursorUpdate(data);
        });

        this.socket.on('selection-update', (data) => {
            this.handleSelectionUpdate(data);
        });

        this.socket.on('workspace-update', (data) => {
            this.handleWorkspaceUpdate(data);
        });

        this.socket.on('live-edit', (data) => {
            this.handleLiveEdit(data);
        });

        // System events
        this.socket.on('system-notification', (data) => {
            this.showNotification(data.message, data.type || 'info');
        });

        this.socket.on('performance-metrics', (data) => {
            this.updatePerformanceDisplay(data);
        });

        // File system events
        this.socket.on('file-changed', (data) => {
            this.handleFileChanged(data);
        });

        this.socket.on('files-listed', (data) => {
            this.handleFilesListed(data);
        });

        this.socket.on('file-content', (data) => {
            this.handleFileContent(data);
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

    // Enhanced real-time collaboration methods
    setupRealtimeFeatures() {
        this.setupPresenceIndicators();
        this.setupLiveEditing();
        this.setupWorkspaceSync();
        console.log('🔄 Real-time features initialized');
    }

    setupPresenceIndicators() {
        // Create presence indicator container
        const presenceContainer = document.createElement('div');
        presenceContainer.id = 'presence-indicators';
        presenceContainer.className = 'presence-indicators';

        const header = document.querySelector('.app-header .header-content');
        if (header) {
            header.appendChild(presenceContainer);
        }
    }

    setupLiveEditing() {
        // Set up live editing for text areas and code editors
        const textAreas = document.querySelectorAll('textarea, input[type="text"]');
        textAreas.forEach(element => {
            element.addEventListener('input', (e) => {
                if (this.liveEditing && this.collaborationMode) {
                    this.broadcastEdit(e.target.id, e.target.value, e.target.selectionStart);
                }
            });

            element.addEventListener('selectionchange', (e) => {
                if (this.collaborationMode) {
                    this.broadcastSelection(e.target.id, e.target.selectionStart, e.target.selectionEnd);
                }
            });
        });
    }

    setupWorkspaceSync() {
        // Sync workspace state periodically
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.syncWorkspaceState();
            }
        }, 30000); // Every 30 seconds
    }

    setupNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    setupPerformanceMonitoring() {
        // Monitor performance metrics
        this.performanceInterval = setInterval(() => {
            this.updatePerformanceMetrics();
        }, 5000); // Every 5 seconds
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Enhanced shortcuts
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggleCollaborationMode();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                this.showPreferences();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveWorkspace();
                return;
            }

            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
                return;
            }
        });
    }

    setupAutoSave() {
        if (this.preferences.autoSave) {
            this.autoSaveInterval = setInterval(() => {
                this.autoSaveWorkspace();
            }, 60000); // Every minute
        }
    }

    setupCollaborationFeatures() {
        // Add collaboration toggle button
        const collaborationToggle = document.createElement('button');
        collaborationToggle.id = 'collaboration-toggle';
        collaborationToggle.className = 'icon-btn';
        collaborationToggle.title = 'Toggle Collaboration Mode';
        collaborationToggle.innerHTML = '👥';
        collaborationToggle.addEventListener('click', () => this.toggleCollaborationMode());

        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            headerControls.appendChild(collaborationToggle);
        }
    }

    // Real-time collaboration handlers
    joinCollaborationRoom() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join-collaboration', {
                userId: this.getUserId(),
                userName: this.getUserName(),
                workspace: this.getCurrentWorkspace()
            });
        }
    }

    toggleCollaborationMode() {
        this.collaborationMode = !this.collaborationMode;
        const toggle = document.getElementById('collaboration-toggle');
        if (toggle) {
            toggle.classList.toggle('active', this.collaborationMode);
            toggle.title = this.collaborationMode ? 'Exit Collaboration Mode' : 'Enter Collaboration Mode';
        }

        this.showNotification(
            `Collaboration mode ${this.collaborationMode ? 'enabled' : 'disabled'}`,
            'info'
        );

        if (this.collaborationMode) {
            this.joinCollaborationRoom();
        } else {
            this.leaveCollaborationRoom();
        }
    }

    leaveCollaborationRoom() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('leave-collaboration', {
                userId: this.getUserId()
            });
        }
    }

    handleUserJoined(data) {
        this.activeUsers.set(data.userId, data);
        this.updatePresenceIndicators();
        this.showNotification(`${data.userName} joined the session`, 'info');
    }

    handleUserLeft(data) {
        this.activeUsers.delete(data.userId);
        this.cursors.delete(data.userId);
        this.selections.delete(data.userId);
        this.updatePresenceIndicators();
        this.showNotification(`${data.userName} left the session`, 'info');
    }

    updatePresenceIndicators() {
        const container = document.getElementById('presence-indicators');
        if (!container) return;

        container.innerHTML = '';
        this.activeUsers.forEach((user, userId) => {
            const indicator = document.createElement('div');
            indicator.className = 'presence-indicator';
            indicator.title = user.userName;
            indicator.style.backgroundColor = this.getUserColor(userId);
            indicator.textContent = user.userName.charAt(0).toUpperCase();
            container.appendChild(indicator);
        });
    }

    getUserColor(userId) {
        // Generate consistent color for user
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const hash = userId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }

    // Enhanced notification system
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container') ||
                         document.getElementById('toast-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        container.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);

        // Add to notifications history
        this.notifications.unshift({
            message,
            type,
            timestamp: new Date(),
            id: Date.now()
        });

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // Performance monitoring
    trackPerformance(operation, responseTime) {
        this.performanceMetrics.responseTime.push({
            operation,
            time: responseTime,
            timestamp: Date.now()
        });

        // Keep only last 100 measurements
        if (this.performanceMetrics.responseTime.length > 100) {
            this.performanceMetrics.responseTime = this.performanceMetrics.responseTime.slice(-100);
        }

        this.performanceMetrics.successCount++;
    }

    updatePerformanceMetrics() {
        const avgResponseTime = this.performanceMetrics.responseTime.length > 0
            ? this.performanceMetrics.responseTime.reduce((sum, metric) => sum + metric.time, 0) / this.performanceMetrics.responseTime.length
            : 0;

        const successRate = this.performanceMetrics.successCount + this.performanceMetrics.errorCount > 0
            ? (this.performanceMetrics.successCount / (this.performanceMetrics.successCount + this.performanceMetrics.errorCount)) * 100
            : 100;

        // Update performance display if exists
        const perfDisplay = document.getElementById('performance-display');
        if (perfDisplay) {
            perfDisplay.innerHTML = `
                <div class="perf-metric">
                    <span class="perf-label">Avg Response:</span>
                    <span class="perf-value">${avgResponseTime.toFixed(0)}ms</span>
                </div>
                <div class="perf-metric">
                    <span class="perf-label">Success Rate:</span>
                    <span class="perf-value">${successRate.toFixed(1)}%</span>
                </div>
            `;
        }
    }

    // Workspace management
    initializeWorkspace() {
        this.workspaceState.set('currentProject', null);
        this.workspaceState.set('openFiles', []);
        this.workspaceState.set('recentFiles', []);
        this.workspaceState.set('bookmarks', []);
        this.loadWorkspaceFromStorage();
    }

    loadWorkspaceFromStorage() {
        try {
            const saved = localStorage.getItem('aiagent_workspace');
            if (saved) {
                const workspace = JSON.parse(saved);
                Object.entries(workspace).forEach(([key, value]) => {
                    this.workspaceState.set(key, value);
                });
            }
        } catch (error) {
            console.warn('Failed to load workspace:', error);
        }
    }

    saveWorkspace() {
        try {
            const workspace = Object.fromEntries(this.workspaceState);
            localStorage.setItem('aiagent_workspace', JSON.stringify(workspace));
            this.showNotification('Workspace saved', 'success', 2000);
        } catch (error) {
            console.error('Failed to save workspace:', error);
            this.showNotification('Failed to save workspace', 'error');
        }
    }

    autoSaveWorkspace() {
        if (this.preferences.autoSave) {
            this.saveWorkspace();
        }
    }

    syncWorkspaceState() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('sync-workspace', {
                userId: this.getUserId(),
                state: Object.fromEntries(this.workspaceState)
            });
        }
    }

    handleWorkspaceUpdate(data) {
        if (data.userId !== this.getUserId()) {
            // Update from another user
            Object.entries(data.state).forEach(([key, value]) => {
                this.workspaceState.set(key, value);
            });
            this.showNotification(`Workspace updated by ${data.userName}`, 'info', 3000);
        }
    }

    // Utility methods
    getUserId() {
        let userId = localStorage.getItem('aiagent_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('aiagent_user_id', userId);
        }
        return userId;
    }

    getUserName() {
        return localStorage.getItem('aiagent_user_name') || 'Anonymous User';
    }

    getCurrentWorkspace() {
        return this.workspaceState.get('currentProject') || 'default';
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.showNotification('Entered fullscreen mode', 'info', 2000);
        } else {
            document.exitFullscreen();
            this.showNotification('Exited fullscreen mode', 'info', 2000);
        }
    }

    showPreferences() {
        const modal = document.getElementById('modal-content');
        if (!modal) return;

        modal.innerHTML = `
            <div class="preferences-modal">
                <h2>Preferences</h2>
                <div class="preference-group">
                    <h3>General</h3>
                    <label class="preference-item">
                        <input type="checkbox" ${this.preferences.autoSave ? 'checked' : ''}
                               onchange="app.updatePreference('autoSave', this.checked)">
                        Auto-save workspace
                    </label>
                    <label class="preference-item">
                        <input type="checkbox" ${this.preferences.notifications ? 'checked' : ''}
                               onchange="app.updatePreference('notifications', this.checked)">
                        Show notifications
                    </label>
                    <label class="preference-item">
                        <input type="checkbox" ${this.preferences.soundEffects ? 'checked' : ''}
                               onchange="app.updatePreference('soundEffects', this.checked)">
                        Sound effects
                    </label>
                </div>
                <div class="preference-group">
                    <h3>Editor</h3>
                    <label class="preference-item">
                        <span>Font size:</span>
                        <input type="range" min="10" max="24" value="${this.preferences.fontSize}"
                               onchange="app.updatePreference('fontSize', parseInt(this.value))">
                        <span>${this.preferences.fontSize}px</span>
                    </label>
                    <label class="preference-item">
                        <input type="checkbox" ${this.preferences.showLineNumbers ? 'checked' : ''}
                               onchange="app.updatePreference('showLineNumbers', this.checked)">
                        Show line numbers
                    </label>
                    <label class="preference-item">
                        <input type="checkbox" ${this.preferences.wordWrap ? 'checked' : ''}
                               onchange="app.updatePreference('wordWrap', this.checked)">
                        Word wrap
                    </label>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="app.hideModal()">Close</button>
                    <button class="btn-primary" onclick="app.resetPreferences()">Reset to Defaults</button>
                </div>
            </div>
        `;

        this.showModal();
    }

    updatePreference(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
        this.applyPreferences();
    }

    applyPreferences() {
        // Apply preferences to the UI
        if (this.preferences.fontSize) {
            document.documentElement.style.setProperty('--editor-font-size', this.preferences.fontSize + 'px');
        }

        // Update auto-save
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.preferences.autoSave) {
            this.setupAutoSave();
        }
    }

    resetPreferences() {
        this.preferences = this.loadPreferences();
        localStorage.removeItem('aiagent_preferences');
        this.applyPreferences();
        this.showPreferences(); // Refresh the modal
        this.showNotification('Preferences reset to defaults', 'success');
    }

    handleDisconnection(reason) {
        // Handle different disconnection reasons
        if (reason === 'io server disconnect') {
            this.showNotification('Server disconnected. Attempting to reconnect...', 'warning');
        } else if (reason === 'transport close') {
            this.showNotification('Connection lost. Checking network...', 'warning');
        }

        // Clear real-time features
        this.activeUsers.clear();
        this.cursors.clear();
        this.selections.clear();
        this.updatePresenceIndicators();
    }

    // Enhanced live editing methods
    broadcastEdit(elementId, content, cursorPosition) {
        if (this.socket && this.socket.connected && this.collaborationMode) {
            this.socket.emit('live-edit', {
                userId: this.getUserId(),
                elementId,
                content,
                cursorPosition,
                timestamp: Date.now()
            });
        }
    }

    broadcastSelection(elementId, start, end) {
        if (this.socket && this.socket.connected && this.collaborationMode) {
            this.socket.emit('selection-update', {
                userId: this.getUserId(),
                elementId,
                start,
                end,
                timestamp: Date.now()
            });
        }
    }

    handleLiveEdit(data) {
        if (data.userId === this.getUserId()) return; // Ignore own edits

        const element = document.getElementById(data.elementId);
        if (element && element.value !== data.content) {
            const currentCursor = element.selectionStart;
            element.value = data.content;

            // Try to maintain cursor position
            if (currentCursor <= data.content.length) {
                element.setSelectionRange(currentCursor, currentCursor);
            }

            // Show visual indicator of remote edit
            this.showRemoteEditIndicator(element, data.userId);
        }
    }

    handleCursorUpdate(data) {
        if (data.userId === this.getUserId()) return;

        this.cursors.set(data.userId, data);
        this.updateCursorDisplay(data);
    }

    handleSelectionUpdate(data) {
        if (data.userId === this.getUserId()) return;

        this.selections.set(data.userId, data);
        this.updateSelectionDisplay(data);
    }

    showRemoteEditIndicator(element, userId) {
        const indicator = document.createElement('div');
        indicator.className = 'remote-edit-indicator';
        indicator.style.backgroundColor = this.getUserColor(userId);
        indicator.textContent = this.activeUsers.get(userId)?.userName?.charAt(0) || '?';

        element.parentElement.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentElement) {
                indicator.remove();
            }
        }, 2000);
    }

    updateCursorDisplay(data) {
        // Implementation for showing remote cursors
        const element = document.getElementById(data.elementId);
        if (!element) return;

        // Remove existing cursor for this user
        const existingCursor = document.querySelector(`[data-user-cursor="${data.userId}"]`);
        if (existingCursor) {
            existingCursor.remove();
        }

        // Create new cursor indicator
        const cursor = document.createElement('div');
        cursor.className = 'remote-cursor';
        cursor.setAttribute('data-user-cursor', data.userId);
        cursor.style.backgroundColor = this.getUserColor(data.userId);

        // Position cursor (simplified - would need more complex positioning for text areas)
        const rect = element.getBoundingClientRect();
        cursor.style.left = rect.left + 'px';
        cursor.style.top = rect.top + 'px';

        document.body.appendChild(cursor);
    }

    updateSelectionDisplay(data) {
        // Implementation for showing remote selections
        const element = document.getElementById(data.elementId);
        if (!element) return;

        // This would require more complex implementation for proper text selection highlighting
        console.log('Remote selection update:', data);
    }

    // Enhanced stream handling
    handleStreamChunk(data) {
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            const contentElement = messageElement.querySelector('.message-content');
            if (contentElement) {
                contentElement.textContent += data.chunk;

                // Auto-scroll to bottom
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        }
    }

    handleChainProgress(data) {
        const progressElement = document.querySelector(`[data-chain-id="${data.chainId}"] .progress-bar`);
        if (progressElement) {
            const percentage = (data.completed / data.total) * 100;
            progressElement.style.width = percentage + '%';

            const statusElement = progressElement.parentElement.querySelector('.progress-status');
            if (statusElement) {
                statusElement.textContent = `${data.step} (${data.completed}/${data.total})`;
            }
        }
    }

    handleFileChanged(data) {
        // Handle file system changes
        this.showNotification(`File ${data.action}: ${data.path}`, 'info', 3000);

        // Update file explorer if visible
        if (this.currentView === 'files') {
            this.loadFiles();
        }

        // Update workspace state
        const openFiles = this.workspaceState.get('openFiles') || [];
        if (data.action === 'deleted' && openFiles.includes(data.path)) {
            const updatedFiles = openFiles.filter(file => file !== data.path);
            this.workspaceState.set('openFiles', updatedFiles);
        }
    }

    updatePerformanceDisplay(data) {
        // Update performance metrics from server
        Object.assign(this.performanceMetrics, data);
        this.updatePerformanceMetrics();
    }
}

// Supporting classes for enhanced web interface
class ConflictResolver {
    constructor() {
        this.conflicts = new Map();
        this.resolutionStrategies = new Map();
        this.initializeStrategies();
    }

    initializeStrategies() {
        this.resolutionStrategies.set('last-write-wins', this.lastWriteWins.bind(this));
        this.resolutionStrategies.set('merge', this.mergeChanges.bind(this));
        this.resolutionStrategies.set('user-choice', this.promptUserChoice.bind(this));
    }

    detectConflict(localChange, remoteChange) {
        // Simple conflict detection
        return localChange.elementId === remoteChange.elementId &&
               Math.abs(localChange.timestamp - remoteChange.timestamp) < 1000; // Within 1 second
    }

    resolveConflict(localChange, remoteChange, strategy = 'last-write-wins') {
        const resolver = this.resolutionStrategies.get(strategy);
        if (resolver) {
            return resolver(localChange, remoteChange);
        }
        return this.lastWriteWins(localChange, remoteChange);
    }

    lastWriteWins(localChange, remoteChange) {
        return localChange.timestamp > remoteChange.timestamp ? localChange : remoteChange;
    }

    mergeChanges(localChange, remoteChange) {
        // Simple merge strategy - in practice, this would be more sophisticated
        return {
            ...localChange,
            content: localChange.content + '\n' + remoteChange.content,
            merged: true
        };
    }

    promptUserChoice(localChange, remoteChange) {
        // Show modal for user to choose resolution
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'conflict-resolution-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Conflict Resolution</h3>
                    <p>There's a conflict in ${localChange.elementId}. Choose how to resolve:</p>
                    <div class="conflict-options">
                        <button onclick="resolve(localChange)">Keep My Changes</button>
                        <button onclick="resolve(remoteChange)">Keep Remote Changes</button>
                        <button onclick="resolve(merge(localChange, remoteChange))">Merge Both</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        });
    }
}

// Initialize the enhanced app
const app = new AIAgentApp();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AIAgentApp();
});
