class JobsPanel {
    constructor(app) {
        this.app = app;
        this.jobs = new Map();
        this.bind();
    }

    bind() {
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('refresh-jobs');
            if (btn) btn.addEventListener('click', () => this.loadJobs());
        });
        if (this.app.socket) {
            this.app.socket.on('job:update', (update) => this.onJobUpdate(update));
        }
    }

    async loadJobs() {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            this.renderJobs(data.jobs || []);
        } catch (e) {
            console.error('Failed to load jobs', e);
        }
    }

    onJobUpdate(update) {
        const existing = this.jobs.get(update.id) || { id: update.id };
        const merged = { ...existing, ...update };
        this.jobs.set(update.id, merged);
        this.renderJobs(Array.from(this.jobs.values()));
    }

    renderJobs(jobs) {
        const container = document.getElementById('jobs-list');
        if (!container) return;
        if (!jobs || jobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>No background jobs</h3>
                    <p>Run a tool chain as a job to see progress here.</n>
                </div>`;
            return;
        }
        container.innerHTML = jobs.map(j => this.renderJobCard(j)).join('');
    }

    renderJobCard(job) {
        const statusIcon = job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '⏳';
        const progress = job.progress ?? (job.status === 'completed' ? 100 : 0);
        const canCancel = job.status === 'running' || job.status === 'queued';
        const canRetry = job.status === 'failed';
        return `
            <div class="job-card" data-id="${job.id}">
                <div class="job-header">
                    <div class="job-title">${statusIcon} ${job.type} — ${job.id}</div>
                    <div class="job-status"><span class="status-badge ${job.status}">${job.status}</span></div>
                </div>
                <div class="job-meta">
                    <span>Created: ${job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}</span>
                    <span>Started: ${job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}</span>
                    <span>Completed: ${job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}</span>
                </div>
                <div class="job-progress">
                    <div class="progress-bar"><div class="progress" style="width:${progress}%"></div></div>
                </div>
                <div class="job-actions">
                    ${canCancel ? `<button class="btn-secondary" onclick="app.jobsPanel.cancelJob('${job.id}', this)">Cancel</button>` : ''}
                    ${canRetry ? `<button class="btn-primary" onclick="app.jobsPanel.retryJob('${job.id}', this)">Retry</button>` : ''}
                </div>
                ${job.error ? `<div class="job-error">${this.escape(job.error)}</div>` : ''}
                ${job.result ? `<pre class="job-result">${this.escape(JSON.stringify(job.result, null, 2))}</pre>` : ''}
            </div>
        `;
    }

    async cancelJob(id, btn) {
        try {
            btn.disabled = true; btn.textContent = 'Cancelling...';
            const res = await fetch(`/api/jobs/${id}/cancel`, { method: 'POST' });
            const data = await res.json();
            if (!data.success) {
                alert('Cancel failed');
                btn.disabled = false; btn.textContent = 'Cancel';
            }
        } catch (e) {
            alert('Cancel failed: ' + e.message);
            btn.disabled = false; btn.textContent = 'Cancel';
        }
    }

    async retryJob(id, btn) {
        try {
            btn.disabled = true; btn.textContent = 'Retrying...';
            const res = await fetch(`/api/jobs/${id}/retry`, { method: 'POST' });
            const data = await res.json();
            if (data.jobId) {
                if (this.app) this.app.switchView('jobs');
                await this.loadJobs();
            } else {
                alert('Retry failed: ' + (data.error || 'unknown'));
                btn.disabled = false; btn.textContent = 'Retry';
            }
        } catch (e) {
            alert('Retry failed: ' + e.message);
            btn.disabled = false; btn.textContent = 'Retry';
        }
    }

    escape(str) {
        const d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }
}

if (window.app) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.app.jobsPanel = new JobsPanel(window.app);
        }, 50);
    });
}
