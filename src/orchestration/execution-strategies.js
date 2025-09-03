import chalk from 'chalk';

export class ExecutionStrategies {
  constructor(agentRegistry) {
    this.agentRegistry = agentRegistry;
    this.strategies = new Map();
    this.setupStrategies();
  }

  setupStrategies() {
    this.strategies.set('single_agent', this.executeSingleAgent.bind(this));
    this.strategies.set('multi_agent_pipeline', this.executeMultiAgentPipeline.bind(this));
    this.strategies.set('consensus_ensemble', this.executeConsensusEnsemble.bind(this));
    this.strategies.set('collaborative_session', this.executeCollaborativeSession.bind(this));
    this.strategies.set('parallel_execution', this.executeParallelExecution.bind(this));
    this.strategies.set('cascading_fallback', this.executeCascadingFallback.bind(this));
  }

  async executeStrategy(strategy, taskId, task, options = {}) {
    const strategyFunction = this.strategies.get(strategy.type);
    
    if (!strategyFunction) {
      throw new Error(`Unknown execution strategy: ${strategy.type}`);
    }

    console.log(chalk.blue(`🎯 Executing ${strategy.type} strategy for task: ${taskId}`));
    
    const startTime = Date.now();
    try {
      const result = await strategyFunction(taskId, task, strategy, options);
      const duration = Date.now() - startTime;
      
      console.log(chalk.green(`✅ Strategy ${strategy.type} completed in ${duration}ms`));
      
      return {
        ...result,
        executionTime: duration,
        strategy: strategy.type
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(chalk.red(`❌ Strategy ${strategy.type} failed after ${duration}ms: ${error.message}`));
      throw error;
    }
  }

  async executeSingleAgent(taskId, task, strategy, options = {}) {
    const agentId = strategy.agent;
    const agentInfo = this.agentRegistry.getAgent(agentId);
    
    if (!agentInfo) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    this.agentRegistry.updateAgentStatus(agentId, 'busy', taskId);
    
    try {
      const result = await this.withTimeout(
        agentInfo.agent.execute(task),
        options.timeout || 300000
      );
      
      this.agentRegistry.updateAgentStatus(agentId, 'idle');
      this.agentRegistry.recordTaskCompletion(agentId, taskId, result, Date.now() - Date.now());
      
      return {
        type: 'single_agent_result',
        agent: agentId,
        result,
        success: result.success !== false
      };
    } catch (error) {
      this.agentRegistry.updateAgentStatus(agentId, 'error');
      throw new Error(`Single agent execution failed: ${error.message}`);
    }
  }

  async executeMultiAgentPipeline(taskId, task, strategy, options = {}) {
    const results = [];
    let currentInput = task;
    const pipeline = strategy.pipeline || strategy.agents || [];
    
    for (const [index, agentId] of pipeline.entries()) {
      const agentInfo = this.agentRegistry.getAgent(agentId);
      
      if (!agentInfo) {
        throw new Error(`Agent not found in pipeline: ${agentId}`);
      }
      
      console.log(chalk.cyan(`📋 Pipeline step ${index + 1}/${pipeline.length}: ${agentId}`));
      
      this.agentRegistry.updateAgentStatus(agentId, 'busy', taskId);
      
      try {
        const stepStartTime = Date.now();
        const result = await this.withTimeout(
          agentInfo.agent.execute(currentInput),
          options.stepTimeout || 120000
        );
        const stepDuration = Date.now() - stepStartTime;
        
        results.push({ 
          agent: agentId, 
          result, 
          step: index + 1,
          duration: stepDuration
        });
        
        this.agentRegistry.updateAgentStatus(agentId, 'idle');
        this.agentRegistry.recordTaskCompletion(agentId, taskId, result, stepDuration);
        
        currentInput = {
          ...task,
          previousResult: result,
          pipelineContext: {
            step: index + 1,
            totalSteps: pipeline.length,
            previousResults: results
          }
        };
        
      } catch (error) {
        this.agentRegistry.updateAgentStatus(agentId, 'error');
        throw new Error(`Pipeline failed at step ${index + 1} (agent ${agentId}): ${error.message}`);
      }
    }
    
    return {
      type: 'pipeline_result',
      pipeline: pipeline,
      steps: results,
      finalResult: results[results.length - 1].result,
      totalSteps: results.length
    };
  }

  async executeConsensusEnsemble(taskId, task, strategy, options = {}) {
    const agents = strategy.agents || [];
    const promises = [];
    const results = [];
    
    console.log(chalk.cyan(`🤝 Running consensus ensemble with ${agents.length} agents`));
    
    for (const agentId of agents) {
      const agentInfo = this.agentRegistry.getAgent(agentId);
      
      if (!agentInfo) {
        console.warn(chalk.yellow(`⚠️ Agent not found: ${agentId}, skipping`));
        continue;
      }
      
      this.agentRegistry.updateAgentStatus(agentId, 'busy', taskId);
      
      const promise = this.withTimeout(
        agentInfo.agent.execute(task),
        options.agentTimeout || 180000
      ).then(result => {
        const duration = Date.now() - Date.now();
        this.agentRegistry.updateAgentStatus(agentId, 'idle');
        this.agentRegistry.recordTaskCompletion(agentId, taskId, result, duration);
        return { agent: agentId, result, duration };
      }).catch(error => {
        this.agentRegistry.updateAgentStatus(agentId, 'error');
        return { agent: agentId, error: error.message };
      });
      
      promises.push(promise);
    }
    
    const allResults = await Promise.allSettled(promises);
    
    for (const settledResult of allResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      }
    }
    
    const successfulResults = results.filter(r => !r.error);
    
    if (successfulResults.length === 0) {
      throw new Error('All agents failed in consensus ensemble');
    }
    
    return {
      type: 'consensus_result',
      participants: agents,
      results: results,
      successfulResults: successfulResults,
      consensusReady: true
    };
  }

