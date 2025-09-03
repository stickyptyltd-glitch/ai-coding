import chalk from 'chalk';
import { EventEmitter } from 'events';

export class CollaborativeSessionManager extends EventEmitter {
  constructor(agentRegistry) {
    super();
    this.agentRegistry = agentRegistry;
    this.activeSessions = new Map();
    this.sessionHistory = [];
    this.globalSharedMemory = new Map();
    
    this.config = {
      maxConcurrentSessions: 5,
      defaultMaxIterations: 10,
      sessionTimeout: 600000, // 10 minutes
      iterationTimeout: 90000, // 1.5 minutes
      convergenceThreshold: 0.85
    };
  }

  async createSession(sessionId, agents, task, options = {}) {
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    if (this.activeSessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const session = new CollaborativeSession(
      sessionId,
      agents,
      task,
      this.agentRegistry,
      {
        ...this.config,
        ...options
      }
    );

    this.activeSessions.set(sessionId, session);
    this.emit('session:created', { sessionId, agents, task });

    console.log(chalk.cyan(`👥 Created collaborative session ${sessionId} with ${agents.length} agents`));

    session.on('iteration:complete', (data) => {
      this.emit('session:iteration', { sessionId, ...data });
    });

    session.on('convergence:detected', (data) => {
      this.emit('session:convergence', { sessionId, ...data });
    });

    session.on('error', (error) => {
      this.emit('session:error', { sessionId, error });
    });

    return session;
  }

  async executeSession(sessionId, agents, task, options = {}) {
    const session = await this.createSession(sessionId, agents, task, options);
    
    try {
      const result = await session.execute();
      this.recordSessionCompletion(sessionId, result);
      return result;
    } finally {
      this.closeSession(sessionId);
    }
  }

  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  closeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.close();
      this.activeSessions.delete(sessionId);
      this.emit('session:closed', { sessionId });
      console.log(chalk.yellow(`🔚 Closed session ${sessionId}`));
    }
  }

  closeAllSessions() {
    for (const sessionId of this.activeSessions.keys()) {
      this.closeSession(sessionId);
    }
  }

  recordSessionCompletion(sessionId, result) {
    this.sessionHistory.push({
      sessionId,
      completedAt: new Date(),
      success: result.success,
      iterations: result.iterations,
      participants: result.participants,
      convergenceAchieved: result.convergenceAchieved,
      finalConfidence: result.finalConsensus?.consensusStrength || 0,
      duration: result.totalDuration
    });

    if (this.sessionHistory.length > 500) {
      this.sessionHistory = this.sessionHistory.slice(-500);
    }
  }

  getSessionMetrics() {
    const recent = this.sessionHistory.slice(-50);
    
    if (recent.length === 0) {
      return {
        totalSessions: 0,
        averageIterations: 0,
        successRate: 0,
        convergenceRate: 0,
        averageDuration: 0
      };
    }

    return {
      totalSessions: this.sessionHistory.length,
      recentSessions: recent.length,
      activeSessions: this.activeSessions.size,
      averageIterations: recent.reduce((sum, s) => sum + s.iterations, 0) / recent.length,
      successRate: recent.filter(s => s.success).length / recent.length,
      convergenceRate: recent.filter(s => s.convergenceAchieved).length / recent.length,
      averageDuration: recent.reduce((sum, s) => sum + s.duration, 0) / recent.length,
      averageConfidence: recent.reduce((sum, s) => sum + s.finalConfidence, 0) / recent.length
    };
  }

  cleanup() {
    const now = Date.now();
    const staleSessions = [];
    
    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.startTime > this.config.sessionTimeout) {
        staleSessions.push(sessionId);
      }
    }
    
    staleSessions.forEach(sessionId => {
      console.log(chalk.yellow(`🧹 Cleaning up stale session: ${sessionId}`));
      this.closeSession(sessionId);
    });
  }
}

export class CollaborativeSession extends EventEmitter {
  constructor(sessionId, agents, task, agentRegistry, config = {}) {
    super();
    this.sessionId = sessionId;
    this.agents = agents;
    this.task = task;
    this.agentRegistry = agentRegistry;
    this.config = config;
    
    this.status = 'initializing';
    this.messages = [];
    this.sharedContext = new Map();
    this.iterationResults = [];
    this.startTime = Date.now();
    this.convergenceHistory = [];
    
    this.participants = new Map();
    this.roles = new Map();
    
    this.initialize();
  }

