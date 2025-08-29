// File management functionality
class FilesManager {
    constructor(app) {
        this.app = app;
        this.currentPath = '.';
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFileControls();
            
            // Load files when switching to files view
            document.addEventListener('viewChanged', (e) => {
                if (e.detail.view === 'files') {
                    this.loadFileTree();
                }
            });
        });
    }

    setupFileControls() {
        const refreshBtn = document.getElementById('refresh-files');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadFileTree();
            });
        }
        const newBtn = document.getElementById('new-file');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.showCreateFile());
        }
        const delBtn = document.getElementById('delete-file');
        if (delBtn) {
            delBtn.addEventListener('click', () => this.deleteSelectedFile());
        }
        const renBtn = document.getElementById('rename-file');
        if (renBtn) {
            renBtn.addEventListener('click', () => this.showRenameFile());
        }
    }

    showCreateFile() {
        const modal = `
            <div class="file-create-modal">
                <div class="modal-header"><span class="modal-icon">🆕</span><h2>New File</h2></div>
                <div class="form-group">
                    <label>Path</label>
                    <input id="new-file-path" type="text" value="${this.currentPath.replace(/\.$/, '')}${this.currentPath !== '.' ? '/' : ''}" placeholder="e.g., src/new-file.js" />
                </div>
                <div class="form-group">
                    <label>Initial Content (optional)</label>
                    <textarea id="new-file-content" rows="10" class="code-textarea"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="btn-create-file">Create</button>
                    <button class="btn-secondary" onclick="app.hideModal()">Cancel</button>
                </div>
            </div>`;
        this.app.showModal(modal);
        const btn = document.getElementById('btn-create-file');
        btn?.addEventListener('click', async () => {
            const path = document.getElementById('new-file-path').value.trim();
            const content = document.getElementById('new-file-content').value;
            if (!path) { alert('Please enter a file path'); return; }
            btn.disabled = true; btn.textContent = 'Creating...';
            try {
                const res = await fetch('/api/file', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, content })
                });
                const data = await res.json();
                if (data.success) {
                    this.app.hideModal();
                    this.loadFileTree(this.currentPath);
                    this.loadFileContent(path);
                } else {
                    alert('Create failed: ' + (data.error || 'unknown'));
                    btn.disabled = false; btn.textContent = 'Create';
                }
            } catch (e) {
                alert('Create failed: ' + e.message);
                btn.disabled = false; btn.textContent = 'Create';
            }
        });
    }

    async deleteSelectedFile() {
        if (!this.selectedPath) { alert('Select a file to delete'); return; }
        if (!confirm(`Delete ${this.selectedPath}?`)) return;
        try {
            const res = await fetch('/api/file/delete', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: this.selectedPath })
            });
            const data = await res.json();
            if (data.success) {
                this.selectedPath = null;
                this.loadFileTree(this.currentPath);
                const viewer = document.getElementById('file-viewer');
                if (viewer) viewer.innerHTML = '<div class="no-file-selected"><p>Select a file to view its contents</p></div>';
            } else {
                alert('Delete failed: ' + (data.error || 'unknown'));
            }
        } catch (e) {
            alert('Delete failed: ' + e.message);
        }
    }

    showRenameFile() {
        if (!this.selectedPath) { alert('Select a file to rename'); return; }
        const modal = `
            <div class="file-rename-modal">
                <div class="modal-header"><span class="modal-icon">✏️</span><h2>Rename File</h2></div>
                <div class="form-group">
                    <label>Current Path</label>
                    <input type="text" value="${this.selectedPath}" disabled />
                </div>
                <div class="form-group">
                    <label>New Path</label>
                    <input id="rename-file-to" type="text" value="${this.selectedPath}" />
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="btn-rename-file">Rename</button>
                    <button class="btn-secondary" onclick="app.hideModal()">Cancel</button>
                </div>
            </div>`;
        this.app.showModal(modal);
        const btn = document.getElementById('btn-rename-file');
        btn?.addEventListener('click', async () => {
            const to = document.getElementById('rename-file-to').value.trim();
            if (!to) { alert('Enter new path'); return; }
            btn.disabled = true; btn.textContent = 'Renaming...';
            try {
                const res = await fetch('/api/file/move', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ from: this.selectedPath, to })
                });
                const data = await res.json();
                if (data.success) {
                    this.app.hideModal();
                    this.loadFileTree(this.currentPath);
                    this.loadFileContent(to);
                } else {
                    alert('Rename failed: ' + (data.error || 'unknown'));
                    btn.disabled = false; btn.textContent = 'Rename';
                }
            } catch (e) {
                alert('Rename failed: ' + e.message);
                btn.disabled = false; btn.textContent = 'Rename';
            }
        });
    }

    loadFileTree(path = '.') {
        this.currentPath = path;
        this.updateCurrentPath(path);
        
        if (this.app.socket) {
            this.app.socket.emit('list-files', { path: path });
        }
    }

    updateCurrentPath(path) {
        const pathElement = document.getElementById('current-path');
        if (pathElement) {
            pathElement.textContent = path;
        }
    }

    renderFileTree(files) {
        const container = document.getElementById('file-tree');
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        // Add parent directory if not at root
        if (this.currentPath !== '.' && this.currentPath !== '/') {
            const parentDir = this.getParentDirectory(this.currentPath);
            const parentItem = this.createFileItem('..', true, parentDir);
            container.appendChild(parentItem);
        }

        // Add files and directories
        files.forEach(file => {
            const isDirectory = file.endsWith('/');
            const displayName = isDirectory ? file.slice(0, -1) : file;
            const fullPath = this.joinPath(this.currentPath, displayName);
            
            const item = this.createFileItem(displayName, isDirectory, fullPath);
            container.appendChild(item);
        });
    }

    createFileItem(name, isDirectory, fullPath) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.setAttribute('data-path', fullPath);
        
        const icon = isDirectory ? '📁' : this.getFileIcon(name);
        
        item.innerHTML = `
            <span class="file-icon">${icon}</span>
            <span class="file-name">${name}</span>
            <div class="file-actions">
                ${isDirectory ? '' : `
                    <button class="file-action-btn" onclick="app.filesManager.editFile('${fullPath}')" title="Edit">✏️</button>
                    <button class="file-action-btn" onclick="app.filesManager.analyzeFile('${fullPath}')" title="Analyze">🔍</button>
                `}
            </div>
        `;

        // Add click handler
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.file-action-btn')) {
                if (isDirectory) {
                    this.loadFileTree(fullPath);
                } else {
                    this.loadFileContent(fullPath);
                }
            }
        });

        // Add double-click handler for files
        if (!isDirectory) {
            item.addEventListener('dblclick', () => {
                this.editFile(fullPath);
            });
        }

        return item;
    }

    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const icons = {
            'js': '🟨',
            'ts': '🔷',
            'jsx': '⚛️',
            'tsx': '⚛️',
            'html': '🌐',
            'css': '🎨',
            'json': '📄',
            'md': '📝',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'go': '🐹',
            'rs': '🦀',
            'php': '🐘',
            'rb': '💎',
            'vue': '💚',
            'xml': '📄',
            'yaml': '📄',
            'yml': '📄',
            'txt': '📃',
            'log': '📜',
            'env': '🔐',
            'git': '🌲',
            'png': '🖼️',
            'jpg': '🖼️',
            'gif': '🖼️',
            'svg': '🖼️',
            'pdf': '📕',
            'zip': '📦',
            'tar': '📦',
            'gz': '📦'
        };
        
        return icons[extension] || '📄';
    }

    joinPath(base, name) {
        if (name === '..') {
            return this.getParentDirectory(base);
        }
        
        if (base === '.') {
            return name;
        }
        
        return `${base}/${name}`;
    }

    getParentDirectory(path) {
        if (path === '.' || path === '/') {
            return '.';
        }
        
        const parts = path.split('/');
        parts.pop();
        
        return parts.length === 0 ? '.' : parts.join('/');
    }

    loadFileContent(path) {
        if (this.app.socket) {
            this.app.socket.emit('read-file', { path: path });
        }
        
        // Update UI to show loading
        this.showFileLoading(path);
    }

    showFileLoading(path) {
        const viewer = document.getElementById('file-viewer');
        if (viewer) {
            viewer.innerHTML = `
                <div class="file-loading">
                    <div class="file-header">
                        <h4>Loading ${path}...</h4>
                    </div>
                    <div class="loading-spinner">⏳</div>
                </div>
            `;
        }
    }

    renderFileContent(path, content) {
        const viewer = document.getElementById('file-viewer');
        if (!viewer) return;

        this.selectedPath = path;

        const language = this.detectLanguage(path);
        const lineCount = content.split('\n').length;
        const fileSize = new Blob([content]).size;

        viewer.innerHTML = `
            <div class="file-content-container">
                <div class="file-header">
                    <div class="file-info">
                        <h4>${path}</h4>
                        <div class="file-meta">
                            <span class="file-lines">📄 ${lineCount} lines</span>
                            <span class="file-size">💾 ${this.formatFileSize(fileSize)}</span>
                            <span class="file-language">🏷️ ${language}</span>
                        </div>
                    </div>
                    <div class="file-actions-header">
                        <button class="btn-secondary" onclick="app.filesManager.editFile('${path}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-secondary" onclick="app.filesManager.analyzeFile('${path}')">
                            🔍 Analyze
                        </button>
                        <button class="btn-secondary" onclick="app.filesManager.openInEditor('${path}')">
                            🖥️ Open in Editor
                        </button>
                        <button class="btn-secondary" onclick="app.filesManager.downloadFile('${path}')">
                            ⬇️ Download
                        </button>
                    </div>
                </div>
                <div class="code-block file-content-block">
                    <pre><code class="language-${language}">${this.escapeHtml(content)}</code></pre>
                </div>
            </div>
        `;

        // Add line numbers
        this.addLineNumbers();

        // Syntax highlight
        if (window.Prism) {
            try { Prism.highlightAllUnder(viewer); } catch (e) {}
        }
    }

    async openInEditor(path) {
        try {
            await fetch('/api/file/open', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
        } catch (e) {
            alert('Unable to open in editor: ' + e.message);
        }
    }

    addLineNumbers() {
        const codeBlock = document.querySelector('.file-content-block pre');
        if (!codeBlock) return;

        const lines = codeBlock.textContent.split('\n');
        const lineNumbers = lines.map((_, index) => 
            `<span class="line-number">${index + 1}</span>`
        ).join('\n');

        codeBlock.innerHTML = `
            <div class="code-with-numbers">
                <div class="line-numbers">${lineNumbers}</div>
                <div class="code-content"><code>${this.escapeHtml(codeBlock.textContent)}</code></div>
            </div>
        `;
    }

    detectLanguage(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sh': 'bash',
            'sql': 'sql',
            'vue': 'vue',
            'svelte': 'svelte'
        };
        
        return languageMap[extension] || 'text';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async editFile(path) {
        try {
            const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
            const content = await res.text();
            this.showEditModal(path, content);
        } catch (e) {
            alert('Failed to load file: ' + e.message);
        }
    }

    showEditModal(path, content) {
        const modalContent = `
            <div class="file-edit-modal">
                <div class="modal-header">
                    <span class="modal-icon">✏️</span>
                    <h2>Edit File: ${path}</h2>
                </div>
                <div class="form-group">
                    <textarea id="file-edit-text" rows="18" class="code-textarea">${this.escapeHtml(content || '')}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="btn-save-file">💾 Save</button>
                    <button class="btn-secondary" onclick="app.filesManager.modifyWithAI('${path}')">🤖 Modify with AI</button>
                    <button class="btn-secondary" onclick="app.hideModal()">Close</button>
                </div>
            </div>
        `;
        this.app.showModal(modalContent);
        const saveBtn = document.getElementById('btn-save-file');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const newContent = document.getElementById('file-edit-text').value;
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
                try {
                    const res = await fetch('/api/file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, content: newContent })
                    });
                    const data = await res.json();
                    if (data.success) {
                        this.app.hideModal();
                        this.loadFileContent(path);
                    } else {
                        alert('Failed to save: ' + (data.error || 'unknown'));
                        saveBtn.disabled = false;
                        saveBtn.textContent = '💾 Save';
                    }
                } catch (e) {
                    alert('Failed to save: ' + e.message);
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Save';
                }
            });
        }
    }

    modifyWithAI(path) {
        this.app.hideModal();
        // Switch to tools view and trigger modify tool
        this.app.switchView('tools');
        setTimeout(() => {
            this.app.showToolModal('modify');
            // Pre-fill the file path
            setTimeout(() => {
                const targetField = document.getElementById('target');
                if (targetField) {
                    targetField.value = path;
                }
            }, 100);
        }, 100);
    }

    analyzeFile(path) {
        // Send analyze command via chat
        const command = `analyze ${path}`;
        
        // Switch to chat view
        this.app.switchView('chat');
        
        // Send the command
        if (this.app.socket) {
            this.app.socket.emit('chat-message', {
                message: command,
                useMemory: this.app.memoryEnabled
            });
        }
    }

    downloadFile(path) {
        // Create a download link for the file content
        const viewer = document.getElementById('file-viewer');
        const codeElement = viewer.querySelector('code');
        
        if (codeElement) {
            const content = codeElement.textContent;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = path.split('/').pop();
            a.click();
            
            URL.revokeObjectURL(url);
        }
    }

    handleFileError(error) {
        const viewer = document.getElementById('file-viewer');
        if (viewer) {
            viewer.innerHTML = `
                <div class="file-error">
                    <div class="error-icon">❌</div>
                    <h3>Error loading file</h3>
                    <p>${error}</p>
                    <button class="btn-secondary" onclick="app.filesManager.loadFileTree()">
                        ↻ Refresh File Tree
                    </button>
                </div>
            `;
        }
    }
}

// Initialize files manager and extend app functionality
if (window.app) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.app) {
                window.app.filesManager = new FilesManager(window.app);

                // Override the existing file handling methods in app.js
                window.app.handleFilesListed = function(data) {
                    this.filesManager.renderFileTree(data.files);
                };

                window.app.handleFileContent = function(data) {
                    this.filesManager.renderFileContent(data.path, data.content);
                };

                window.app.handleFileError = function(data) {
                    this.filesManager.handleFileError(data.error);
                };

                window.app.loadFileTree = function() {
                    this.filesManager.loadFileTree();
                };
            }
        }, 100);
    });
}