  async executeCollaborativeSession(taskId, task, strategy, options = {}) {
    const agents = strategy.agents || [];
    const sessionContext = {
      sessionId: taskId,
      participants: agents,
      task: task,
      sharedMemory: new Map(),
      iterationLimit: options.maxIterations || 5
    };
    
    console.log(chalk.cyan(`👥 Starting collaborative session with ${agents.length} agents`));
    
    const results = [];
    let iteration = 0;
    
    while (iteration < sessionContext.iterationLimit) {
      iteration++;
      console.log(chalk.blue(`🔄 Collaboration iteration ${iteration}/${sessionContext.iterationLimit}`));
      
      for (const agentId of agents) {
        const agentInfo = this.agentRegistry.getAgent(agentId);
        
        if (!agentInfo) {
          console.warn(chalk.yellow(`⚠️ Agent ${agentId} not available for collaboration`));
          continue;
        }
        
        this.agentRegistry.updateAgentStatus(agentId, 'busy', taskId);
        
        try {
          const collaborativeTask = {
            ...task,
            collaboration: {
              sessionId: taskId,
              iteration,
              maxIterations: sessionContext.iterationLimit,
              sharedContext: Object.fromEntries(sessionContext.sharedMemory),
              previousResults: results.filter(r => r.iteration < iteration),
              participants: agents
            }
          };
          
          const stepStartTime = Date.now();
          const result = await this.withTimeout(
            agentInfo.agent.execute(collaborativeTask),
            options.stepTimeout || 90000
          );
          const stepDuration = Date.now() - stepStartTime;
          
          results.push({
            agent: agentId,
            result,
            iteration,
            duration: stepDuration
          });
          
          if (result.sharedUpdates) {
            for (const [key, value] of Object.entries(result.sharedUpdates)) {
              sessionContext.sharedMemory.set(key, value);
            }
          }
          
          this.agentRegistry.updateAgentStatus(agentId, 'idle');
          this.agentRegistry.recordTaskCompletion(agentId, taskId, result, stepDuration);
          
        } catch (error) {
          this.agentRegistry.updateAgentStatus(agentId, 'error');
          console.error(chalk.red(`❌ Agent ${agentId} failed in collaboration: ${error.message}`));
        }
      }
      
      const convergenceCheck = this.checkCollaborationConvergence(results, iteration);
      if (convergenceCheck.converged) {
        console.log(chalk.green(`🎯 Collaboration converged after ${iteration} iterations`));
        break;
      }
    }
    
    return {
      type: 'collaborative_result',
      sessionId: taskId,
      iterations: iteration,
      results: results,
      sharedContext: Object.fromEntries(sessionContext.sharedMemory),
      finalConsensus: this.buildCollaborationConsensus(results)
    };
  }

  async executeParallelExecution(taskId, task, strategy, options = {}) {
    const agents = strategy.agents || [];
    const promises = [];
    const results = [];
    
    console.log(chalk.cyan(`⚡ Executing parallel tasks with ${agents.length} agents`));
    
    for (const [index, agentId] of agents.entries()) {
      const agentInfo = this.agentRegistry.getAgent(agentId);
      
      if (!agentInfo) {
        console.warn(chalk.yellow(`⚠️ Agent not found: ${agentId}, skipping`));
        continue;
      }
      
      const parallelTask = {
        ...task,
        parallel: {
          index,
          total: agents.length,
          agentId
        }
      };
      
      this.agentRegistry.updateAgentStatus(agentId, 'busy', taskId);
      
      const promise = this.withTimeout(
        agentInfo.agent.execute(parallelTask),
        options.agentTimeout || 180000
      ).then(result => {
        const duration = Date.now() - Date.now();
        this.agentRegistry.updateAgentStatus(agentId, 'idle');
        this.agentRegistry.recordTaskCompletion(agentId, taskId, result, duration);
        return { agent: agentId, result, index, duration, success: true };
      }).catch(error => {
        this.agentRegistry.updateAgentStatus(agentId, 'error');
        return { agent: agentId, error: error.message, index, success: false };
      });
      
      promises.push(promise);
    }
    
    const allResults = await Promise.allSettled(promises);
    
    for (const settledResult of allResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      }
    }
    
