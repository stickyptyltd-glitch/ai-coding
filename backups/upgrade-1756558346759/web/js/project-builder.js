// Project Builder - Build complete apps from scratch
class ProjectBuilder {
    constructor() {
        this.currentProject = null;
        this.buildProgress = {
            total: 0,
            completed: 0,
            currentStep: ''
        };
        this.initializeBuilder();
    }

    initializeBuilder() {
        this.bindEvents();
        this.loadTemplates();
    }

    bindEvents() {
        // Quick start template cards
        document.querySelectorAll('.quick-start-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const template = card.dataset.template;
                this.selectTemplate(template);
            });
        });

        // Advanced options toggle
        document.querySelector('.toggle-advanced')?.addEventListener('click', () => {
            this.toggleAdvancedOptions();
        });

        // Start building button
        document.getElementById('start-building')?.addEventListener('click', () => {
            this.startBuilding();
        });

        // Preview plan button
        document.getElementById('preview-plan')?.addEventListener('click', () => {
            this.previewPlan();
        });
    }

    selectTemplate(templateType) {
        console.log(`Selected template: ${templateType}`);
        
        // Show project builder section
        document.getElementById('project-builder').style.display = 'block';
        document.getElementById('project-builder').scrollIntoView({ behavior: 'smooth' });

        // Set template-specific defaults
        this.setTemplateDefaults(templateType);
    }

    setTemplateDefaults(templateType) {
        const defaults = {
            webapp: {
                name: 'My Web Application',
                description: 'A full-stack web application with user authentication, database integration, and modern UI',
                type: 'webapp',
                tech: 'modern',
                features: ['auth', 'database', 'api', 'mobile']
            },
            api: {
                name: 'My REST API',
                description: 'Professional REST API with authentication, validation, documentation, and testing',
                type: 'api', 
                tech: 'stable',
                features: ['auth', 'database', 'testing']
            },
            mobile: {
                name: 'My Mobile App',
                description: 'Cross-platform mobile application with native features and cloud backend',
                type: 'mobile',
                tech: 'modern',
                features: ['auth', 'database', 'api', 'pwa']
            },
            ecommerce: {
                name: 'My Online Store',
                description: 'Complete e-commerce platform with payment processing, inventory management, and admin dashboard',
                type: 'webapp',
                tech: 'cutting-edge',
                features: ['auth', 'database', 'payments', 'admin', 'api']
            },
            dashboard: {
                name: 'My Analytics Dashboard', 
                description: 'Data visualization and reporting dashboard with real-time updates and interactive charts',
                type: 'webapp',
                tech: 'modern',
                features: ['database', 'api', 'realtime', 'admin']
            },
            custom: {
                name: 'My Custom Project',
                description: 'Tell me what you want to build and I\'ll create it for you',
                type: 'webapp',
                tech: 'auto',
                features: []
            }
        };

        const template = defaults[templateType];
        if (template) {
            document.getElementById('project-name').value = template.name;
            document.getElementById('project-description').value = template.description;
            document.getElementById('project-type').value = template.type;
            document.getElementById('tech-preference').value = template.tech;

            // Check relevant feature boxes
            document.querySelectorAll('input[name="features"]').forEach(checkbox => {
                checkbox.checked = template.features.includes(checkbox.value);
            });
        }
    }

    toggleAdvancedOptions() {
        const content = document.querySelector('.advanced-content');
        const icon = document.querySelector('.toggle-advanced i');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none'; 
            icon.className = 'fas fa-chevron-down';
        }
    }

    async startBuilding() {
        const projectData = this.collectProjectData();
        
        if (!this.validateProject(projectData)) {
            return;
        }

        // Show build progress section
        this.showBuildProgress();
        
        // Start the build process
        try {
            await this.buildProject(projectData);
        } catch (error) {
            console.error('Build failed:', error);
            this.showError('Build failed: ' + error.message);
        }
    }

    collectProjectData() {
        const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
            .map(cb => cb.value);

        return {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            type: document.getElementById('project-type').value,
            techPreference: document.getElementById('tech-preference').value,
            features,
            aiStyle: document.getElementById('ai-style')?.value || 'intermediate',
            codeStyle: document.getElementById('code-style')?.value || 'standard',
            includeTests: document.getElementById('include-tests')?.checked || false,
            includeDocs: document.getElementById('include-docs')?.checked || false,
            explainBuild: document.getElementById('explain-build')?.checked || false
        };
    }

    validateProject(projectData) {
        if (!projectData.name.trim()) {
            this.showError('Please enter a project name');
            return false;
        }

        if (!projectData.description.trim()) {
            this.showError('Please enter a project description');
            return false;
        }

        return true;
    }

    showBuildProgress() {
        // Hide builder form
        document.getElementById('project-builder').style.display = 'none';
        
        // Show progress section
        document.getElementById('build-progress').style.display = 'block';
        document.getElementById('build-progress').scrollIntoView({ behavior: 'smooth' });

        // Show explanation if enabled
        const explainBuild = document.getElementById('explain-build')?.checked;
        if (explainBuild) {
            document.getElementById('build-explanation').style.display = 'block';
        }

        // Clear previous log
        document.getElementById('log-content').innerHTML = '';
    }

    async buildProject(projectData) {
        console.log('Starting project build:', projectData);
        
        // Map project type to template
        const templateMap = {
            'webapp': 'fullstack-app',
            'api': 'rest-api', 
            'frontend': 'react-app',
            'ecommerce': 'ecommerce',
            'chat': 'chat-app'
        };
        
        const template = templateMap[projectData.type] || 'fullstack-app';
        
        this.logInfo(`🚀 Starting build with ${template} template...`);
        
        try {
            // Use toolchain to build project
            const response = await fetch('/api/build-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    template: template,
                    projectName: projectData.name,
                    projectPath: `./${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
                    config: {
                        description: projectData.description,
                        features: projectData.features,
                        techPreference: projectData.techPreference,
                        aiStyle: projectData.aiStyle,
                        includeTests: projectData.includeTests,
                        includeDocs: projectData.includeDocs
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.logSuccess('✅ Project built successfully!');
                this.showProjectResults(result);
            } else {
                throw new Error(result.error || 'Build failed');
            }
            
        } catch (error) {
            console.error('Build failed:', error);
            this.logError(`❌ Build failed: ${error.message}`);
            throw error;
        }
    }

    generateBuildSteps(projectData) {
        const baseSteps = [
            { name: 'Project initialization', type: 'setup' },
            { name: 'Project structure', type: 'structure' },
            { name: 'Package configuration', type: 'config' }
        ];

        // Add feature-specific steps
        if (projectData.features.includes('database')) {
            baseSteps.push({ name: 'Database setup', type: 'database' });
            baseSteps.push({ name: 'Data models', type: 'models' });
        }

        if (projectData.features.includes('auth')) {
            baseSteps.push({ name: 'Authentication system', type: 'auth' });
        }

        if (projectData.features.includes('api')) {
            baseSteps.push({ name: 'API endpoints', type: 'api' });
        }

        if (projectData.type === 'webapp') {
            baseSteps.push({ name: 'Frontend components', type: 'frontend' });
            baseSteps.push({ name: 'UI styling', type: 'styling' });
        }

        if (projectData.features.includes('testing')) {
            baseSteps.push({ name: 'Test suite', type: 'testing' });
        }

        if (projectData.features.includes('docker')) {
            baseSteps.push({ name: 'Docker configuration', type: 'docker' });
        }

        if (projectData.features.includes('cicd')) {
            baseSteps.push({ name: 'CI/CD pipeline', type: 'cicd' });
        }

        baseSteps.push({ name: 'Documentation', type: 'docs' });
        baseSteps.push({ name: 'Final optimization', type: 'optimize' });

        return baseSteps;
    }

    async executeStep(step, projectData) {
        // Simulate AI building the step
        const stepData = {
            step: step,
            project: projectData,
            timestamp: new Date().toISOString()
        };

        // Send to AI agent for execution
        const response = await this.sendToAgent('execute-goal', {
            description: `${step.name} for ${projectData.name}`,
            options: {
                stepType: step.type,
                projectData: projectData,
                execute: true
            }
        });

        if (projectData.explainBuild) {
            this.showExplanation(step, response.explanation);
        }

        return response;
    }

    async sendToAgent(command, data) {
        // This would integrate with the actual AI agent
        // For now, simulating the response
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    explanation: `Building ${data.description} using modern best practices and industry standards.`,
                    files: [`${data.description.toLowerCase().replace(/\s+/g, '-')}.js`],
                    details: 'Step completed successfully'
                });
            }, Math.random() * 2000 + 1000);
        });
    }

    showExplanation(step, explanation) {
        const content = document.getElementById('explanation-content');
        const explanationText = `
            <div class="step-explanation">
                <h4>🔨 ${step.name}</h4>
                <p>${explanation || 'Building this component with industry best practices.'}</p>
                <div class="explanation-details">
                    <strong>Why this approach:</strong> This ensures maintainability and scalability.
                    <br><strong>Key considerations:</strong> Following modern patterns and security best practices.
                </div>
            </div>
        `;
        content.innerHTML = explanationText;
    }

    updateProgress(stepName) {
        this.buildProgress.currentStep = stepName;
        document.getElementById('progress-status').textContent = stepName;
    }

    updateProgressBar() {
        const percent = Math.round((this.buildProgress.completed / this.buildProgress.total) * 100);
        document.getElementById('progress-fill').style.width = percent + '%';
        document.getElementById('progress-percent').textContent = percent + '%';
    }

    logSuccess(message) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry success';
        logEntry.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ${message}`;
        document.getElementById('log-content').appendChild(logEntry);
        this.scrollLog();
    }

    logError(message) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry error';
        logEntry.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ${message}`;
        document.getElementById('log-content').appendChild(logEntry);
        this.scrollLog();
    }

    logInfo(message) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ${message}`;
        document.getElementById('log-content').appendChild(logEntry);
        this.scrollLog();
    }

    scrollLog() {
        const logContent = document.getElementById('log-content');
        logContent.scrollTop = logContent.scrollHeight;
    }

    async previewPlan() {
        const projectData = this.collectProjectData();
        
        if (!this.validateProject(projectData)) {
            return;
        }

        const steps = this.generateBuildSteps(projectData);
        
        const planHTML = `
            <div class="plan-preview">
                <h3>🚀 Project Build Plan</h3>
                <div class="project-summary">
                    <h4>${projectData.name}</h4>
                    <p>${projectData.description}</p>
                    <div class="tech-info">
                        <span class="tech-badge">${projectData.type}</span>
                        <span class="tech-badge">${projectData.techPreference}</span>
                    </div>
                </div>
                
                <div class="build-steps">
                    <h4>Build Steps (${steps.length} total):</h4>
                    <ol>
                        ${steps.map(step => `<li>${step.name}</li>`).join('')}
                    </ol>
                </div>
                
                <div class="features-summary">
                    <h4>Included Features:</h4>
                    <div class="feature-tags">
                        ${projectData.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
                    </div>
                </div>
                
                <div class="estimated-time">
                    <strong>Estimated build time:</strong> ${this.estimateBuildTime(steps)} minutes
                </div>
                
                <div class="plan-actions">
                    <button class="btn-primary" onclick="window.projectBuilder.confirmBuild()">
                        <i class="fas fa-rocket"></i>
                        Start Building
                    </button>
                    <button class="btn-secondary" onclick="window.app.closeModal()">
                        Back to Edit
                    </button>
                </div>
            </div>
        `;
        
        this.showModal('Build Plan Preview', planHTML);
    }

    confirmBuild() {
        window.app.closeModal();
        this.startBuilding();
    }

    estimateBuildTime(steps) {
        return Math.ceil(steps.length * 1.5); // Rough estimate
    }

    showProjectResults(result = {}) {
        const resultsHTML = `
            <div class="build-results">
                <div class="success-header">
                    <i class="fas fa-check-circle"></i>
                    <h3>Project Built Successfully!</h3>
                </div>
                
                <div class="project-info">
                    <h4>${result.projectName || this.currentProject?.name || 'Your Project'}</h4>
                    <p>Your application has been built and is ready to use.</p>
                    <div class="build-details">
                        <span><strong>Status:</strong> ${result.status || 'Completed'}</span>
                        <span><strong>Steps:</strong> ${result.summary?.completedSteps || 'Multiple'} completed</span>
                        <span><strong>Duration:</strong> ${result.summary?.duration ? Math.round(result.summary.duration / 1000) + 's' : 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="next-steps">
                    <h4>🚀 Next Steps:</h4>
                    <ul>
                        <li>Navigate to: <code>cd ${result.projectName?.toLowerCase().replace(/\s+/g, '-') || 'your-project'}</code></li>
                        <li>Install dependencies: <code>npm install</code></li>
                        <li>Start development: <code>npm start</code> or <code>npm run dev</code></li>
                        <li>Read the generated README.md for details</li>
                    </ul>
                </div>
                
                <div class="result-actions">
                    <button class="btn-primary" onclick="window.projectBuilder.openProject()">
                        <i class="fas fa-folder-open"></i>
                        Open Project
                    </button>
                    <button class="btn-secondary" onclick="window.projectBuilder.buildAnother()">
                        <i class="fas fa-plus"></i>
                        Build Another
                    </button>
                </div>
            </div>
        `;
        
        // Replace progress section with results
        document.getElementById('build-progress').innerHTML = resultsHTML;
    }

    openProject() {
        // Open the projects view
        window.app.switchView('projects');
    }

    buildAnother() {
        // Reset the builder
        this.resetBuilder();
        document.querySelector('.quick-start').scrollIntoView({ behavior: 'smooth' });
    }

    resetBuilder() {
        // Hide all sections except quick start
        document.getElementById('project-builder').style.display = 'none';
        document.getElementById('build-progress').style.display = 'none';
        
        // Reset form
        document.getElementById('project-name').value = '';
        document.getElementById('project-description').value = '';
        document.querySelectorAll('input[name="features"]').forEach(cb => cb.checked = false);
        
        // Reset progress
        this.buildProgress = { total: 0, completed: 0, currentStep: '' };
    }

    showModal(title, content) {
        if (window.app && window.app.showModal) {
            window.app.showModal(title, content);
        }
    }

    showError(message) {
        if (window.app && window.app.showError) {
            window.app.showError(message);
        } else {
            alert(message);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadTemplates() {
        try {
            // Load templates from the server
            const response = await fetch('/api/templates');
            const data = await response.json();
            
            this.templates = {};
            data.templates.forEach(template => {
                this.templates[template.name] = {
                    name: template.displayName,
                    description: template.description
                };
            });
            
            console.log('Templates loaded:', this.templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
            // Fallback to default templates
            this.templates = {
                'fullstack-app': {
                    name: 'Full Stack Web Application',
                    description: 'Complete web application with frontend, backend, and database'
                },
                'rest-api': {
                    name: 'Professional REST API',
                    description: 'REST API with authentication, validation, and documentation'
                },
                'react-app': {
                    name: 'Modern React Application',
                    description: 'React app with routing, state management, and modern UI'
                }
            };
        }
    }
}

// Initialize project builder
window.projectBuilder = new ProjectBuilder();