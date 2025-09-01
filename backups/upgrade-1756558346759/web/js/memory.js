// Memory management functionality
class MemoryManager {
    constructor(app) {
        this.app = app;
        this.currentTab = 'knowledge';
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Setup immediately if DOM is ready, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initialize();
            });
        } else {
            this.initialize();
        }

        // Load memory data when switching to memory view
        document.addEventListener('viewChanged', (e) => {
            if (e.detail.view === 'memory') {
                this.loadMemoryData();
            }
        });
    }

    initialize() {
        this.setupTabs();
        this.setupSearch();
        this.setupAddButtons();
        console.log('Memory manager initialized');
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log(`Found ${tabButtons.length} tab buttons`);
        
        tabButtons.forEach((btn, index) => {
            const tabName = btn.getAttribute('data-tab');
            console.log(`Setting up tab button ${index}: ${tabName}`);
            
            // Remove any existing listeners
            btn.replaceWith(btn.cloneNode(true));
            const newBtn = document.querySelectorAll('.tab-btn')[index];
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`Tab clicked: ${tabName}`);
                this.switchTab(tabName);
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('knowledge-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchKnowledge(e.target.value);
                }, 300);
            });
        }
    }

    setupAddButtons() {
        const addBtn = document.getElementById('add-knowledge');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddKnowledgeModal();
            });
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-tab`);
        });

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    async loadMemoryData() {
        await this.loadTabData(this.currentTab);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'knowledge':
                await this.loadKnowledgeBase();
                break;
            case 'conversations':
                await this.loadConversationHistory();
                break;
            case 'code-context':
                await this.loadCodeContext();
                break;
        }
    }

    async loadKnowledgeBase(query = '') {
        try {
            let url = '/api/knowledge';
            if (query) {
                url += `?query=${encodeURIComponent(query)}`;
            }

            const response = await fetch(url);
            const knowledge = await response.json();
            this.renderKnowledge(knowledge);
        } catch (error) {
            console.error('Error loading knowledge base:', error);
            this.app.showError('Failed to load knowledge base');
        }
    }

    renderKnowledge(items) {
        const container = document.getElementById('knowledge-results');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🧠</div>
                    <h3>No knowledge items found</h3>
                    <p>Add knowledge items to build your personal knowledge base</p>
                    <button class="btn-primary" onclick="app.memoryManager.showAddKnowledgeModal()">
                        Add Knowledge
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="knowledge-item" data-id="${item.id}">
                <div class="knowledge-header">
                    <h4>${item.title}</h4>
                    <div class="knowledge-meta">
                        <span class="knowledge-type">${item.type}</span>
                        <span class="knowledge-date">${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="knowledge-content">
                    <p>${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}</p>
                </div>
                <div class="knowledge-footer">
                    <div class="knowledge-tags">
                        ${JSON.parse(item.tags || '[]').map(tag => 
                            `<span class="tag">${tag}</span>`
                        ).join('')}
                    </div>
                    <div class="knowledge-actions">
                        <button class="btn-secondary" onclick="app.memoryManager.viewKnowledge('${item.id}')">View</button>
                        <button class="btn-secondary" onclick="app.memoryManager.editKnowledge('${item.id}')">Edit</button>
                        <button class="btn-danger" onclick="app.memoryManager.deleteKnowledge('${item.id}')">Delete</button>
                    </div>
                </div>
                ${item.source ? `<div class="knowledge-source">Source: ${item.source}</div>` : ''}
            </div>
        `).join('');
    }

    async searchKnowledge(query) {
        await this.loadKnowledgeBase(query);
    }

    showAddKnowledgeModal() {
        const modalContent = `
            <div class="knowledge-modal">
                <div class="modal-header">
                    <span class="modal-icon">🧠</span>
                    <h2>Add Knowledge</h2>
                </div>
                <form id="add-knowledge-form" class="knowledge-form">
                    <div class="form-group">
                        <label for="knowledge-title">Title</label>
                        <input type="text" id="knowledge-title" name="title" placeholder="Knowledge item title" required>
                    </div>
                    <div class="form-group">
                        <label for="knowledge-type">Type</label>
                        <select id="knowledge-type" name="type">
                            <option value="document">Document</option>
                            <option value="note">Note</option>
                            <option value="reference">Reference</option>
                            <option value="tutorial">Tutorial</option>
                            <option value="code-snippet">Code Snippet</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="knowledge-content">Content</label>
                        <textarea id="knowledge-content" name="content" rows="6" placeholder="Enter the content..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="knowledge-source">Source (optional)</label>
                        <input type="text" id="knowledge-source" name="source" placeholder="https://example.com or book title">
                    </div>
                    <div class="form-group">
                        <label for="knowledge-tags">Tags (comma-separated)</label>
                        <input type="text" id="knowledge-tags" name="tags" placeholder="javascript, tutorial, web-dev">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Add Knowledge</button>
                        <button type="button" class="btn-secondary" onclick="app.hideModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        this.app.showModal(modalContent);

        // Setup form handler
        const form = document.getElementById('add-knowledge-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddKnowledge(form);
            });
        }
    }

    async handleAddKnowledge(form) {
        const formData = new FormData(form);
        const data = {
            title: formData.get('title'),
            content: formData.get('content'),
            source: formData.get('source') || '',
            type: formData.get('type'),
            tags: formData.get('tags').split(',').map(t => t.trim()).filter(t => t),
            metadata: {}
        };

        try {
            const response = await fetch('/api/knowledge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.app.hideModal();
                await this.loadKnowledgeBase();
                this.app.showSuccess('Knowledge added successfully');
            } else {
                const error = await response.json();
                this.app.showError(`Failed to add knowledge: ${error.error}`);
            }
        } catch (error) {
            console.error('Error adding knowledge:', error);
            this.app.showError('Failed to add knowledge');
        }
    }

    async viewKnowledge(id) {
        try {
            const response = await fetch(`/api/knowledge/${id}`);
            const item = await response.json();
            
            const modalContent = `
                <div class="knowledge-view-modal">
                    <div class="modal-header">
                        <span class="modal-icon">🧠</span>
                        <h2>${item.title}</h2>
                    </div>
                    <div class="knowledge-details">
                        <div class="detail-item">
                            <label>Type:</label>
                            <span class="knowledge-type-badge">${item.type}</span>
                        </div>
                        <div class="detail-item">
                            <label>Created:</label>
                            <span>${new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        ${item.source ? `
                            <div class="detail-item">
                                <label>Source:</label>
                                <span>${item.source}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <label>Tags:</label>
                            <div class="knowledge-tags">
                                ${JSON.parse(item.tags || '[]').map(tag => 
                                    `<span class="tag">${tag}</span>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="knowledge-content-full">
                        <h3>Content</h3>
                        <div class="content-text">${item.content.replace(/\n/g, '<br>')}</div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.memoryManager.editKnowledge('${item.id}')">Edit</button>
                        <button class="btn-secondary" onclick="app.hideModal()">Close</button>
                    </div>
                </div>
            `;
            
            this.app.showModal(modalContent);
        } catch (error) {
            console.error('Error viewing knowledge:', error);
            this.app.showError('Failed to load knowledge item');
        }
    }

    async editKnowledge(id) {
        // For now, just show view modal - editing can be implemented later
        this.viewKnowledge(id);
    }

    async deleteKnowledge(id) {
        if (!confirm('Are you sure you want to delete this knowledge item?')) {
            return;
        }

        try {
            const response = await fetch(`/api/knowledge/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadKnowledgeBase();
                this.app.showSuccess('Knowledge item deleted successfully');
            } else {
                const error = await response.json();
                this.app.showError(`Failed to delete knowledge: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting knowledge:', error);
            this.app.showError('Failed to delete knowledge item');
        }
    }

    async loadConversationHistory() {
        try {
            const response = await fetch('/api/conversations');
            const conversations = await response.json();
            this.renderConversationHistory(conversations);
        } catch (error) {
            console.error('Error loading conversation history:', error);
            this.app.showError('Failed to load conversation history');
        }
    }

    renderConversationHistory(conversations) {
        const container = document.getElementById('conversation-history');
        if (!container) return;

        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No conversation history</h3>
                    <p>Start chatting to build conversation history</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-history-item" data-id="${conv.id}">
                <div class="conversation-header">
                    <h4>${conv.name}</h4>
                    <span class="conversation-date">${new Date(conv.updated_at).toLocaleDateString()}</span>
                </div>
                <div class="conversation-context">
                    <p>${conv.context || 'No context provided'}</p>
                </div>
                <div class="conversation-actions">
                    <button class="btn-secondary" onclick="app.memoryManager.loadConversation('${conv.id}')">Load</button>
                    <button class="btn-danger" onclick="app.memoryManager.deleteConversation('${conv.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async loadConversation(id) {
        // Switch to chat view and load the conversation
        this.app.switchView('chat');
        await this.app.selectConversation(id);
    }

    async deleteConversation(id) {
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }

        try {
            const response = await fetch(`/api/conversations/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadConversationHistory();
                this.app.showSuccess('Conversation deleted successfully');
            } else {
                const error = await response.json();
                this.app.showError(`Failed to delete conversation: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            this.app.showError('Failed to delete conversation');
        }
    }

    async loadCodeContext() {
        const container = document.getElementById('code-context-list');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💻</div>
                <h3>Code Context</h3>
                <p>Code context will be automatically saved when you analyze or work with files</p>
            </div>
        `;
    }
}

// Initialize memory manager
document.addEventListener('DOMContentLoaded', () => {
    const initializeMemoryManager = () => {
        if (window.app) {
            console.log('Initializing memory manager...');
            window.app.memoryManager = new MemoryManager(window.app);

            // Add utility method for showing success messages
            window.app.showSuccess = function(message) {
                console.log('✅', message);
                // Create a temporary success indicator
                const indicator = document.createElement('div');
                indicator.className = 'success-message';
                indicator.textContent = message;
                indicator.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--success-color);
                    color: white;
                    padding: 1rem;
                    border-radius: var(--radius);
                    z-index: 3000;
                    box-shadow: var(--shadow-lg);
                `;
                document.body.appendChild(indicator);
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.remove();
                    }
                }, 3000);
            };

            // Add info method too
            window.app.showInfo = function(message) {
                console.log('ℹ️', message);
                alert(message); // Simple fallback
            };
            
            console.log('Memory manager initialized successfully');
        } else {
            console.log('App not ready, retrying memory manager initialization...');
            setTimeout(initializeMemoryManager, 200);
        }
    };
    
    // Try initializing immediately, then retry if needed
    setTimeout(initializeMemoryManager, 100);
});