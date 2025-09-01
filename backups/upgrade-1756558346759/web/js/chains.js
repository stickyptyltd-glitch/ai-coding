// Tool chains functionality
class ChainsManager {
    constructor(app) {
        this.app = app;
        this.chains = [];
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        document.addEventListener('DOMContentLoaded', () => {
            // New chain button
            const newChainBtn = document.getElementById('new-chain');
            if (newChainBtn) {
                newChainBtn.addEventListener('click', () => {
                    this.showCreateChainModal();
                });
            }

            // Refresh chains when switching to chains view
            document.addEventListener('viewChanged', (e) => {
                if (e.detail.view === 'chains') {
                    this.loadChains();
                }
            });

            // Setup socket handlers for chain execution
            this.setupSocketHandlers();
        });
    }

    setupSocketHandlers() {
        const setupHandlers = () => {
            if (!this.app.socket) {
                setTimeout(setupHandlers, 100);
                return;
            }

            console.log('Setting up chain socket handlers...');

            // Remove existing handlers first
            this.app.socket.off('chain-started');
            this.app.socket.off('chain-completed');
            this.app.socket.off('chain-error');
            this.app.socket.off('chain-progress');

            // Handle chain execution responses
            this.app.socket.on('chain-started', (data) => {
                console.log('Chain execution started:', data);
                this.handleChainStarted(data);
            });

            this.app.socket.on('chain-completed', (data) => {
                console.log('Chain execution completed:', data);
                this.handleChainCompleted(data);
            });

            this.app.socket.on('chain-error', (data) => {
                console.log('Chain execution error:', data);
                this.handleChainError(data);
            });

            this.app.socket.on('chain-progress', (data) => {
                console.log('Chain execution progress:', data);
                this.handleChainProgress(data);
            });

            console.log('Chain socket handlers setup complete');
        };

        setupHandlers();
    }

    async loadChains() {
        try {
            const response = await fetch('/api/chains');
            this.chains = await response.json();
            this.renderChains();
        } catch (error) {
            console.error('Error loading chains:', error);
            this.app.showError('Failed to load tool chains');
        }
    }

