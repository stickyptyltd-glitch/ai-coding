// Tools functionality
class ToolsManager {
    constructor(app) {
        this.app = app;
        this.setupToolHandlers();
    }

    setupToolHandlers() {
        // Handle tool card clicks from app.js
        document.addEventListener('DOMContentLoaded', () => {
            this.setupToolModals();
        });
    }

    setupToolModals() {
        // Setup tool-specific modals and handlers
        const tools = ['analyze', 'modify', 'create', 'search', 'explain', 'scrape', 'extract', 'crawl', 'analyze-web'];
        
        tools.forEach(tool => {
            this.setupToolModal(tool);
        });
    }

    setupToolModal(tool) {
        // This method is called from app.js showToolModal
        const modalContent = this.getToolModalContent(tool);
        return modalContent;
    }

    getToolModalContent(tool) {
        const toolConfigs = {
            analyze: {
                title: 'Analyze Code',
                icon: '🔍',
                fields: [
                    { name: 'target', label: 'File Path', type: 'text', placeholder: 'src/app.js', required: true }
                ]
            },
            modify: {
                title: 'Modify Code',
                icon: '✏️',
                fields: [
                    { name: 'target', label: 'File Path', type: 'text', placeholder: 'src/app.js', required: true },
                    { name: 'instructions', label: 'Instructions', type: 'textarea', placeholder: 'Add error handling to the function', required: true }
                ]
            },
            create: {
                title: 'Create File',
                icon: '🆕',
                fields: [
                    { name: 'target', label: 'File Path', type: 'text', placeholder: 'src/components/Button.jsx', required: true },
                    { name: 'instructions', label: 'Requirements', type: 'textarea', placeholder: 'Create a reusable button component with props for styling', required: true }
                ]
            },
            search: {
                title: 'Search Code',
                icon: '🔎',
                fields: [
                    { name: 'query', label: 'Search Query', type: 'text', placeholder: 'TODO', required: true }
                ]
            },
            explain: {
                title: 'Explain Code',
                icon: '💡',
                fields: [
                    { name: 'target', label: 'File Path', type: 'text', placeholder: 'src/utils.js', required: true }
                ]
            },
            scrape: {
                title: 'Scrape Website',
                icon: '🌐',
                fields: [
                    { name: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com', required: true },
                    { name: 'outputFile', label: 'Output File (optional)', type: 'text', placeholder: 'scraped-data.json' }
                ]
            },
            extract: {
                title: 'Extract Content',
                icon: '🎯',
                fields: [
                    { name: 'selector', label: 'CSS Selector', type: 'text', placeholder: '.article-content', required: true },
                    { name: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com', required: true },
                    { name: 'outputFile', label: 'Output File (optional)', type: 'text', placeholder: 'extracted-data.json' }
                ]
            },
            crawl: {
                title: 'Crawl Website',
                icon: '🕷️',
                fields: [
                    { name: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com', required: true },
                    { name: 'depth', label: 'Depth', type: 'number', placeholder: '2', min: 1, max: 5 },
                    { name: 'outputFile', label: 'Output File (optional)', type: 'text', placeholder: 'crawled-data.json' }
                ]
            },
            'analyze-web': {
                title: 'Analyze Website',
                icon: '📊',
                fields: [
                    { name: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com', required: true }
                ]
            }
        };

        const config = toolConfigs[tool];
        if (!config) return 'Tool not found';

        const fieldsHtml = config.fields.map(field => {
            const fieldType = field.type === 'textarea' ? 'textarea' : 'input';
            const typeAttr = field.type !== 'textarea' ? `type="${field.type}"` : '';
            const requiredAttr = field.required ? 'required' : '';
            const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
            const minAttr = field.min ? `min="${field.min}"` : '';
            const maxAttr = field.max ? `max="${field.max}"` : '';
            
            return `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    ${fieldType === 'textarea' ? 
                        `<textarea id="${field.name}" name="${field.name}" ${placeholder} ${requiredAttr} rows="3"></textarea>` :
                        `<input id="${field.name}" name="${field.name}" ${typeAttr} ${placeholder} ${requiredAttr} ${minAttr} ${maxAttr}>`
                    }
                </div>
            `;
        }).join('');

        return `
            <div class="tool-modal">
                <div class="modal-header">
                    <span class="tool-icon">${config.icon}</span>
                    <h2>${config.title}</h2>
                </div>
                <form id="tool-form" class="tool-form">
                    ${fieldsHtml}
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Execute Tool</button>
                        <button type="button" class="btn-secondary" onclick="app.hideModal()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
    }

    async executeTool(tool, formData) {
        this.app.showLoading(true);
        
        try {
            const command = this.buildCommand(tool, formData);
            
            // Send to server via Socket.IO for real-time updates
            this.app.socket.emit('chat-message', {
                message: command,
                useMemory: this.app.memoryEnabled
            });
            
            this.app.hideModal();
        } catch (error) {
            console.error('Tool execution error:', error);
            this.app.showError(`Failed to execute tool: ${error.message}`);
        } finally {
            this.app.showLoading(false);
        }
    }

    buildCommand(tool, formData) {
        switch (tool) {
            case 'analyze':
                return `analyze ${formData.target}`;
            case 'modify':
                return `modify ${formData.target} to ${formData.instructions}`;
            case 'create':
                return `create ${formData.target} with ${formData.instructions}`;
            case 'search':
                return `search ${formData.query}`;
            case 'explain':
                return `explain ${formData.target}`;
            case 'scrape':
                return `scrape ${formData.url}${formData.outputFile ? ' to ' + formData.outputFile : ''}`;
            case 'extract':
                return `extract ${formData.selector} from ${formData.url}${formData.outputFile ? ' to ' + formData.outputFile : ''}`;
            case 'crawl':
                return `crawl ${formData.url}${formData.depth ? ' depth ' + formData.depth : ''}${formData.outputFile ? ' to ' + formData.outputFile : ''}`;
            case 'analyze-web':
                return `analyze-web ${formData.url}`;
            default:
                throw new Error(`Unknown tool: ${tool}`);
        }
    }
}

// Initialize tools manager
if (window.app) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.app) {
                window.app.toolsManager = new ToolsManager(window.app);
                
                // Enhanced showToolModal method
                window.app.showToolModal = function(tool) {
                    const content = this.toolsManager.getToolModalContent(tool);
                    this.showModal(content);
                    
                    // Setup form handler
                    const form = document.getElementById('tool-form');
                    if (form) {
                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const formData = new FormData(form);
                            const data = Object.fromEntries(formData.entries());
                            await this.toolsManager.executeTool(tool, data);
                        });
                    }
                };
            }
        }, 100);
    });
}