    results.sort((a, b) => (a.index || 0) - (b.index || 0));
    
    return {
      type: 'parallel_result',
      agents: agents,
      results: results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }

  async executeCascadingFallback(taskId, task, strategy, options = {}) {
    const agents = strategy.agents || strategy.fallbackChain || [];
    
    console.log(chalk.cyan(`🎯 Attempting cascading fallback with ${agents.length} agents`));
    
    for (const [index, agentId] of agents.entries()) {
      const agentInfo = this.agentRegistry.getAgent(agentId);
      
      if (!agentInfo) {
        console.warn(chalk.yellow(`⚠️ Agent not found: ${agentId}, trying next`));
        continue;
      }
      
      if (agentInfo.status !== 'idle') {
        console.warn(chalk.yellow(`⚠️ Agent ${agentId} busy, trying next`));
        continue;
      }
      
      console.log(chalk.blue(`🔄 Attempt ${index + 1}/${agents.length}: ${agentId}`));
      
      this.agentRegistry.updateAgentStatus(agentId, 'busy', taskId);
      
      try {
        const stepStartTime = Date.now();
        const result = await this.withTimeout(
          agentInfo.agent.execute(task),
          options.agentTimeout || 120000
        );
        const stepDuration = Date.now() - stepStartTime;
        
        this.agentRegistry.updateAgentStatus(agentId, 'idle');
        this.agentRegistry.recordTaskCompletion(agentId, taskId, result, stepDuration);
        
        console.log(chalk.green(`✅ Fallback succeeded with agent ${agentId}`));
        
        return {
          type: 'fallback_result',
          successfulAgent: agentId,
          attemptNumber: index + 1,
          result,
          fallbackChain: agents.slice(0, index + 1)
        };
        
      } catch (error) {
        this.agentRegistry.updateAgentStatus(agentId, 'error');
        console.warn(chalk.yellow(`⚠️ Agent ${agentId} failed: ${error.message}, trying next`));
        
        if (index === agents.length - 1) {
          throw new Error(`All fallback agents failed. Last error: ${error.message}`);
        }
      }
    }
    
    throw new Error('No agents available for fallback execution');
  }

  checkCollaborationConvergence(results, currentIteration) {
    if (currentIteration < 2) {
      return { converged: false, reason: 'Need at least 2 iterations' };
    }
    
    const recentResults = results.filter(r => r.iteration === currentIteration);
    const previousResults = results.filter(r => r.iteration === currentIteration - 1);
    
    if (recentResults.length === 0 || previousResults.length === 0) {
      return { converged: false, reason: 'Insufficient results for comparison' };
    }
    
    const stabilityThreshold = 0.9;
    let stableResults = 0;
    
    for (const recentResult of recentResults) {
      const previousResult = previousResults.find(p => p.agent === recentResult.agent);
      if (previousResult) {
        const similarity = this.calculateResultSimilarity(recentResult.result, previousResult.result);
        if (similarity >= stabilityThreshold) {
          stableResults++;
        }
      }
    }
    
    const stabilityRatio = stableResults / recentResults.length;
    const converged = stabilityRatio >= 0.8;
    
    return {
      converged,
      stabilityRatio,
      stableResults,
      totalResults: recentResults.length,
      reason: converged ? 'Results converged' : 'Results still changing'
    };
  }

  calculateResultSimilarity(result1, result2) {
    if (!result1 || !result2) return 0;
    
    if (result1.confidence && result2.confidence) {
      return Math.abs(result1.confidence - result2.confidence) < 0.1 ? 0.9 : 0.5;
    }
    
    if (typeof result1.output === 'string' && typeof result2.output === 'string') {
      const similarity = this.calculateStringSimilarity(result1.output, result2.output);
      return similarity;
    }
    
    return 0.5; // Default similarity
  }

  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  calculateEditDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  buildCollaborationConsensus(results) {
    if (results.length === 0) return null;
    
    const latestIteration = Math.max(...results.map(r => r.iteration));
    const latestResults = results.filter(r => r.iteration === latestIteration);
    
    const confidenceScores = latestResults
      .map(r => r.result.confidence || 0.5)
      .filter(c => c > 0);
    
    const averageConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
      : 0.5;
    
    return {
      iteration: latestIteration,
      participantCount: latestResults.length,
      averageConfidence,
      highestConfidenceResult: latestResults.reduce((best, current) => 
        (current.result.confidence || 0) > (best.result.confidence || 0) ? current : best
      ),
      consensusStrength: averageConfidence
    };
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