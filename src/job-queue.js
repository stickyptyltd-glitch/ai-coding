// Enhanced Job Queue System with persistence, retry logic, and priority handling
// Provides reliable job processing with failure recovery and monitoring

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from './logger.js';

/**
 * Job priority levels
 */
export const JOB_PRIORITY = {
  CRITICAL: 1,    // System critical tasks
  HIGH: 2,        // User-facing operations  
  NORMAL: 3,      // Standard operations
  LOW: 4,         // Background tasks
  BULK: 5         // Batch operations
};

/**
 * Job status enumeration
 */
export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRY_PENDING: 'retry_pending'
};

/**
 * Persistent and reliable job queue with advanced retry mechanisms
 */
export class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      name: options.name || 'default',
      concurrency: options.concurrency || 5,
      persistenceDir: options.persistenceDir || './data/jobs',
      maxRetries: options.maxRetries || 3,
      retryBackoff: options.retryBackoff || 'exponential', // 'exponential', 'linear', 'fixed'
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 60000,
      jobTimeout: options.jobTimeout || 300000, // 5 minutes
      cleanupInterval: options.cleanupInterval || 3600000, // 1 hour
      maxJobHistory: options.maxJobHistory || 10000,
      ...options
    };
    
    this.jobs = new Map();
    this.activeJobs = new Set();
    this.jobHandlers = new Map();
    this.logger = new Logger(`JobQueue:${this.options.name}`);
    this.metrics = {
      processed: 0,
      failed: 0,
      retried: 0,
      cancelled: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
    
    this.isShuttingDown = false;
    this.initialized = false;
    
    // Start background tasks
    this._startCleanupTimer();
    this._startJobProcessor();
  }
  
  /**
   * Initialize the job queue with persistence
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this._ensurePersistenceDir();
      await this._loadJobsFromDisk();
      this.initialized = true;
      
      this.logger.info('Job queue initialized', {
        name: this.options.name,
        concurrency: this.options.concurrency,
        loadedJobs: this.jobs.size
      });
      
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize job queue', error);
      throw error;
    }
  }
  
  /**
   * Register a job handler function
   */
  registerHandler(jobType, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Job handler must be a function');
    }
    
    this.jobHandlers.set(jobType, {
      handler,
      timeout: options.timeout || this.options.jobTimeout,
      maxRetries: options.maxRetries ?? this.options.maxRetries,
      retryBackoff: options.retryBackoff || this.options.retryBackoff,
      priority: options.priority || JOB_PRIORITY.NORMAL
    });
    
    this.logger.info('Registered job handler', { jobType, options });
  }
  
  /**
   * Add a new job to the queue
   */
  async addJob(type, data, options = {}) {
    const jobId = options.id || uuidv4();
    const now = new Date();
    
    const job = {
      id: jobId,
      type,
      data,
      status: JOB_STATUS.PENDING,
      priority: options.priority || JOB_PRIORITY.NORMAL,
      maxRetries: options.maxRetries ?? this.options.maxRetries,
      retryCount: 0,
      retryBackoff: options.retryBackoff || this.options.retryBackoff,
      delay: options.delay || 0,
      timeout: options.timeout || this.options.jobTimeout,
      
      // Timestamps
      createdAt: now,
      scheduledFor: options.delay ? new Date(now.getTime() + options.delay) : now,
      startedAt: null,
      completedAt: null,
      
      // Results
      result: null,
      error: null,
      
      // Metadata
      tags: options.tags || [],
      metadata: options.metadata || {},
      
      // Progress tracking
      progress: 0,
      progressMessage: null,
      
      // Dependencies
      dependsOn: options.dependsOn || [],
      
      // Cancellation
      cancelled: false,
      cancellationReason: null
    };
    
    this.jobs.set(jobId, job);
    await this._persistJob(job);
    
    this.logger.info('Job added to queue', {
      id: jobId,
      type,
      priority: job.priority,
      delay: options.delay,
      queueSize: this.jobs.size
    });
    
    this.emit('job:added', job);
    return jobId;
  }
  
  /**
   * Get job by ID
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }
  
  /**
   * Get jobs by status
   */
  getJobsByStatus(status) {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }
  
  /**
   * Get jobs by type
   */
  getJobsByType(type) {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }
  
  /**
   * Cancel a job
   */
  async cancelJob(jobId, reason = 'Manual cancellation') {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    if ([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED].includes(job.status)) {
      throw new Error(`Job ${jobId} cannot be cancelled (status: ${job.status})`);
    }
    
    job.cancelled = true;
    job.cancellationReason = reason;
    job.status = JOB_STATUS.CANCELLED;
    job.completedAt = new Date();
    
    await this._persistJob(job);
    this.metrics.cancelled++;
    
    this.logger.info('Job cancelled', { id: jobId, reason });
    this.emit('job:cancelled', job);
    
    return job;
  }
  
  /**
   * Retry a failed job
   */
  async retryJob(jobId, resetRetryCount = false) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    if (job.status !== JOB_STATUS.FAILED) {
      throw new Error(`Job ${jobId} cannot be retried (status: ${job.status})`);
    }
    
    if (resetRetryCount) {
      job.retryCount = 0;
    }
    
    job.status = JOB_STATUS.PENDING;
    job.error = null;
    job.startedAt = null;
    job.completedAt = null;
    job.progress = 0;
    job.progressMessage = null;
    
    await this._persistJob(job);
    
    this.logger.info('Job manually retried', { id: jobId, retryCount: job.retryCount });
    this.emit('job:retried', job);
    
    return job;
  }
  
  /**
   * Update job progress
   */
  async updateJobProgress(jobId, progress, message = null) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.progress = Math.max(0, Math.min(100, progress));
    if (message) job.progressMessage = message;
    
    await this._persistJob(job);
    this.emit('job:progress', { id: jobId, progress, message });
  }
  
  /**
   * Get queue statistics
   */
  getStatistics() {
    const statusCounts = {};
    let oldestPending = null;
    let newestCompleted = null;
    
    for (const job of this.jobs.values()) {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      
      if (job.status === JOB_STATUS.PENDING && (!oldestPending || job.createdAt < oldestPending)) {
        oldestPending = job.createdAt;
      }
      
      if (job.status === JOB_STATUS.COMPLETED && (!newestCompleted || job.completedAt > newestCompleted)) {
        newestCompleted = job.completedAt;
      }
    }
    
    return {
      name: this.options.name,
      totalJobs: this.jobs.size,
      activeJobs: this.activeJobs.size,
      statusCounts,
      metrics: { ...this.metrics },
      oldestPendingJob: oldestPending,
      lastCompletedJob: newestCompleted,
      handlers: Array.from(this.jobHandlers.keys()),
      options: {
        concurrency: this.options.concurrency,
        maxRetries: this.options.maxRetries,
        jobTimeout: this.options.jobTimeout
      }
    };
  }
  
  /**
   * Clear completed jobs older than specified age
   */
  async cleanupOldJobs(maxAge = 86400000) { // 24 hours default
    const cutoff = new Date(Date.now() - maxAge);
    const toDelete = [];
    
    for (const [id, job] of this.jobs) {
      if ([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED].includes(job.status) && 
          job.completedAt && job.completedAt < cutoff) {
        toDelete.push(id);
      }
    }
    
    for (const id of toDelete) {
      this.jobs.delete(id);
      await this._deleteJobFile(id);
    }
    
    if (toDelete.length > 0) {
      this.logger.info('Cleaned up old jobs', { count: toDelete.length });
    }
    
    return toDelete.length;
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(timeout = 30000) {
    this.logger.info('Shutting down job queue', { activeJobs: this.activeJobs.size });
    this.isShuttingDown = true;
    
    // Stop accepting new jobs
    this.emit('shutdown:started');
    
    // Wait for active jobs to complete or timeout
    const startTime = Date.now();
    while (this.activeJobs.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force cancel remaining jobs if timeout
    if (this.activeJobs.size > 0) {
      this.logger.warn('Force cancelling active jobs due to shutdown timeout', {
        remainingJobs: this.activeJobs.size
      });
      
      for (const jobId of this.activeJobs) {
        await this.cancelJob(jobId, 'Shutdown timeout');
      }
    }
    
    this.logger.info('Job queue shutdown complete');
    this.emit('shutdown:complete');
  }
  
  // Private methods
  
  async _ensurePersistenceDir() {
    try {
      await fs.mkdir(this.options.persistenceDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create persistence directory', error);
      throw error;
    }
  }
  
  async _loadJobsFromDisk() {
    try {
      const files = await fs.readdir(this.options.persistenceDir);
      const jobFiles = files.filter(f => f.endsWith('.job.json'));
      
      for (const file of jobFiles) {
        try {
          const filePath = path.join(this.options.persistenceDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const job = JSON.parse(data);
          
          // Restore Date objects
          job.createdAt = new Date(job.createdAt);
          job.scheduledFor = new Date(job.scheduledFor);
          if (job.startedAt) job.startedAt = new Date(job.startedAt);
          if (job.completedAt) job.completedAt = new Date(job.completedAt);
          
          // Reset running jobs to pending on startup
          if (job.status === JOB_STATUS.RUNNING) {
            job.status = JOB_STATUS.PENDING;
            job.startedAt = null;
          }
          
          this.jobs.set(job.id, job);
        } catch (error) {
          this.logger.warn('Failed to load job file', { file, error: error.message });
        }
      }
      
      this.logger.info('Loaded jobs from disk', { count: this.jobs.size });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error('Failed to load jobs from disk', error);
        throw error;
      }
    }
  }
  
  async _persistJob(job) {
    if (!this.initialized) return;
    
    try {
      const filePath = path.join(this.options.persistenceDir, `${job.id}.job.json`);
      await fs.writeFile(filePath, JSON.stringify(job, null, 2));
    } catch (error) {
      this.logger.error('Failed to persist job', { id: job.id, error });
    }
  }
  
  async _deleteJobFile(jobId) {
    try {
      const filePath = path.join(this.options.persistenceDir, `${jobId}.job.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore file not found errors
      if (error.code !== 'ENOENT') {
        this.logger.warn('Failed to delete job file', { id: jobId, error: error.message });
      }
    }
  }
  
  _startJobProcessor() {
    setInterval(async () => {
      if (this.isShuttingDown || this.activeJobs.size >= this.options.concurrency) {
        return;
      }
      
      await this._processNextJob();
    }, 100); // Check every 100ms
  }
  
  async _processNextJob() {
    // Find the next job to process
    const eligibleJobs = Array.from(this.jobs.values())
      .filter(job => {
        return job.status === JOB_STATUS.PENDING &&
               !job.cancelled &&
               job.scheduledFor <= new Date() &&
               this._areDependenciesMet(job) &&
               this.jobHandlers.has(job.type);
      })
      .sort((a, b) => {
        // Sort by priority (lower number = higher priority), then by creation time
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.createdAt - b.createdAt;
      });
    
    const job = eligibleJobs[0];
    if (!job) return;
    
    await this._executeJob(job);
  }
  
  _areDependenciesMet(job) {
    if (!job.dependsOn || job.dependsOn.length === 0) {
      return true;
    }
    
    return job.dependsOn.every(depId => {
      const depJob = this.jobs.get(depId);
      return depJob && depJob.status === JOB_STATUS.COMPLETED;
    });
  }
  
  async _executeJob(job) {
    if (this.activeJobs.has(job.id)) return;
    
    this.activeJobs.add(job.id);
    job.status = JOB_STATUS.RUNNING;
    job.startedAt = new Date();
    
    await this._persistJob(job);
    this.emit('job:started', job);
    
    const handlerConfig = this.jobHandlers.get(job.type);
    const startTime = Date.now();
    
    try {
      // Create cancellation context
      const context = {
        jobId: job.id,
        updateProgress: (progress, message) => this.updateJobProgress(job.id, progress, message),
        isCancelled: () => job.cancelled,
        logger: this.logger.child({ jobId: job.id, jobType: job.type })
      };
      
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Job timeout after ${handlerConfig.timeout}ms`)), handlerConfig.timeout)
      );
      
      const result = await Promise.race([
        handlerConfig.handler(job.data, context),
        timeoutPromise
      ]);
      
      // Job completed successfully
      const duration = Date.now() - startTime;
      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date();
      job.result = result;
      job.progress = 100;
      
      this.metrics.processed++;
      this.metrics.totalProcessingTime += duration;
      this.metrics.avgProcessingTime = this.metrics.totalProcessingTime / this.metrics.processed;
      
      await this._persistJob(job);
      this.emit('job:completed', job);
      
      this.logger.info('Job completed successfully', {
        id: job.id,
        type: job.type,
        duration,
        retries: job.retryCount
      });
      
    } catch (error) {
      await this._handleJobFailure(job, error);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }
  
  async _handleJobFailure(job, error) {
    job.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    const handlerConfig = this.jobHandlers.get(job.type);
    const maxRetries = handlerConfig?.maxRetries ?? job.maxRetries;
    
    if (job.retryCount < maxRetries && !job.cancelled) {
      // Schedule retry
      job.retryCount++;
      job.status = JOB_STATUS.RETRY_PENDING;
      
      const delay = this._calculateRetryDelay(job.retryCount, job.retryBackoff);
      job.scheduledFor = new Date(Date.now() + delay);
      job.startedAt = null;
      
      this.metrics.retried++;
      
      await this._persistJob(job);
      this.emit('job:retry_scheduled', job);
      
      this.logger.warn('Job failed, retry scheduled', {
        id: job.id,
        type: job.type,
        retryCount: job.retryCount,
        maxRetries,
        delay,
        error: error.message
      });
      
      // Change status back to pending after delay calculation
      setTimeout(async () => {
        if (job.status === JOB_STATUS.RETRY_PENDING && !job.cancelled) {
          job.status = JOB_STATUS.PENDING;
          await this._persistJob(job);
        }
      }, delay);
      
    } else {
      // Job permanently failed
      job.status = JOB_STATUS.FAILED;
      job.completedAt = new Date();
      
      this.metrics.failed++;
      
      await this._persistJob(job);
      this.emit('job:failed', job);
      
      this.logger.error('Job permanently failed', {
        id: job.id,
        type: job.type,
        retryCount: job.retryCount,
        maxRetries,
        error: error.message
      });
    }
  }
  
  _calculateRetryDelay(retryCount, backoffType) {
    const { baseDelay, maxDelay } = this.options;
    
    switch (backoffType) {
      case 'exponential':
        return Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
      case 'linear':
        return Math.min(baseDelay * retryCount, maxDelay);
      case 'fixed':
      default:
        return baseDelay;
    }
  }
  
  _startCleanupTimer() {
    setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.cleanupOldJobs();
        
        // Limit job history
        if (this.jobs.size > this.options.maxJobHistory) {
          const completedJobs = Array.from(this.jobs.values())
            .filter(job => [JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED].includes(job.status))
            .sort((a, b) => a.completedAt - b.completedAt);
          
          const toRemove = completedJobs.slice(0, completedJobs.length - this.options.maxJobHistory + 100);
          
          for (const job of toRemove) {
            this.jobs.delete(job.id);
            await this._deleteJobFile(job.id);
          }
          
          if (toRemove.length > 0) {
            this.logger.info('Trimmed job history', { removedCount: toRemove.length });
          }
        }
      }
    }, this.options.cleanupInterval);
  }
}

// Default job queue instance
export const defaultJobQueue = new JobQueue({
  name: 'default',
  concurrency: 3,
  persistenceDir: './data/jobs'
});