  initialize() {
    this.sharedContext.set('sessionId', this.sessionId);
    this.sharedContext.set('task', this.task);
    this.sharedContext.set('participants', this.agents);
    this.sharedContext.set('startTime', this.startTime);
    
    this.agents.forEach((agentId, index) => {
      const agent = this.agentRegistry.getAgent(agentId);
      if (agent) {
        this.participants.set(agentId, {
          agent,
          status: 'ready',
          contributions: [],
          influence: 1.0,
          joinedAt: Date.now()
        });
        
        this.roles.set(agentId, this.assignRole(agentId, index, agent));
      }
    });
  }

  assignRole(agentId, index, agentInfo) {
    const specialties = agentInfo.agent.specialties || [];
    
    if (index === 0) return 'coordinator';
    if (specialties.includes('security')) return 'security_reviewer';
    if (specialties.includes('architecture')) return 'architect';
    if (specialties.includes('testing')) return 'quality_assurance';
    if (specialties.includes('performance')) return 'performance_analyst';
    
    return 'contributor';
  }

  async execute() {
    this.status = 'running';
    
    try {
      await this.initializeCollaboration();
      const result = await this.runCollaborativeWorkflow();
      this.status = 'completed';
      
      return {
        sessionId: this.sessionId,
        success: true,
        result,
        iterations: this.iterationResults.length,
        participants: this.agents,
        convergenceAchieved: result.convergenceAchieved,
        finalConsensus: result.finalConsensus,
        totalDuration: Date.now() - this.startTime,
        sharedContext: Object.fromEntries(this.sharedContext)
      };
      
    } catch (error) {
      this.status = 'failed';
      this.emit('error', error);
      
      return {
        sessionId: this.sessionId,
        success: false,
        error: error.message,
        iterations: this.iterationResults.length,
        participants: this.agents,
        totalDuration: Date.now() - this.startTime
      };
    }
  }

  async initializeCollaboration() {
    console.log(chalk.blue(`🚀 Initializing collaboration for session ${this.sessionId}`));
    
    for (const [agentId, participant] of this.participants) {
      const role = this.roles.get(agentId);
      
      this.sharedContext.set(`${agentId}_role`, role);
      this.sharedContext.set(`${agentId}_status`, 'ready');
      
      participant.status = 'initialized';
    }
    
    const initializationMessage = {
      type: 'session_initialized',
      sessionId: this.sessionId,
      participants: Array.from(this.participants.keys()),
      roles: Object.fromEntries(this.roles),
      task: this.task
    };
    
    this.messages.push(initializationMessage);
    this.emit('session:initialized', initializationMessage);
  }

  async runCollaborativeWorkflow() {
    let iteration = 0;
    let converged = false;
    const maxIterations = this.config.maxIterations || this.config.defaultMaxIterations || 10;
    
    while (iteration < maxIterations && !converged) {
      iteration++;
      console.log(chalk.blue(`🔄 Collaboration iteration ${iteration}/${maxIterations}`));
      
      const iterationStart = Date.now();
      const iterationResults = await this.executeIteration(iteration, maxIterations);
      const iterationDuration = Date.now() - iterationStart;
      
      this.iterationResults.push({
        iteration,
        results: iterationResults,
        duration: iterationDuration,
        timestamp: new Date()
      });
      
      this.emit('iteration:complete', {
        iteration,
        results: iterationResults,
        duration: iterationDuration
      });
      
      const convergence = this.assessConvergence(iteration);
      this.convergenceHistory.push(convergence);
      
      if (convergence.converged) {
        converged = true;
        console.log(chalk.green(`🎯 Collaboration converged after ${iteration} iterations`));
        this.emit('convergence:detected', { iteration, convergence });
      } else if (iteration === maxIterations) {
        console.log(chalk.yellow(`⏱️ Maximum iterations reached without convergence`));
      }
      
      this.updateInfluenceScores(iterationResults, convergence);
    }
    
    const finalConsensus = this.buildFinalConsensus();
    
    return {
      type: 'collaborative_result',
      iterations: iteration,
      converged,
      convergenceAchieved: converged,
      iterationResults: this.iterationResults,
      finalConsensus,
      messages: this.messages,
      participantContributions: this.getParticipantContributions()
    };
  }

