// Project Builder functionality
class ProjectBuilder {
    constructor() {
        this.selectedTemplate = null;
        this.currentProject = null;
        this.buildInProgress = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTemplates();
    }

    bindEvents() {
        // Template selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.template-card')) {
                this.selectTemplate(e.target.closest('.template-card'));
            }
        });

        // Advanced options toggle
        const toggleAdvanced = document.getElementById('toggle-advanced');
        if (toggleAdvanced) {
            toggleAdvanced.addEventListener('click', () => this.toggleAdvanced());
        }

        // Build actions
        const previewBtn = document.getElementById('preview-plan');
        const startBtn = document.getElementById('start-build');
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewPlan());
        }
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startBuild());
        }

        // Log toggle
        const toggleLog = document.getElementById('toggle-log');
        if (toggleLog) {
            toggleLog.addEventListener('click', () => this.toggleLog());
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            
            console.log('Templates loaded:', data.templates);
            // Templates are already displayed in HTML, just store for reference
            this.templates = data.templates;
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    selectTemplate(templateCard) {
        // Remove previous selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Select new template
        templateCard.classList.add('selected');
        this.selectedTemplate = templateCard.dataset.template;

        // Show configuration form
        const configSection = document.getElementById('project-config');
        if (configSection) {
            configSection.style.display = 'block';
            configSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Pre-fill form based on template
        this.populateFormDefaults();
    }

    populateFormDefaults() {
        const templateDefaults = {
            'fullstack-app': {
                type: 'webapp',
                features: ['auth', 'database', 'api'],
                name: 'My Full-Stack App'
            },
            'rest-api': {
                type: 'api', 
                features: ['auth', 'database', 'testing'],
                name: 'My REST API'
            },
            'react-app': {
                type: 'frontend',
                features: ['testing', 'docs'],
                name: 'My React App'
            },
            'ecommerce': {
                type: 'webapp',
                features: ['auth', 'database', 'payments', 'api'],
                name: 'My E-commerce Store'
            },
            'chat-app': {
                type: 'webapp',
                features: ['auth', 'database', 'realtime', 'api'],
                name: 'My Chat App'
            },
            'saas-platform': {
                type: 'webapp',
                features: ['auth', 'database', 'payments', 'api', 'testing', 'ci-cd'],
                name: 'My SaaS Platform'
            },
            'mobile-app': {
                type: 'mobile',
                features: ['auth', 'database', 'api'],
                name: 'My Mobile App'
            },
            'ai-ml-platform': {
                type: 'webapp',
                features: ['database', 'api', 'testing', 'docker'],
                name: 'My AI/ML Platform'
            },
            'blockchain-web3': {
                type: 'webapp',
                features: ['auth', 'database', 'api', 'testing'],
                name: 'My Web3 App'
            },
            'devops-platform': {
                type: 'webapp',
                features: ['auth', 'database', 'api', 'docker', 'ci-cd'],
                name: 'My DevOps Platform'
            },
            'iot-platform': {
                type: 'webapp',
                features: ['auth', 'database', 'api', 'realtime', 'docker'],
                name: 'My IoT Platform'
            },
            'microservices': {
                type: 'api',
                features: ['database', 'api', 'testing', 'docker', 'ci-cd'],
                name: 'My Microservices App'
            }
        };

        const defaults = templateDefaults[this.selectedTemplate];
        if (defaults) {
            document.getElementById('project-name').value = defaults.name;
            document.getElementById('project-type').value = defaults.type;
            
            // Check feature boxes
            document.querySelectorAll('input[name="features"]').forEach(checkbox => {
                checkbox.checked = defaults.features.includes(checkbox.value);
            });
        }
    }

    toggleAdvanced() {
        const advancedOptions = document.getElementById('advanced-options');
        const toggleBtn = document.getElementById('toggle-advanced');
        const chevron = toggleBtn.querySelector('.chevron');
        
        if (advancedOptions.style.display === 'none') {
            advancedOptions.style.display = 'block';
            toggleBtn.setAttribute('aria-expanded', 'true');
            chevron.textContent = '▲';
        } else {
            advancedOptions.style.display = 'none';
            toggleBtn.setAttribute('aria-expanded', 'false');
            chevron.textContent = '▼';
        }
    }

    async previewPlan() {
        if (!this.validateForm()) return;

        const projectData = this.collectFormData();
        
        // Get template details
        const templateInfo = this.getTemplateInfo(this.selectedTemplate);
        
        // Show preview modal
        const previewHtml = `
            <div class="preview-modal">
                <h3>📋 Build Plan Preview</h3>
                <div class="preview-content">
                    <div class="preview-section">
                        <h4>Project Overview</h4>
                        <div class="preview-item">
                            <strong>Project Name:</strong> ${projectData.name}
                        </div>
                        <div class="preview-item">
                            <strong>Template:</strong> ${templateInfo.name}
                        </div>
                        <div class="preview-item">
                            <strong>Type:</strong> ${this.getTypeLabel(projectData.type)}
                        </div>
                        <div class="preview-item">
                            <strong>Description:</strong> ${projectData.description}
                        </div>
                    </div>
                    
                    <div class="preview-section">
                        <h4>Technical Configuration</h4>
                        <div class="preview-item">
                            <strong>Tech Stack:</strong> ${this.getStackLabel(projectData.techStack)}
                        </div>
                        <div class="preview-item">
                            <strong>Deployment:</strong> ${this.getDeploymentLabel(projectData.deploymentTarget)}
                        </div>
                        <div class="preview-item">
                            <strong>AI Provider:</strong> ${this.getAIProviderLabel(projectData.aiProvider)}
                        </div>
                        ${projectData.features.length > 0 ? `
                        <div class="preview-item">
                            <strong>Features:</strong> ${this.getFeatureLabels(projectData.features).join(', ')}
                        </div>` : ''}
                    </div>
                    
                    <div class="preview-section">
                        <h4>Build Details</h4>
                        <div class="preview-item">
                            <strong>Estimated Files:</strong> ${templateInfo.estimatedFiles}
                        </div>
                        <div class="preview-item">
                            <strong>Build Time:</strong> ${templateInfo.estimatedTime}
                        </div>
                        <div class="preview-item">
                            <strong>Complexity:</strong> ${templateInfo.complexity}
                        </div>
                        ${projectData.explainMode ? `
                        <div class="preview-item">
                            <strong>Educational Mode:</strong> ✅ Enabled (AI will explain each step)
                        </div>` : ''}
                    </div>
                    
                    <div class="preview-actions">
                        <button onclick="window.app.hideModal()" class="btn-secondary">Close</button>
                        <button onclick="window.projectBuilder.confirmBuild()" class="btn-primary">🚀 Start Building</button>
                    </div>
                </div>
            </div>
        `;

        window.app.showModal(previewHtml);
    }

    confirmBuild() {
        window.app.hideModal();
        this.startBuild();
    }
    
    getTemplateInfo(templateId) {
        const templateInfoMap = {
            'fullstack-app': { name: 'Full-Stack Web App', estimatedFiles: '15+', estimatedTime: '2-3 minutes', complexity: 'Medium' },
            'rest-api': { name: 'REST API', estimatedFiles: '10+', estimatedTime: '1-2 minutes', complexity: 'Low-Medium' },
            'react-app': { name: 'React Application', estimatedFiles: '8+', estimatedTime: '1 minute', complexity: 'Low' },
            'ecommerce': { name: 'E-commerce Store', estimatedFiles: '20+', estimatedTime: '3-4 minutes', complexity: 'High' },
            'chat-app': { name: 'Real-time Chat App', estimatedFiles: '12+', estimatedTime: '2-3 minutes', complexity: 'Medium-High' },
            'saas-platform': { name: 'Enterprise SaaS Platform', estimatedFiles: '30+', estimatedTime: '4-5 minutes', complexity: 'Very High' },
            'mobile-app': { name: 'React Native Mobile App', estimatedFiles: '15+', estimatedTime: '3-4 minutes', complexity: 'High' },
            'ai-ml-platform': { name: 'AI/ML Platform', estimatedFiles: '25+', estimatedTime: '4-5 minutes', complexity: 'Very High' },
            'blockchain-web3': { name: 'Blockchain/Web3 App', estimatedFiles: '20+', estimatedTime: '3-4 minutes', complexity: 'High' },
            'devops-platform': { name: 'DevOps Platform', estimatedFiles: '25+', estimatedTime: '4-5 minutes', complexity: 'Very High' },
            'iot-platform': { name: 'IoT Platform', estimatedFiles: '20+', estimatedTime: '3-4 minutes', complexity: 'High' },
            'microservices': { name: 'Microservices Architecture', estimatedFiles: '25+', estimatedTime: '4-5 minutes', complexity: 'Very High' },
            'custom': { name: 'Custom Project', estimatedFiles: 'Variable', estimatedTime: '2-5 minutes', complexity: 'Variable' }
        };
        return templateInfoMap[templateId] || { name: templateId, estimatedFiles: 'Unknown', estimatedTime: 'Unknown', complexity: 'Unknown' };
    }
    
    getTypeLabel(type) {
        const typeLabels = {
            'webapp': 'Web Application',
            'api': 'REST API Service',
            'frontend': 'Frontend Only',
            'mobile': 'Mobile Application',
            'desktop': 'Desktop Application'
        };
        return typeLabels[type] || type;
    }
    
    getStackLabel(stack) {
        const stackLabels = {
            'modern': 'Modern Stack (Latest versions)',
            'stable': 'Stable Stack (LTS versions)',
            'minimal': 'Minimal Dependencies',
            'enterprise': 'Enterprise Ready'
        };
        return stackLabels[stack] || stack;
    }
    
    getDeploymentLabel(target) {
        const deploymentLabels = {
            'local': 'Local Development',
            'cloud': 'Cloud Platform Ready',
            'docker': 'Docker Container',
            'serverless': 'Serverless Functions'
        };
        return deploymentLabels[target] || target;
    }
    
    getAIProviderLabel(provider) {
        const providerLabels = {
            'openai': 'OpenAI GPT-4 (Cloud)',
            'openai-mini': 'OpenAI GPT-4o-mini (Cloud)',
            'anthropic': 'Anthropic Claude-3 (Cloud)',
            'ollama': 'Local Ollama (Private)'
        };
        return providerLabels[provider] || provider;
    }
    
    getFeatureLabels(features) {
        const featureLabels = {
            'auth': '🔐 Authentication',
            'database': '🗄️ Database',
            'api': '🔗 REST API',
            'realtime': '⚡ Real-time Features',
            'payments': '💳 Payment Processing',
            'testing': '🧪 Testing Suite',
            'docs': '📚 Documentation',
            'docker': '🐳 Docker Setup',
            'ci-cd': '🚀 CI/CD Pipeline'
        };
        return features.map(f => featureLabels[f] || f);
    }

    async startBuild() {
        if (!this.validateForm()) return;
        if (this.buildInProgress) return;

        this.buildInProgress = true;
        const projectData = this.collectFormData();

        // Show progress section
        this.showProgress();
        
        // Update UI
        const startBtn = document.getElementById('start-build');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '🔄 Building...';
        }

        try {
            this.logMessage('🚀 Starting project build...', 'info');
            
            const response = await fetch('/api/build-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    template: this.selectedTemplate,
                    projectName: projectData.name,
                    projectPath: `./${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
                    config: {
                        description: projectData.description,
                        type: projectData.type,
                        features: projectData.features,
                        techStack: projectData.techStack,
                        deploymentTarget: projectData.deploymentTarget,
                        aiProvider: projectData.aiProvider,
                        codeStyle: projectData.codeStyle,
                        explainMode: projectData.explainMode
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                this.logMessage('✅ Build completed successfully!', 'success');
                this.showResults(result);
            } else {
                throw new Error(result.error || 'Build failed');
            }

        } catch (error) {
            console.error('Build failed:', error);
            this.logMessage(`❌ Build failed: ${error.message}`, 'error');
        } finally {
            this.buildInProgress = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = '🚀 Start Building';
            }
        }
    }

    validateForm() {
        const name = document.getElementById('project-name').value.trim();
        const description = document.getElementById('project-description').value.trim();

        if (!name) {
            alert('Please enter a project name');
            return false;
        }

        if (!description) {
            alert('Please enter a project description');
            return false;
        }

        if (!this.selectedTemplate) {
            alert('Please select a template');
            return false;
        }

        return true;
    }

    collectFormData() {
        const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
            .map(cb => cb.value);

        return {
            name: document.getElementById('project-name').value.trim(),
            description: document.getElementById('project-description').value.trim(),
            type: document.getElementById('project-type').value,
            techStack: document.getElementById('tech-stack').value,
            deploymentTarget: document.getElementById('deployment-target').value,
            features,
            aiProvider: document.getElementById('ai-provider').value,
            codeStyle: document.getElementById('code-style').value,
            explainMode: document.getElementById('explain-mode').checked
        };
    }

    showProgress() {
        // Hide config form and show progress
        document.getElementById('project-config').style.display = 'none';
        document.getElementById('build-progress').style.display = 'block';
        
        // Show explanation if enabled
        if (document.getElementById('explain-mode').checked) {
            document.getElementById('build-explanation').style.display = 'block';
        }

        // Clear previous log
        const logContent = document.getElementById('build-log-content');
        if (logContent) {
            logContent.innerHTML = '';
        }

        // Scroll to progress
        document.getElementById('build-progress').scrollIntoView({ behavior: 'smooth' });
    }

    showResults(result) {
        // Hide progress and show results
        document.getElementById('build-progress').style.display = 'none';
        document.getElementById('build-results').style.display = 'block';

        const resultsContent = document.getElementById('results-content');
        if (resultsContent) {
            resultsContent.innerHTML = `
                <div class="success-summary">
                    <h4>🎉 ${result.projectName || 'Your Project'} is Ready!</h4>
                    <p>Your application has been built successfully and is ready to use.</p>
                </div>
                
                <div class="project-details">
                    <div class="detail-item">
                        <strong>Project Name:</strong> ${result.projectName || 'Unknown'}
                    </div>
                    <div class="detail-item">
                        <strong>Template:</strong> ${this.selectedTemplate}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> ${result.status || 'Completed'}
                    </div>
                    <div class="detail-item">
                        <strong>Steps Completed:</strong> ${result.summary?.completedSteps || 'Multiple'}
                    </div>
                    ${result.summary?.duration ? `
                    <div class="detail-item">
                        <strong>Build Time:</strong> ${Math.round(result.summary.duration / 1000)}s
                    </div>
                    ` : ''}
                </div>

                <div class="next-steps">
                    <h4>🚀 Next Steps:</h4>
                    <ol>
                        <li>Navigate to your project: <code>cd ${result.projectName?.toLowerCase().replace(/\s+/g, '-') || 'your-project'}</code></li>
                        <li>Install dependencies: <code>npm install</code></li>
                        <li>Start development: <code>npm start</code> or <code>npm run dev</code></li>
                        <li>Read the README.md for detailed instructions</li>
                    </ol>
                </div>

                <div class="result-actions">
                    <button onclick="window.projectBuilder.resetBuilder()" class="btn-secondary">
                        🔄 Build Another Project
                    </button>
                    <button onclick="window.projectBuilder.viewProject()" class="btn-primary">
                        📁 View Project Files
                    </button>
                </div>
            `;
        }

        // Scroll to results
        document.getElementById('build-results').scrollIntoView({ behavior: 'smooth' });
    }

    toggleLog() {
        const logContent = document.getElementById('build-log-content');
        const toggleBtn = document.getElementById('toggle-log');
        
        if (logContent.style.display === 'none') {
            logContent.style.display = 'block';
            toggleBtn.textContent = 'Hide Details';
        } else {
            logContent.style.display = 'none';
            toggleBtn.textContent = 'Show Details';
        }
    }

    logMessage(message, type = 'info') {
        const logContent = document.getElementById('build-log-content');
        if (!logContent) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${timestamp}</span>
            <span class="log-message">${message}</span>
        `;

        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
        
        // Show log by default when messages appear
        if (logContent.style.display === 'none') {
            logContent.style.display = 'block';
            document.getElementById('toggle-log').textContent = 'Hide Details';
        }
    }

    resetBuilder() {
        // Reset all forms and hide sections
        document.getElementById('project-config').style.display = 'none';
        document.getElementById('build-progress').style.display = 'none';
        document.getElementById('build-results').style.display = 'none';

        // Clear form
        document.getElementById('project-name').value = '';
        document.getElementById('project-description').value = '';
        document.querySelectorAll('input[name="features"]').forEach(cb => cb.checked = false);

        // Clear selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.selectedTemplate = null;
        this.buildInProgress = false;

        // Scroll to top
        document.querySelector('.template-grid').scrollIntoView({ behavior: 'smooth' });
    }

    viewProject() {
        // Switch to files view to show the generated project
        if (window.app) {
            window.app.switchView('files');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectBuilder = new ProjectBuilder();
});