    renderChains() {
        const container = document.getElementById('chains-list');
        if (!container) return;

        if (this.chains.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔗</div>
                    <h3>No tool chains yet</h3>
                    <p>Create your first tool chain to automate complex workflows</p>
                    <button class="btn-primary" onclick="app.chainsManager.showCreateChainModal()">
                        Create Tool Chain
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.chains.map(chain => `
            <div class="chain-card" data-id="${chain.id}">
                <div class="chain-header">
                    <div class="chain-info">
                        <h3>${chain.name}</h3>
                        <p class="chain-description">${chain.description || 'No description'}</p>
                    </div>
                    <div class="chain-status">
                        <span class="status-badge ${chain.status}">${chain.status}</span>
                    </div>
                </div>
                <div class="chain-meta">
                    <span class="chain-steps">📋 ${chain.stepCount} steps</span>
                    <span class="chain-date">📅 ${new Date(chain.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="chain-actions">
                    <button class="btn-primary" onclick="app.chainsManager.executeChain('${chain.id}')">
                        ▶️ Execute
                    </button>
                    <button class="btn-secondary" onclick="app.chainsManager.executeChainAsJob('${chain.id}')">
                        🧰 Run as Job
                    </button>
                    <button class="btn-secondary" onclick="app.chainsManager.editChain('${chain.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn-secondary" onclick="app.chainsManager.viewChain('${chain.id}')">
                        👁️ View
                    </button>
                    <button class="btn-danger" onclick="app.chainsManager.deleteChain('${chain.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async executeChainAsJob(id) {
        try {
            const res = await fetch(`/api/chains/${id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asJob: true })
            });
            const data = await res.json();
            if (data.jobId) {
                this.app.switchView('jobs');
                if (this.app.jobsPanel) {
                    await this.app.jobsPanel.loadJobs();
                }
            } else if (data.error) {
                alert('Failed to start job: ' + data.error);
            }
        } catch (e) {
            alert('Failed to start job: ' + e.message);
        }
    }

    showCreateChainModal() {
        const modalContent = `
            <div class="chain-modal">
                <div class="modal-header">
                    <span class="modal-icon">🔗</span>
                    <h2>Create Tool Chain</h2>
                </div>
                <form id="create-chain-form" class="chain-form">
                    <div class="form-group">
                        <label for="chain-name">Chain Name</label>
                        <input type="text" id="chain-name" name="name" placeholder="My Automation Chain" required>
                    </div>
                    <div class="form-group">
                        <label for="chain-description">Description</label>
                        <textarea id="chain-description" name="description" placeholder="Describe what this chain does..." rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Template</label>
                        <select id="chain-template" name="template">
                            <option value="">Start from scratch</option>
                            <option value="code-analysis">Code Analysis Workflow</option>
                            <option value="web-research">Web Research & Analysis</option>
                            <option value="project-setup">Project Setup Automation</option>
                        </select>
                    </div>
                    <div class="steps-section">
                        <h3>Steps</h3>
                        <div id="chain-steps" class="chain-steps">
                            <div class="step-item" data-index="0">
                                <div class="step-header">
                                    <span class="step-number">1</span>
                                    <select class="step-tool" name="steps[0][tool]" required>
                                        <option value="">Select tool...</option>
                                        <option value="analyze">Analyze Code</option>
                                        <option value="search">Search Code</option>
                                        <option value="scrape">Scrape Website</option>
                                        <option value="modify">Modify Code</option>
                                        <option value="create">Create File</option>
                                    </select>
                                    <button type="button" class="btn-danger step-remove" onclick="app.chainsManager.removeStep(0)">×</button>
                                </div>
                                <div class="step-params">
                                    <input type="text" name="steps[0][params]" placeholder="Parameters (e.g., target=src/app.js)" class="step-params-input">
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn-secondary" onclick="app.chainsManager.addStep()">
                            ➕ Add Step
                        </button>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Create Chain</button>
                        <button type="button" class="btn-secondary" onclick="app.hideModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        this.app.showModal(modalContent);

        // Setup form handler
        const form = document.getElementById('create-chain-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateChain(form);
            });

            // Template selection
            const templateSelect = document.getElementById('chain-template');
            templateSelect.addEventListener('change', (e) => {
                this.loadTemplate(e.target.value);
            });
        }
    }

    addStep() {
        const stepsContainer = document.getElementById('chain-steps');
        const stepCount = stepsContainer.children.length;
        
        const stepElement = document.createElement('div');
        stepElement.className = 'step-item';
        stepElement.setAttribute('data-index', stepCount);
        
        stepElement.innerHTML = `
            <div class="step-header">
                <span class="step-number">${stepCount + 1}</span>
                <select class="step-tool" name="steps[${stepCount}][tool]" required>
                    <option value="">Select tool...</option>
                    <option value="analyze">Analyze Code</option>
                    <option value="search">Search Code</option>
                    <option value="scrape">Scrape Website</option>
                    <option value="modify">Modify Code</option>
                    <option value="create">Create File</option>
                </select>
                <button type="button" class="btn-danger step-remove" onclick="app.chainsManager.removeStep(${stepCount})">×</button>
            </div>
            <div class="step-params">
                <input type="text" name="steps[${stepCount}][params]" placeholder="Parameters (e.g., target=src/app.js)" class="step-params-input">
            </div>
        `;
        
        stepsContainer.appendChild(stepElement);
        this.updateStepNumbers();
    }

    removeStep(index) {
        const stepElement = document.querySelector(`[data-index="${index}"]`);
        if (stepElement && document.querySelectorAll('.step-item').length > 1) {
            stepElement.remove();
            this.updateStepNumbers();
        }
    }

    updateStepNumbers() {
        const steps = document.querySelectorAll('.step-item');
        steps.forEach((step, index) => {
            step.setAttribute('data-index', index);
            step.querySelector('.step-number').textContent = index + 1;
            
            // Update form field names
            const toolSelect = step.querySelector('.step-tool');
            const paramsInput = step.querySelector('.step-params-input');
            const removeBtn = step.querySelector('.step-remove');
            
            toolSelect.name = `steps[${index}][tool]`;
            paramsInput.name = `steps[${index}][params]`;
            removeBtn.setAttribute('onclick', `app.chainsManager.removeStep(${index})`);
        });
    }

    loadTemplate(templateName) {
        if (!templateName) return;

        const templates = {
            'code-analysis': {
                steps: [
                    { tool: 'analyze', params: 'target={{file}}' },
                    { tool: 'search', params: 'query=TODO' }
                ]
            },
            'web-research': {
                steps: [
                    { tool: 'scrape', params: 'url={{url}}' },
                    { tool: 'analyze-web', params: 'url={{url}}' }
                ]
            },
            'project-setup': {
                steps: [
                    { tool: 'create', params: 'target=README.md,instructions=Create project documentation' },
                    { tool: 'create', params: 'target=.gitignore,instructions=Standard gitignore file' }
                ]
            }
        };

        const template = templates[templateName];
        if (!template) return;

        // Clear existing steps
        document.getElementById('chain-steps').innerHTML = '';

        // Add template steps
        template.steps.forEach((step, index) => {
            this.addStep();
            const stepElement = document.querySelector(`[data-index="${index}"]`);
            stepElement.querySelector('.step-tool').value = step.tool;
            stepElement.querySelector('.step-params-input').value = step.params;
        });
    }

    async handleCreateChain(form) {
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            steps: []
        };

        // Collect steps
        const steps = document.querySelectorAll('.step-item');
        steps.forEach((step, index) => {
            const tool = formData.get(`steps[${index}][tool]`);
            const paramsStr = formData.get(`steps[${index}][params]`) || '';
            
            if (tool) {
                // Parse parameters
                const params = {};
                if (paramsStr) {
                    paramsStr.split(',').forEach(pair => {
                        const [key, value] = pair.split('=').map(s => s.trim());
                        if (key && value) {
                            params[key] = value;
                        }
                    });
                }

                data.steps.push({
                    tool,
                    params,
                    options: {}
                });
            }
        });

        try {
            const response = await fetch('/api/chains', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.app.hideModal();
                await this.loadChains();
                this.app.showSuccess('Tool chain created successfully');
            } else {
                const error = await response.json();
                this.app.showError(`Failed to create chain: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating chain:', error);
            this.app.showError('Failed to create tool chain');
        }
    }

    async executeChain(chainId) {
        if (!chainId) return;

        try {
            this.app.showLoading(true);
            
            // Get chain details first
            const response = await fetch(`/api/chains/${chainId}`);
            const chain = await response.json();
            
            if (!response.ok) {
                throw new Error(chain.error || 'Chain not found');
            }

            // Show execution via socket for real-time updates
            this.app.socket.emit('execute-chain', { 
                chainId: chainId,
                variables: {}
            });

        } catch (error) {
            console.error('Error executing chain:', error);
            this.app.showError(`Failed to execute chain: ${error.message}`);
            this.app.showLoading(false);
        }
    }

    async viewChain(chainId) {
        try {
            const response = await fetch(`/api/chains/${chainId}`);
            const chain = await response.json();
            
            const modalContent = `
                <div class="chain-view-modal">
                    <div class="modal-header">
                        <span class="modal-icon">🔗</span>
                        <h2>${chain.name}</h2>
                    </div>
                    <div class="chain-details">
                        <div class="detail-item">
                            <label>Description:</label>
                            <p>${chain.description || 'No description'}</p>
                        </div>
                        <div class="detail-item">
                            <label>Created:</label>
                            <p>${new Date(chain.createdAt).toLocaleString()}</p>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge ${chain.status}">${chain.status}</span>
                        </div>
                    </div>
                    <div class="chain-steps-view">
                        <h3>Steps (${chain.steps.length})</h3>
                        <ol class="steps-list">
                            ${chain.steps.map(step => `
                                <li class="step-view-item">
                                    <strong>${step.tool}</strong>
                                    ${Object.keys(step.params).length > 0 ? 
                                        `<div class="step-params">Parameters: ${JSON.stringify(step.params)}</div>` : 
                                        ''
                                    }
                                </li>
                            `).join('')}
                        </ol>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="app.chainsManager.executeChain('${chain.id}')">
                            ▶️ Execute Chain
                        </button>
                        <button class="btn-secondary" onclick="app.hideModal()">Close</button>
                    </div>
                </div>
            `;
            
            this.app.showModal(modalContent);
        } catch (error) {
            console.error('Error viewing chain:', error);
            this.app.showError('Failed to load chain details');
        }
    }

    async editChain(chainId) {
        // For now, show view modal - editing can be implemented later
        this.viewChain(chainId);
    }

    async deleteChain(chainId) {
        if (!confirm('Are you sure you want to delete this tool chain?')) {
            return;
        }

        try {
            const response = await fetch(`/api/chains/${chainId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadChains();
                this.app.showSuccess('Tool chain deleted successfully');
            } else {
                const error = await response.json();
                this.app.showError(`Failed to delete chain: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting chain:', error);
            this.app.showError('Failed to delete tool chain');
        }
    }

    // Chain execution event handlers
    handleChainStarted(data) {
        this.app.showLoading(true);
        
        // Show progress notification
        const message = `🔄 **Chain Execution Started**\n\nChain: ${data.chainName || data.chainId}\nInitializing...`;
        
        // If we're on chat view, add a message there too
        if (this.app.currentView === 'chat' && this.app.chatManager) {
            this.app.chatManager.addMessage('system', message);
        }
        
        // Show toast notification
        this.showExecutionToast('Chain started', 'info');
    }

    handleChainCompleted(data) {
        this.app.showLoading(false);
        
        const duration = data.duration ? `${Math.round(data.duration / 1000)}s` : 'Unknown';
        const message = `✅ **Chain Execution Completed**\n\nChain: ${data.chainName || data.chainId}\nDuration: ${duration}\nStatus: ${data.status}\n\n${data.summary || 'Chain executed successfully'}`;
        
        // If we're on chat view, add a message there too
        if (this.app.currentView === 'chat' && this.app.chatManager) {
            this.app.chatManager.addMessage('assistant', message);
        }
        
        // Show success toast
        this.showExecutionToast('Chain completed successfully', 'success');
        
        // Refresh chains list to show updated status
        this.loadChains();
    }

    handleChainError(data) {
        this.app.showLoading(false);
        
        const errorMessage = `❌ **Chain Execution Failed**\n\nChain: ${data.chainName || data.chainId}\nError: ${data.error || 'Unknown error'}\n\nStep: ${data.step || 'Unknown'}\nDetails: ${data.details || 'No additional details available'}`;
        
        // If we're on chat view, add a message there too
        if (this.app.currentView === 'chat' && this.app.chatManager) {
            this.app.chatManager.addMessage('system', errorMessage);
        }
        
        // Show error toast
        this.showExecutionToast(`Chain failed: ${data.error || 'Unknown error'}`, 'error');
    }

    handleChainProgress(data) {
        const message = `⚡ **Chain Progress**\n\nStep ${data.currentStep}/${data.totalSteps}: ${data.stepName}\nStatus: ${data.status}`;
        
        // If we're on chat view, show progress there
        if (this.app.currentView === 'chat' && this.app.chatManager) {
            this.app.chatManager.addMessage('system', message);
        }
        
        // Update loading indicator with progress info
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator && loadingIndicator.classList.contains('active')) {
            const progressText = loadingIndicator.querySelector('p');
            if (progressText) {
                progressText.textContent = `Executing step ${data.currentStep}/${data.totalSteps}: ${data.stepName}`;
            }
        }
    }

    showExecutionToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `execution-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'};
            color: white;
            padding: 1rem;
            border-radius: var(--radius);
            z-index: 3000;
            box-shadow: var(--shadow-lg);
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize chains manager
if (window.app) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.app) {
                window.app.chainsManager = new ChainsManager(window.app);

                // Add methods to main app
                window.app.executeChain = function(chainId) {
                    return this.chainsManager.executeChain(chainId);
                };

                window.app.editChain = function(chainId) {
                    return this.chainsManager.editChain(chainId);
                };
            }
        }, 100);
    });
}