  async executeIteration(iteration, maxIterations) {
    const results = [];
    const iterationContext = this.buildIterationContext(iteration, maxIterations);
    
    for (const agentId of this.agents) {
      const participant = this.participants.get(agentId);
      
      if (!participant || participant.status !== 'initialized' && participant.status !== 'ready') {
        console.warn(chalk.yellow(`⚠️ Agent ${agentId} not available for iteration ${iteration}`));
        continue;
      }
      
      const role = this.roles.get(agentId);
      console.log(chalk.cyan(`  👤 ${agentId} (${role}) processing...`));
      
      try {
        participant.status = 'processing';
        this.agentRegistry.updateAgentStatus(agentId, 'busy', this.sessionId);
        
        const agentTask = this.buildAgentTask(agentId, role, iterationContext);
        const stepStartTime = Date.now();
        
        const result = await this.withTimeout(
          participant.agent.agent.execute(agentTask),
          this.config.iterationTimeout || 90000
        );
        
        const stepDuration = Date.now() - stepStartTime;
        
        const contributionResult = {
          agent: agentId,
          role,
          result,
          iteration,
          duration: stepDuration,
          success: result.success !== false
        };
        
        results.push(contributionResult);
        participant.contributions.push(contributionResult);
        
        if (result.sharedUpdates) {
          this.processSharedUpdates(agentId, result.sharedUpdates);
        }
        
        participant.status = 'ready';
        this.agentRegistry.updateAgentStatus(agentId, 'idle');
        this.agentRegistry.recordTaskCompletion(agentId, this.sessionId, result, stepDuration);
        
        console.log(chalk.green(`  ✅ ${agentId} completed in ${stepDuration}ms`));
        
      } catch (error) {
        participant.status = 'error';
        this.agentRegistry.updateAgentStatus(agentId, 'error');
        
        console.error(chalk.red(`  ❌ ${agentId} failed: ${error.message}`));
        
        results.push({
          agent: agentId,
          role,
          error: error.message,
          iteration,
          success: false
        });
      }
    }
    
    return results;
  }

  buildIterationContext(iteration, maxIterations) {
    const previousResults = this.iterationResults.slice(-3);
    const recentMessages = this.messages.slice(-10);
    
    return {
      sessionId: this.sessionId,
      iteration,
      maxIterations,
      totalParticipants: this.agents.length,
      sharedContext: Object.fromEntries(this.sharedContext),
      previousIterations: previousResults,
      recentMessages,
      convergenceHistory: this.convergenceHistory.slice(-3),
      participantStatus: Object.fromEntries(
        Array.from(this.participants.entries()).map(([id, p]) => [id, p.status])
      )
    };
  }

  buildAgentTask(agentId, role, iterationContext) {
    const baseTask = {
      ...this.task,
      collaboration: {
        ...iterationContext,
        agentId,
        role,
        responsibilities: this.getRoleResponsibilities(role),
        influence: this.participants.get(agentId)?.influence || 1.0
      }
    };
    
    switch (role) {
      case 'coordinator':
        baseTask.collaboration.instructions = 'Coordinate and synthesize contributions from all participants. Guide the session toward consensus.';
        break;
      case 'security_reviewer':
        baseTask.collaboration.instructions = 'Review all contributions for security implications. Raise concerns and suggest mitigations.';
        break;
      case 'architect':
        baseTask.collaboration.instructions = 'Focus on architectural soundness and system design principles.';
        break;
      case 'quality_assurance':
        baseTask.collaboration.instructions = 'Ensure quality standards are met. Identify testing requirements and validation needs.';
        break;
      case 'performance_analyst':
        baseTask.collaboration.instructions = 'Analyze performance implications and suggest optimizations.';
        break;
      default:
        baseTask.collaboration.instructions = 'Contribute your expertise to achieve the session goals.';
    }
    
    return baseTask;
  }

