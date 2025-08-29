// Chat functionality
class ChatManager {
    constructor(app) {
        this.app = app;
        this.currentStreamMessage = null;
        this.setupChatInput();
        this.setupStreamingHandlers();
    }

    setupChatInput() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');

        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            this.autoResizeTextarea(chatInput);
            this.updateSendButton();
        });

        // Handle Enter key
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button click
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Voice input button (placeholder)
        document.getElementById('voice-btn').addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // File attach button (placeholder)
        document.getElementById('attach-btn').addEventListener('click', () => {
            this.showFileAttach();
        });
    }

    setupStreamingHandlers() {
        // Wait for socket to be ready
        const setupSocketHandlers = () => {
            if (!this.app.socket) {
                console.log('Socket not ready, retrying...');
                setTimeout(setupSocketHandlers, 100);
                return;
            }

            console.log('Setting up socket handlers for chat...');

            // Remove existing handlers first
            this.app.socket.off('chat-response');
            this.app.socket.off('chat-stream-chunk');
            this.app.socket.off('chat-error');

            // Handle chat responses
            this.app.socket.on('chat-response', (data) => {
                console.log('Received chat response:', data);
                this.handleChatResponse(data);
            });

            // Handle streaming responses  
            this.app.socket.on('chat-stream-chunk', (data) => {
                console.log('Received stream chunk:', data);
                this.handleStreamChunk(data);
            });

            // Handle errors
            this.app.socket.on('chat-error', (data) => {
                console.log('Received chat error:', data);
                this.handleChatError(data);
            });

            console.log('Socket handlers setup complete');
        };

        setupSocketHandlers();
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateSendButton() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const hasText = chatInput.value.trim().length > 0;
        
        sendBtn.disabled = !hasText || this.app.isLoading;
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message || this.app.isLoading) return;

        // Clear input and disable send button
        chatInput.value = '';
        this.autoResizeTextarea(chatInput);
        this.updateSendButton();

        // Add user message to chat
        this.addMessage('user', message);

        // Check if this is a build command
        const buildCommand = this.parseBuildCommand(message);
        if (buildCommand) {
            await this.handleBuildCommand(buildCommand);
            return;
        }

        // Show loading
        this.app.showLoading(true);

        try {
            // Ensure we have a conversation
            if (!this.app.currentConversation) {
                await this.createQuickConversation();
            }

            // Send to server
            this.app.socket.emit('chat-message', {
                conversationId: this.app.currentConversation?.id,
                message: message,
                useMemory: this.app.memoryEnabled,
                streaming: this.shouldUseStreaming()
            });

        } catch (error) {
            console.error('Error sending message:', error);
            this.app.showError('Failed to send message');
            this.app.showLoading(false);
        }
    }

    async createQuickConversation() {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `Chat ${new Date().toLocaleDateString()}`,
                    context: 'Quick chat session'
                })
            });

            const result = await response.json();
            
            // Create a simple conversation object
            this.app.currentConversation = {
                id: result.id,
                name: `Chat ${new Date().toLocaleDateString()}`,
                messages: []
            };

            // Update conversations list
            await this.app.loadConversations();
            
        } catch (error) {
            console.error('Error creating quick conversation:', error);
        }
    }

    addMessage(role, content, timestamp = new Date(), isStreaming = false) {
        const messagesContainer = document.getElementById('chat-messages');
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        if (isStreaming) {
            messageDiv.classList.add('streaming');
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.formatMessageContent(content)}
            </div>
            <div class="message-time">${timestamp.toLocaleTimeString()}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Add to current conversation messages if exists (but not for streaming messages until complete)
        if (this.app.currentConversation && !isStreaming) {
            if (!this.app.currentConversation.messages) {
                this.app.currentConversation.messages = [];
            }
            this.app.currentConversation.messages.push({
                role,
                content,
                timestamp: timestamp.toISOString()
            });
        }

        return messageDiv; // Return the message element for streaming updates
    }

    formatMessageContent(content) {
        // Enhanced markdown-like formatting
        let formatted = content;

        // Code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<div class="code-block" data-lang="${lang || ''}">${this.escapeHtml(code.trim())}</div>`;
        });

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');

        // Bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Links (simple detection)
        formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    handleChatResponse(data) {
        this.app.showLoading(false);
        
        // Handle streaming completion
        if (this.currentStreamMessage) {
            this.finishStreamingMessage();
            return;
        }
        
        if (!data.result) {
            this.app.showError('No response received');
            return;
        }

        const result = data.result;
        let responseText = '';

        // Format response based on result type
        if (result.success === false) {
            responseText = `❌ Error: ${result.error}`;
        } else {
            // Different response types
            if (result.response) {
                responseText = result.response;
            } else if (result.explanation) {
                responseText = result.explanation;
            } else if (result.insights) {
                responseText = `🔍 **Analysis Complete**\n\n${result.insights}`;
            } else if (result.analysis) {
                responseText = this.formatAnalysisResult(result);
            } else if (result.data) {
                responseText = this.formatDataResult(result);
            } else if (result.message) {
                responseText = `✅ ${result.message}`;
            } else {
                responseText = '✅ Command executed successfully';
            }
        }

        // Add assistant message
        this.addMessage('assistant', responseText, new Date(data.timestamp));
        
        // Show cost estimate if available
        if (data.costEstimate) {
            this.showCostEstimate(data.costEstimate);
        }
        
        // Update send button state
        this.updateSendButton();
    }

    formatAnalysisResult(result) {
        let output = '📊 **Code Analysis Results**\n\n';
        
        if (result.filePath) {
            output += `**File:** ${result.filePath}\n\n`;
        }

        if (result.analysis) {
            const analysis = result.analysis;
            
            if (analysis.metrics) {
                output += '**Metrics:**\n';
                output += `- Lines of code: ${analysis.metrics.codeLines}\n`;
                output += `- Comments: ${analysis.metrics.commentLines}\n`;
                output += `- Functions: ${analysis.structure?.functions?.length || 0}\n`;
                output += `- Classes: ${analysis.structure?.classes?.length || 0}\n\n`;
            }

            if (analysis.issues && analysis.issues.length > 0) {
                output += '**Issues Found:**\n';
                analysis.issues.forEach(issue => {
                    output += `- ${issue.type}: ${issue.message}\n`;
                });
                output += '\n';
            }
        }

        if (result.insights) {
            output += '**AI Insights:**\n';
            output += result.insights;
        }

        return output;
    }

    formatDataResult(result) {
        let output = '';

        if (result.url) {
            output += `🌐 **Web Scraping Results**\n`;
            output += `**URL:** ${result.url}\n\n`;
        }

        if (result.data) {
            const data = result.data;
            
            if (data.title) {
                output += `**Title:** ${data.title}\n`;
            }
            
            if (data.description) {
                output += `**Description:** ${data.description}\n`;
            }
            
            if (data.wordCount) {
                output += `**Word Count:** ${data.wordCount}\n`;
            }
            
            if (data.linkCount) {
                output += `**Links:** ${data.linkCount}\n`;
            }
            
            if (data.imageCount) {
                output += `**Images:** ${data.imageCount}\n`;
            }
        }

        if (result.count !== undefined) {
            output += `\n**Results Found:** ${result.count}\n`;
        }

        if (result.savedTo) {
            output += `\n💾 **Saved to:** ${result.savedTo}`;
        }

        return output;
    }

    toggleVoiceInput() {
        // Voice input functionality (placeholder)
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.startVoiceRecognition();
        } else {
            this.app.showError('Speech recognition not supported in this browser');
        }
    }

    startVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const voiceBtn = document.getElementById('voice-btn');
        voiceBtn.style.color = 'red';
        voiceBtn.textContent = '🔴';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chat-input').value = transcript;
            this.updateSendButton();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.app.showError('Voice recognition failed');
        };

        recognition.onend = () => {
            voiceBtn.style.color = '';
            voiceBtn.textContent = '🎤';
        };

        recognition.start();
    }

    showFileAttach() {
        // File attachment functionality (placeholder)
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.txt,.js,.ts,.py,.json,.md,.html,.css';
        
        input.onchange = (event) => {
            const files = Array.from(event.target.files);
            this.handleFileAttachment(files);
        };
        
        input.click();
    }

    async handleFileAttachment(files) {
        for (const file of files) {
            if (file.size > 1024 * 1024) { // 1MB limit
                this.app.showError(`File ${file.name} is too large (max 1MB)`);
                continue;
            }

            try {
                const content = await this.readFileContent(file);
                const message = `📎 **Attached file: ${file.name}**\n\n\`\`\`\n${content}\n\`\`\``;
                
                this.addMessage('user', message);
                
                // Also send to AI for processing
                if (this.app.socket) {
                    this.app.socket.emit('chat-message', {
                        conversationId: this.app.currentConversation?.id,
                        message: `Please analyze this file: ${file.name}\n\n${content}`,
                        useMemory: this.app.memoryEnabled
                    });
                }
            } catch (error) {
                console.error('Error reading file:', error);
                this.app.showError(`Failed to read file ${file.name}`);
            }
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearChat() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = `
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

        if (this.app.currentConversation) {
            this.app.currentConversation.messages = [];
        }
    }

    // Export chat history
    exportChat() {
        if (!this.app.currentConversation || !this.app.currentConversation.messages) {
            this.app.showError('No chat history to export');
            return;
        }

        const messages = this.app.currentConversation.messages;
        const exportData = {
            conversation: this.app.currentConversation.name,
            exported: new Date().toISOString(),
            messages: messages
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${this.app.currentConversation.id}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // ChatGPT-specific methods
    setupStreamingHandlers() {
        if (!this.app.socket) return;

        // Handle streaming chunks
        this.app.socket.on('chat-stream-chunk', (data) => {
            this.handleStreamChunk(data);
        });
    }

    shouldUseStreaming() {
        // Enable streaming for OpenAI/ChatGPT if available
        if (this.app.currentProvider === 'openai') {
            const streamToggle = document.getElementById('stream-enabled');
            return streamToggle ? streamToggle.checked : true; // Default to enabled
        }
        return false;
    }

    handleStreamChunk(data) {
        const { chunk, accumulated } = data;
        
        // Create or update streaming message
        if (!this.currentStreamMessage) {
            this.currentStreamMessage = this.createStreamingMessage();
        }
        
        // Update the message content
        const contentElement = this.currentStreamMessage.querySelector('.message-content');
        if (contentElement) {
            contentElement.innerHTML = this.formatMessageContent(accumulated);
        }
        
        // Auto-scroll to bottom
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createStreamingMessage() {
        const messagesContainer = document.getElementById('chat-messages');
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant streaming';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">ChatGPT is thinking...</div>
            </div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        return messageDiv;
    }

    finishStreamingMessage() {
        if (this.currentStreamMessage) {
            this.currentStreamMessage.classList.remove('streaming');
            this.currentStreamMessage = null;
        }
    }

    async getChatGPTFunctions() {
        try {
            const response = await fetch('/api/chatgpt/functions/list');
            const data = await response.json();
            return data.functions || [];
        } catch (error) {
            console.error('Error fetching ChatGPT functions:', error);
            return [];
        }
    }

    async estimateCost(prompt, response = '') {
        try {
            const costResponse = await fetch('/api/chatgpt/estimate-cost', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, response })
            });
            
            if (costResponse.ok) {
                const costData = await costResponse.json();
                return costData;
            }
        } catch (error) {
            console.error('Error estimating cost:', error);
        }
        return null;
    }

    showCostEstimate(costInfo) {
        if (!costInfo) return;
        
        const costMessage = `💰 **Cost Estimate**
- Input tokens: ${costInfo.inputTokens}
- Output tokens: ${costInfo.outputTokens}  
- Total cost: $${costInfo.totalCost.toFixed(6)}
- Model: ${costInfo.model}`;
        
        this.addMessage('system', costMessage);
    }

    // Check if streaming should be used
    shouldUseStreaming() {
        // Enable streaming for OpenAI by default
        return true;
    }

    // Placeholder methods
    toggleVoiceInput() {
        this.app.showInfo('Voice input not yet implemented');
    }

    showFileAttach() {
        this.app.showInfo('File attachment not yet implemented');
    }

    // Scroll to bottom of chat
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Parse build commands from chat messages
    parseBuildCommand(message) {
        const lowerMessage = message.toLowerCase();
        
        // Direct build commands
        if (lowerMessage.startsWith('build ') || lowerMessage.startsWith('create ') || lowerMessage.startsWith('make ')) {
            return this.extractBuildDetails(message);
        }
        
        // Natural language build requests
        const buildPatterns = [
            /(?:build|create|make|generate)\s+(?:a|an)?\s*(.*?)(?:\s+(?:app|application|project|website|site))/i,
            /i want to (?:build|create|make)\s+(.*)/i,
            /can you (?:build|create|make)\s+(.*)/i,
            /help me (?:build|create|make)\s+(.*)/i,
        ];
        
        for (const pattern of buildPatterns) {
            const match = message.match(pattern);
            if (match) {
                return this.extractBuildDetails(message, match[1]);
            }
        }
        
        return null;
    }
    
    extractBuildDetails(message, extracted = null) {
        const lowerMessage = message.toLowerCase();
        
        // Try to identify template from keywords
        const templateMap = {
            'react': 'react-app',
            'frontend': 'react-app',
            'web app': 'fullstack-app',
            'full stack': 'fullstack-app',
            'api': 'rest-api',
            'rest': 'rest-api',
            'backend': 'rest-api',
            'ecommerce': 'ecommerce',
            'store': 'ecommerce',
            'shop': 'ecommerce',
            'chat': 'chat-app',
            'messaging': 'chat-app',
            'saas': 'saas-platform',
            'platform': 'saas-platform',
            'mobile': 'mobile-app',
            'ios': 'mobile-app',
            'android': 'mobile-app',
            'ai': 'ai-ml-platform',
            'ml': 'ai-ml-platform',
            'machine learning': 'ai-ml-platform',
            'blockchain': 'blockchain-web3',
            'web3': 'blockchain-web3',
            'crypto': 'blockchain-web3',
            'devops': 'devops-platform',
            'iot': 'iot-platform',
            'microservice': 'microservices'
        };
        
        let template = 'custom';
        let projectName = extracted || 'My Project';
        
        // Find matching template
        for (const [keyword, templateName] of Object.entries(templateMap)) {
            if (lowerMessage.includes(keyword)) {
                template = templateName;
                break;
            }
        }
        
        // Extract project name from common patterns
        const namePatterns = [
            /(?:called|named)\s+"([^"]+)"/i,
            /(?:called|named)\s+([a-zA-Z0-9\s\-_]+)/i,
            /"([^"]+)"\s*(?:app|project|website|site)/i,
        ];
        
        for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match) {
                projectName = match[1].trim();
                break;
            }
        }
        
        // Clean up project name
        projectName = projectName.replace(/\b(?:app|application|project|website|site)\b/gi, '').trim();
        if (!projectName || projectName.length < 2) {
            projectName = 'My Project';
        }
        
        return {
            template,
            projectName,
            description: extracted || projectName,
            originalMessage: message
        };
    }
    
    async handleBuildCommand(buildCommand) {
        try {
            this.addMessage('assistant', `🏗️ I'll help you build a **${buildCommand.projectName}** using the **${buildCommand.template}** template! Let me start the build process...`);
            
            // Show that we're switching to builder
            this.app.showLoading(true);
            
            // Prepare build request
            const buildRequest = {
                template: buildCommand.template,
                projectName: buildCommand.projectName,
                config: {
                    description: buildCommand.description,
                    type: this.inferProjectType(buildCommand.template),
                    features: this.inferFeatures(buildCommand.template, buildCommand.originalMessage),
                    techStack: 'modern',
                    deploymentTarget: 'local',
                    aiProvider: 'openai',
                    codeStyle: 'standard',
                    explainMode: true
                }
            };
            
            // Call the enhanced build API
            const response = await fetch('/api/build-project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(buildRequest)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addMessage('assistant', `✅ **Build completed successfully!**\n\n**Project:** ${result.projectName}\n**Build ID:** ${result.buildId}\n**Duration:** ${Math.round(result.duration / 1000)}s\n**Files Generated:** ${result.metrics?.filesGenerated || 'Multiple'}\n\n🚀 **Next Steps:**\n1. Navigate to your project: \`cd ${result.projectName.toLowerCase().replace(/\\s+/g, '-')}\`\n2. Install dependencies: \`npm install\`\n3. Start development: \`npm start\` or \`npm run dev\`\n\nYour project is ready to use!`);
                
                // Suggest switching to files view
                setTimeout(() => {
                    this.addMessage('assistant', '💡 **Tip:** Click on the 📁 Files tab in the sidebar to explore your newly created project files!');
                }, 2000);
                
            } else {
                let errorMessage = `❌ **Build failed:** ${result.error}\n\n**Phase:** ${result.phase}`;
                
                if (result.suggestions && result.suggestions.length > 0) {
                    errorMessage += `\n\n**Suggestions:**\n${result.suggestions.map(s => `• ${s}`).join('\n')}`;
                }
                
                if (result.recoverable) {
                    errorMessage += '\n\n💡 This error might be recoverable. You can try building again or use a simpler template.';
                }
                
                this.addMessage('assistant', errorMessage);
            }
            
        } catch (error) {
            console.error('Build command failed:', error);
            this.addMessage('assistant', `❌ **Build failed:** ${error.message}\n\nYou can also try using the Project Builder interface in the 🏗️ tab for more detailed configuration.`);
        } finally {
            this.app.showLoading(false);
        }
    }
    
    inferProjectType(template) {
        const typeMap = {
            'react-app': 'frontend',
            'rest-api': 'api',
            'mobile-app': 'mobile',
            'microservices': 'api'
        };
        return typeMap[template] || 'webapp';
    }
    
    inferFeatures(template, message) {
        const features = [];
        const lowerMessage = message.toLowerCase();
        
        // Template-specific features
        const templateFeatures = {
            'fullstack-app': ['auth', 'database', 'api'],
            'rest-api': ['auth', 'database', 'testing'],
            'ecommerce': ['auth', 'database', 'payments', 'api'],
            'chat-app': ['auth', 'database', 'realtime', 'api'],
            'saas-platform': ['auth', 'database', 'payments', 'api', 'testing', 'ci-cd'],
            'ai-ml-platform': ['database', 'api', 'testing', 'docker'],
            'blockchain-web3': ['auth', 'database', 'api', 'testing'],
            'devops-platform': ['auth', 'database', 'api', 'docker', 'ci-cd'],
            'iot-platform': ['auth', 'database', 'api', 'realtime', 'docker'],
            'microservices': ['database', 'api', 'testing', 'docker', 'ci-cd']
        };
        
        features.push(...(templateFeatures[template] || []));
        
        // Infer additional features from message
        if (lowerMessage.includes('auth') || lowerMessage.includes('login') || lowerMessage.includes('user')) {
            features.push('auth');
        }
        if (lowerMessage.includes('database') || lowerMessage.includes('data') || lowerMessage.includes('store')) {
            features.push('database');
        }
        if (lowerMessage.includes('payment') || lowerMessage.includes('stripe') || lowerMessage.includes('billing')) {
            features.push('payments');
        }
        if (lowerMessage.includes('realtime') || lowerMessage.includes('live') || lowerMessage.includes('socket')) {
            features.push('realtime');
        }
        if (lowerMessage.includes('test') || lowerMessage.includes('testing')) {
            features.push('testing');
        }
        if (lowerMessage.includes('docker') || lowerMessage.includes('container')) {
            features.push('docker');
        }
        
        return [...new Set(features)]; // Remove duplicates
    }

    // Handle chat error from server
    handleChatError(data) {
        console.error('Chat error received:', data);
        this.app.showLoading(false);
        
        if (this.currentStreamMessage) {
            this.finishStreamingMessage();
        }
        
        const errorMsg = data.error || data.message || 'Communication error occurred';
        this.addMessage('system', `❌ Error: ${errorMsg}`);
    }
}

// Extend the main app with chat response handling
if (window.app) {
    window.app.handleChatResponse = function(data) {
        if (this.chatManager) {
            this.chatManager.handleChatResponse(data);
        }
    };
    
    // Initialize chat manager when app is ready
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.app) {
                window.app.chatManager = new ChatManager(window.app);
            }
        }, 100);
    });
}