  getRoleResponsibilities(role) {
    const responsibilities = {
      coordinator: ['session_guidance', 'consensus_building', 'conflict_resolution', 'summary_generation'],
      security_reviewer: ['security_analysis', 'vulnerability_identification', 'compliance_checking'],
      architect: ['system_design', 'pattern_recommendation', 'scalability_analysis'],
      quality_assurance: ['quality_validation', 'testing_strategy', 'standard_compliance'],
      performance_analyst: ['performance_optimization', 'resource_analysis', 'bottleneck_identification'],
      contributor: ['domain_expertise', 'solution_development', 'peer_review']
    };
    
    return responsibilities[role] || responsibilities.contributor;
  }

  processSharedUpdates(agentId, updates) {
    for (const [key, value] of Object.entries(updates)) {
      const previousValue = this.sharedContext.get(key);
      
      this.sharedContext.set(key, value);
      
      const updateMessage = {
        type: 'shared_update',
        agentId,
        key,
        value,
        previousValue,
        timestamp: new Date()
      };
      
      this.messages.push(updateMessage);
    }
  }

  assessConvergence(iteration) {
    const recentResults = this.iterationResults.slice(-2);
    
    if (recentResults.length < 2) {
      return {
        converged: false,
        confidence: 0,
        reason: 'Insufficient iterations for convergence assessment',
        iteration
      };
    }
    
    const current = recentResults[recentResults.length - 1];
    const previous = recentResults[recentResults.length - 2];
    
    const stabilityMetrics = this.calculateStabilityMetrics(current.results, previous.results);
    const consensusMetrics = this.calculateConsensusMetrics(current.results);
    
    const convergenceScore = (stabilityMetrics.stability + consensusMetrics.consensus) / 2;
    const converged = convergenceScore >= this.config.convergenceThreshold;
    
    return {
      converged,
      confidence: convergenceScore,
      stability: stabilityMetrics,
      consensus: consensusMetrics,
      threshold: this.config.convergenceThreshold,
      iteration,
      reason: converged ? 'Convergence achieved' : 'Results still evolving'
    };
  }

  calculateStabilityMetrics(currentResults, previousResults) {
    const currentAgents = new Set(currentResults.map(r => r.agent));
    const previousAgents = new Set(previousResults.map(r => r.agent));
    
    const commonAgents = [...currentAgents].filter(agent => previousAgents.has(agent));
    
    if (commonAgents.length === 0) {
      return { stability: 0, commonParticipants: 0, similarityScores: [] };
    }
    
    const similarityScores = [];
    
    for (const agentId of commonAgents) {
      const currentResult = currentResults.find(r => r.agent === agentId);
      const previousResult = previousResults.find(r => r.agent === agentId);
      
      if (currentResult && previousResult && currentResult.success && previousResult.success) {
        const similarity = this.calculateResultSimilarity(currentResult.result, previousResult.result);
        similarityScores.push(similarity);
      }
    }
    
    const averageSimilarity = similarityScores.length > 0 
      ? similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length 
      : 0;
    
    return {
      stability: averageSimilarity,
      commonParticipants: commonAgents.length,
      similarityScores,
      participationStability: commonAgents.length / Math.max(currentAgents.size, previousAgents.size)
    };
  }

  calculateConsensusMetrics(results) {
    const successfulResults = results.filter(r => r.success && !r.error);
    
    if (successfulResults.length === 0) {
      return { consensus: 0, agreement: 0, confidenceAlignment: 0 };
    }
    
    const confidences = successfulResults
      .map(r => r.result.confidence)
      .filter(c => c !== undefined);
    
    const confidenceAlignment = confidences.length > 0 
      ? 1 - this.calculateStandardDeviation(confidences) / 1
      : 0.5;
    
    const outputSimilarities = [];
    
    for (let i = 0; i < successfulResults.length; i++) {
      for (let j = i + 1; j < successfulResults.length; j++) {
        const similarity = this.calculateResultSimilarity(
          successfulResults[i].result, 
          successfulResults[j].result
        );
        outputSimilarities.push(similarity);
      }
    }
    
    const averageAgreement = outputSimilarities.length > 0 
      ? outputSimilarities.reduce((a, b) => a + b, 0) / outputSimilarities.length 
      : 0;
    
    return {
      consensus: (averageAgreement + confidenceAlignment) / 2,
      agreement: averageAgreement,
      confidenceAlignment,
      participantCount: successfulResults.length
    };
  }

  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  calculateResultSimilarity(result1, result2) {
    if (!result1 || !result2) return 0;
    
    let similarity = 0;
    let factors = 0;
    
    if (result1.confidence !== undefined && result2.confidence !== undefined) {
      similarity += Math.max(0, 1 - Math.abs(result1.confidence - result2.confidence));
      factors++;
    }
    
    if (result1.type && result2.type) {
      similarity += result1.type === result2.type ? 1 : 0;
      factors++;
    }
    
    if (result1.output && result2.output && typeof result1.output === 'string' && typeof result2.output === 'string') {
      const textSimilarity = this.calculateTextSimilarity(result1.output, result2.output);
      similarity += textSimilarity;
      factors++;
    }
    
    return factors > 0 ? similarity / factors : 0.5;
  }

  calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1;
    if (!text1 || !text2) return 0;
    
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    if (norm1 === norm2) return 1;
    
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    
    const allWords = new Set([...words1, ...words2]);
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / allWords.size;
  }

  updateInfluenceScores(iterationResults, convergenceAssessment) {
    const successfulResults = iterationResults.filter(r => r.success);
    
    for (const result of successfulResults) {
      const participant = this.participants.get(result.agent);
      if (!participant) continue;
      
      let influenceAdjustment = 0;
      
      if (result.result.confidence && result.result.confidence > 0.8) {
        influenceAdjustment += 0.1;
      }
      
      if (convergenceAssessment.consensus > 0.7 && result.success) {
        influenceAdjustment += 0.05;
      }
      
      if (result.result.sharedUpdates && Object.keys(result.result.sharedUpdates).length > 0) {
        influenceAdjustment += 0.05;
      }
      
      participant.influence = Math.min(2.0, Math.max(0.1, participant.influence + influenceAdjustment));
    }
  }

  buildFinalConsensus() {
    if (this.iterationResults.length === 0) return null;
    
    const lastIteration = this.iterationResults[this.iterationResults.length - 1];
    const successfulResults = lastIteration.results.filter(r => r.success);
    
    if (successfulResults.length === 0) return null;
    
    const weightedResults = successfulResults.map(result => {
      const participant = this.participants.get(result.agent);
      const influence = participant?.influence || 1.0;
      
      return {
        ...result,
        weight: influence * (result.result.confidence || 0.5)
      };
    });
    
    const bestResult = weightedResults.reduce((best, current) => 
      current.weight > best.weight ? current : best
    );
    
    const averageConfidence = weightedResults.reduce((sum, r) => sum + (r.result.confidence || 0.5), 0) / weightedResults.length;
    const totalWeight = weightedResults.reduce((sum, r) => sum + r.weight, 0);
    
    const finalConvergence = this.convergenceHistory[this.convergenceHistory.length - 1];
    
    return {
      selectedResult: bestResult.result,
      selectedAgent: bestResult.agent,
      selectedRole: bestResult.role,
      confidence: bestResult.result.confidence || 0.5,
      consensusStrength: finalConvergence?.confidence || 0,
      averageConfidence,
      totalWeight,
      participantCount: successfulResults.length,
      convergenceAchieved: finalConvergence?.converged || false,
      finalIteration: this.iterationResults.length
    };
  }

  getParticipantContributions() {
    const contributions = {};
    
    for (const [agentId, participant] of this.participants) {
      const successfulContributions = participant.contributions.filter(c => c.success);
      const totalDuration = participant.contributions.reduce((sum, c) => sum + (c.duration || 0), 0);
      
      contributions[agentId] = {
        role: this.roles.get(agentId),
        totalContributions: participant.contributions.length,
        successfulContributions: successfulContributions.length,
        successRate: participant.contributions.length > 0 ? successfulContributions.length / participant.contributions.length : 0,
        totalTime: totalDuration,
        averageTime: participant.contributions.length > 0 ? totalDuration / participant.contributions.length : 0,
        finalInfluence: participant.influence,
        status: participant.status,
        joinedAt: participant.joinedAt
      };
    }
    
    return contributions;
  }

  close() {
    this.status = 'closed';
    
    for (const agentId of this.agents) {
      this.agentRegistry.updateAgentStatus(agentId, 'idle');
    }
    
    this.sharedContext.clear();
    this.removeAllListeners();
  }

  async withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }
}