import chalk from 'chalk';

export class AdaptiveTaskRouter {
  constructor(agentRegistry) {
    this.agentRegistry = agentRegistry;
    this.routingRules = new Map();
    this.performanceHistory = new Map();
    this.learningData = new Map();
    this.setupDefaultRules();
  }

  async initialize() {
    console.log(chalk.blue('🧭 Adaptive Task Router initialized'));
  }

  setupDefaultRules() {
    this.routingRules.set('code_analysis', {
      preferredAgents: ['code_analyst', 'security'],
      strategy: 'single_agent',
      fallbackStrategy: 'consensus_ensemble',
      complexityThreshold: 0.6,
      collaborationThreshold: 0.8
    });

    this.routingRules.set('architecture_design', {
      preferredAgents: ['architect'],
      strategy: 'single_agent',
      fallbackStrategy: 'collaborative_session',
      complexityThreshold: 0.5,
      collaborationThreshold: 0.7
    });

    this.routingRules.set('security_analysis', {
      preferredAgents: ['security', 'code_analyst'],
      strategy: 'consensus_ensemble',
      fallbackStrategy: 'multi_agent_pipeline',
      complexityThreshold: 0.4,
      collaborationThreshold: 0.6
    });

    this.routingRules.set('performance_optimization', {
      preferredAgents: ['performance', 'code_analyst', 'architect'],
      strategy: 'multi_agent_pipeline',
      fallbackStrategy: 'collaborative_session',
      complexityThreshold: 0.6,
      collaborationThreshold: 0.8
    });

    this.routingRules.set('testing', {
      preferredAgents: ['testing', 'code_analyst'],
      strategy: 'single_agent',
      fallbackStrategy: 'parallel_execution',
      complexityThreshold: 0.5,
      collaborationThreshold: 0.7
    });

    this.routingRules.set('documentation', {
      preferredAgents: ['documentation', 'architect'],
      strategy: 'single_agent',
      fallbackStrategy: 'multi_agent_pipeline',
      complexityThreshold: 0.4,
      collaborationThreshold: 0.6
    });

    this.routingRules.set('devops', {
      preferredAgents: ['devops', 'security', 'performance'],
      strategy: 'multi_agent_pipeline',
      fallbackStrategy: 'collaborative_session',
      complexityThreshold: 0.7,
      collaborationThreshold: 0.8
    });

    this.routingRules.set('complex_analysis', {
      preferredAgents: ['code_analyst', 'architect', 'security', 'performance'],
      strategy: 'collaborative_session',
      fallbackStrategy: 'consensus_ensemble',
      complexityThreshold: 0.8,
      collaborationThreshold: 0.9
    });
  }

  async determineStrategy(taskAnalysis) {
    const { domain, complexity, collaborationNeeded, capabilities, estimatedTime, resourceRequirements } = taskAnalysis;
    
    console.log(chalk.cyan(`🎯 Routing task: ${domain} (complexity: ${complexity.toFixed(2)})`));
    
    const rule = this.routingRules.get(domain) || this.getDefaultRule();
    const availableAgents = this.getAvailableAgentsForTask(rule.preferredAgents, capabilities);
    
    if (availableAgents.length === 0) {
      console.warn(chalk.yellow('⚠️ No preferred agents available, using fallback'));
      return this.getFallbackStrategy(rule, taskAnalysis);
    }
    
    const strategy = this.selectOptimalStrategy(rule, taskAnalysis, availableAgents);
    const routingDecision = await this.validateAndRefineStrategy(strategy, taskAnalysis, availableAgents);
    
    this.recordRoutingDecision(domain, taskAnalysis, routingDecision);
    
    console.log(chalk.green(`✅ Selected strategy: ${routingDecision.type} with ${routingDecision.agents?.length || 1} agent(s)`));
    
    return routingDecision;
  }

  selectOptimalStrategy(rule, taskAnalysis, availableAgents) {
    const { complexity, collaborationNeeded, resourceRequirements, urgency } = taskAnalysis;
    
    if (urgency === 'high' && availableAgents.length >= 1) {
      return {
        type: 'single_agent',
        agent: availableAgents[0].id,
        reason: 'high_urgency_single_agent'
      };
    }
    
    if (complexity >= rule.complexityThreshold && collaborationNeeded) {
      if (availableAgents.length >= 3) {
        return {
          type: 'collaborative_session',
          agents: availableAgents.slice(0, 4).map(a => a.id),
          reason: 'high_complexity_collaboration'
        };
      } else if (availableAgents.length >= 2) {
        return {
          type: 'consensus_ensemble',
          agents: availableAgents.slice(0, 2).map(a => a.id),
          reason: 'medium_complexity_consensus'
        };
      }
    }
    
    if (complexity >= rule.collaborationThreshold) {
      if (availableAgents.length >= 3) {
        return {
          type: 'multi_agent_pipeline',
          pipeline: availableAgents.slice(0, 3).map(a => a.id),
          reason: 'complex_sequential_processing'
        };
      }
    }
    
    if (resourceRequirements.parallelizable && availableAgents.length >= 2) {
      return {
        type: 'parallel_execution',
        agents: availableAgents.slice(0, Math.min(4, availableAgents.length)).map(a => a.id),
        reason: 'parallelizable_workload'
      };
    }
    
    if (availableAgents.length >= 2 && this.shouldUseFallbackChain(taskAnalysis)) {
      return {
        type: 'cascading_fallback',
        agents: availableAgents.slice(0, 3).map(a => a.id),
        reason: 'reliability_focused'
      };
    }
    
    return {
      type: rule.strategy,
      agent: availableAgents[0].id,
      reason: 'default_rule_application'
    };
  }

  async validateAndRefineStrategy(strategy, taskAnalysis, availableAgents) {
    const performanceData = this.getPerformanceData(strategy.type, taskAnalysis.domain);
    
    if (performanceData && performanceData.successRate < 0.7) {
      console.log(chalk.yellow(`⚠️ Strategy ${strategy.type} has low success rate (${performanceData.successRate.toFixed(2)}), adjusting`));
      
      return this.adjustStrategyForPerformance(strategy, taskAnalysis, availableAgents, performanceData);
    }
    
    if (strategy.agents && strategy.agents.length > 1) {
      const agentCompatibility = this.assessAgentCompatibility(strategy.agents);
      if (agentCompatibility.score < 0.6) {
        console.log(chalk.yellow(`⚠️ Low agent compatibility (${agentCompatibility.score.toFixed(2)}), refining selection`));
        strategy.agents = this.selectCompatibleAgents(availableAgents, strategy.agents.length);
      }
    }
    
    strategy.estimatedDuration = this.estimateExecutionTime(strategy, taskAnalysis);
    strategy.confidenceLevel = this.calculateStrategyConfidence(strategy, taskAnalysis, availableAgents);
    strategy.resourceEstimate = this.estimateResourceUsage(strategy, taskAnalysis);
    
    return strategy;
  }

  adjustStrategyForPerformance(strategy, taskAnalysis, availableAgents, performanceData) {
    const alternativeStrategies = this.getAlternativeStrategies(strategy.type);
    
    for (const altStrategy of alternativeStrategies) {
      const altPerformance = this.getPerformanceData(altStrategy, taskAnalysis.domain);
      if (!altPerformance || altPerformance.successRate > performanceData.successRate) {
        console.log(chalk.cyan(`🔄 Switching to ${altStrategy} strategy`));
        return {
          ...strategy,
          type: altStrategy,
          reason: 'performance_adjustment',
          originalStrategy: strategy.type,
          performanceImprovement: altPerformance?.successRate || 0.8
        };
      }
    }
    
    return strategy;
  }

  getAlternativeStrategies(strategyType) {
    const alternatives = {
      'single_agent': ['consensus_ensemble', 'cascading_fallback'],
      'multi_agent_pipeline': ['collaborative_session', 'consensus_ensemble'],
      'consensus_ensemble': ['collaborative_session', 'multi_agent_pipeline'],
      'collaborative_session': ['consensus_ensemble', 'multi_agent_pipeline'],
      'parallel_execution': ['consensus_ensemble', 'single_agent'],
      'cascading_fallback': ['single_agent', 'consensus_ensemble']
    };
    
    return alternatives[strategyType] || ['single_agent'];
  }

  getAvailableAgentsForTask(preferredAgents, requiredCapabilities) {
    const availableAgents = this.agentRegistry.getAvailableAgents();
    const scoredAgents = [];
    
    for (const agentInfo of availableAgents) {
      const score = this.scoreAgentForTask(agentInfo, preferredAgents, requiredCapabilities);
      if (score > 0) {
        scoredAgents.push({ ...agentInfo, score });
      }
    }
    
    return scoredAgents.sort((a, b) => b.score - a.score);
  }

  scoreAgentForTask(agentInfo, preferredAgents, requiredCapabilities) {
    let score = 0;
    
    if (preferredAgents.includes(agentInfo.id)) {
      score += 1.0;
    }
    
    const specialties = agentInfo.agent.specialties || [];
    const matchingSpecialties = requiredCapabilities.filter(cap => specialties.includes(cap));
    score += matchingSpecialties.length * 0.3;
    
    score += (agentInfo.performance.successRate || 0.5) * 0.5;
    
    const averageResponseTime = agentInfo.performance.averageTime || 30000;
    if (averageResponseTime < 30000) score += 0.2;
    else if (averageResponseTime > 120000) score -= 0.2;
    
    const recentActivity = Date.now() - agentInfo.lastActivity.getTime();
    if (recentActivity < 60000) score += 0.1; // Recently active
    
    return Math.max(0, score);
  }

  assessAgentCompatibility(agentIds) {
    if (agentIds.length < 2) return { score: 1.0, factors: [] };
    
    const agents = agentIds.map(id => this.agentRegistry.getAgent(id)).filter(Boolean);
    const compatibilityFactors = [];
    let totalScore = 0;
    let factorCount = 0;
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const compatibility = this.calculatePairCompatibility(agents[i], agents[j]);
        compatibilityFactors.push({
          agents: [agents[i].id, agents[j].id],
          score: compatibility.score,
          factors: compatibility.factors
        });
        totalScore += compatibility.score;
        factorCount++;
      }
    }
    
    const averageScore = factorCount > 0 ? totalScore / factorCount : 1.0;
    
    return {
      score: averageScore,
      factors: compatibilityFactors,
      recommendation: averageScore > 0.7 ? 'good' : averageScore > 0.5 ? 'acceptable' : 'poor'
    };
  }

  calculatePairCompatibility(agent1, agent2) {
    let score = 0.5; // Base compatibility
    const factors = [];
    
    const specialties1 = new Set(agent1.agent.specialties || []);
    const specialties2 = new Set(agent2.agent.specialties || []);
    const commonSpecialties = [...specialties1].filter(s => specialties2.has(s));
    
    if (commonSpecialties.length > 0) {
      score += 0.2;
      factors.push('shared_specialties');
    } else if (this.areComplementarySpecialties(specialties1, specialties2)) {
      score += 0.3;
      factors.push('complementary_specialties');
    }
    
    const priority1 = agent1.agent.priority || 5;
    const priority2 = agent2.agent.priority || 5;
    if (Math.abs(priority1 - priority2) <= 2) {
      score += 0.1;
      factors.push('similar_priority');
    }
    
    const performance1 = agent1.performance.successRate || 0.5;
    const performance2 = agent2.performance.successRate || 0.5;
    if (Math.abs(performance1 - performance2) < 0.3) {
      score += 0.1;
      factors.push('similar_performance');
    }
    
    return { score: Math.min(score, 1.0), factors };
  }

  areComplementarySpecialties(specialties1, specialties2) {
    const complementaryPairs = [
      ['code_analysis', 'security'],
      ['architecture', 'performance'],
      ['testing', 'code_analysis'],
      ['devops', 'security'],
      ['documentation', 'architecture']
    ];
    
    for (const [spec1, spec2] of complementaryPairs) {
      if ((specialties1.has(spec1) && specialties2.has(spec2)) ||
          (specialties1.has(spec2) && specialties2.has(spec1))) {
        return true;
      }
    }
    
    return false;
  }

  selectCompatibleAgents(availableAgents, targetCount) {
    if (availableAgents.length <= targetCount) {
      return availableAgents.map(a => a.id);
    }
    
    const selected = [availableAgents[0]]; // Start with highest scored
    
    for (let i = 1; i < availableAgents.length && selected.length < targetCount; i++) {
      const candidate = availableAgents[i];
      const avgCompatibility = selected.reduce((sum, selectedAgent) => {
        const selectedAgentInfo = this.agentRegistry.getAgent(selectedAgent.id);
        const compatibility = this.calculatePairCompatibility(candidate, selectedAgentInfo);
        return sum + compatibility.score;
      }, 0) / selected.length;
      
      if (avgCompatibility >= 0.6) {
        selected.push(candidate);
      }
    }
    
    if (selected.length < targetCount) {
      const remaining = availableAgents.filter(a => !selected.includes(a));
      selected.push(...remaining.slice(0, targetCount - selected.length));
    }
    
    return selected.map(a => a.id);
  }

  shouldUseFallbackChain(taskAnalysis) {
    return taskAnalysis.reliability === 'critical' ||
           taskAnalysis.complexity > 0.8 ||
           taskAnalysis.riskLevel === 'high';
  }

  getPerformanceData(strategyType, domain) {
    const key = `${strategyType}_${domain}`;
    return this.performanceHistory.get(key);
  }

  recordRoutingDecision(domain, taskAnalysis, strategy) {
    const key = `${strategy.type}_${domain}`;
    const existing = this.performanceHistory.get(key) || {
      attempts: 0,
      successes: 0,
      totalDuration: 0,
      successRate: 0.5,
      averageDuration: 0,
      recentDecisions: []
    };
    
    existing.attempts++;
    existing.recentDecisions.push({
      timestamp: Date.now(),
      complexity: taskAnalysis.complexity,
      strategy: strategy.type,
      agents: strategy.agents || [strategy.agent],
      reason: strategy.reason
    });
    
    if (existing.recentDecisions.length > 50) {
      existing.recentDecisions = existing.recentDecisions.slice(-50);
    }
    
    this.performanceHistory.set(key, existing);
  }

  recordStrategyOutcome(strategyType, domain, success, duration, result) {
    const key = `${strategyType}_${domain}`;
    const data = this.performanceHistory.get(key);
    
    if (data) {
      data.totalDuration += duration;
      if (success) {
        data.successes++;
      }
      data.successRate = data.successes / data.attempts;
      data.averageDuration = data.totalDuration / data.attempts;
      
      this.performanceHistory.set(key, data);
      
      this.updateLearningData(strategyType, domain, success, duration, result);
    }
  }

  updateLearningData(strategyType, domain, success, duration, result) {
    const patterns = this.learningData.get('patterns') || new Map();
    const key = `${strategyType}_${domain}`;
    
    const pattern = patterns.get(key) || {
      successCount: 0,
      failureCount: 0,
      averageDuration: 0,
      durationSamples: [],
      commonFailureReasons: [],
      optimalConditions: []
    };
    
    if (success) {
      pattern.successCount++;
      if (result.quality && result.quality > 0.8) {
        pattern.optimalConditions.push({
          timestamp: Date.now(),
          duration,
          conditions: result.conditions || {}
        });
      }
    } else {
      pattern.failureCount++;
      if (result.error) {
        pattern.commonFailureReasons.push(result.error);
      }
    }
    
    pattern.durationSamples.push(duration);
    if (pattern.durationSamples.length > 100) {
      pattern.durationSamples = pattern.durationSamples.slice(-100);
    }
    
    pattern.averageDuration = pattern.durationSamples.reduce((a, b) => a + b, 0) / pattern.durationSamples.length;
    
    patterns.set(key, pattern);
    this.learningData.set('patterns', patterns);
  }

  estimateExecutionTime(strategy, taskAnalysis) {
    const baseTime = 30000; // 30 seconds
    const complexityMultiplier = 1 + taskAnalysis.complexity;
    
    let strategyMultiplier = 1;
    switch (strategy.type) {
      case 'single_agent':
        strategyMultiplier = 1;
        break;
      case 'multi_agent_pipeline':
        strategyMultiplier = (strategy.pipeline?.length || 2) * 0.8;
        break;
      case 'consensus_ensemble':
        strategyMultiplier = (strategy.agents?.length || 2) * 0.6;
        break;
      case 'collaborative_session':
        strategyMultiplier = (strategy.agents?.length || 3) * 1.5;
        break;
      case 'parallel_execution':
        strategyMultiplier = 1.2;
        break;
      case 'cascading_fallback':
        strategyMultiplier = (strategy.agents?.length || 2) * 0.4;
        break;
    }
    
    const performanceData = this.getPerformanceData(strategy.type, taskAnalysis.domain);
    if (performanceData && performanceData.averageDuration > 0) {
      return performanceData.averageDuration * 1.1; // Add 10% buffer
    }
    
    return baseTime * complexityMultiplier * strategyMultiplier;
  }

  calculateStrategyConfidence(strategy, taskAnalysis, availableAgents) {
    let confidence = 0.5;
    
    const performanceData = this.getPerformanceData(strategy.type, taskAnalysis.domain);
    if (performanceData) {
      confidence = performanceData.successRate;
    }
    
    if (strategy.agents) {
      const agentConfidences = strategy.agents.map(agentId => {
        const agent = availableAgents.find(a => a.id === agentId);
        return agent ? agent.performance.successRate || 0.5 : 0.3;
      });
      const avgAgentConfidence = agentConfidences.reduce((a, b) => a + b, 0) / agentConfidences.length;
      confidence = (confidence + avgAgentConfidence) / 2;
    }
    
    if (taskAnalysis.complexity > 0.8 && strategy.type === 'single_agent') {
      confidence *= 0.8; // Reduce confidence for complex single-agent tasks
    }
    
    if (taskAnalysis.complexity > 0.6 && ['consensus_ensemble', 'collaborative_session'].includes(strategy.type)) {
      confidence *= 1.1; // Increase confidence for appropriate multi-agent approaches
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  estimateResourceUsage(strategy, taskAnalysis) {
    const baseResources = {
      cpu: 'medium',
      memory: 'medium',
      network: 'low',
      storage: 'low'
    };
    
    const agentCount = strategy.agents?.length || 1;
    
    if (agentCount > 2) {
      baseResources.cpu = 'high';
      baseResources.memory = 'high';
    }
    
    if (strategy.type === 'collaborative_session') {
      baseResources.network = 'medium';
      baseResources.memory = 'high';
    }
    
    if (taskAnalysis.complexity > 0.8) {
      baseResources.cpu = baseResources.cpu === 'low' ? 'medium' : 'high';
    }
    
    return baseResources;
  }

  getFallbackStrategy(rule, taskAnalysis) {
    const fallbackAgents = this.agentRegistry.getAvailableAgents();
    
    if (fallbackAgents.length === 0) {
      throw new Error('No agents available for task execution');
    }
    
    if (fallbackAgents.length === 1) {
      return {
        type: 'single_agent',
        agent: fallbackAgents[0].id,
        reason: 'only_agent_available',
        isFallback: true
      };
    }
    
    return {
      type: rule.fallbackStrategy || 'cascading_fallback',
      agents: fallbackAgents.slice(0, Math.min(3, fallbackAgents.length)).map(a => a.id),
      reason: 'preferred_agents_unavailable',
      isFallback: true
    };
  }

  getDefaultRule() {
    return {
      preferredAgents: ['code_analyst'],
      strategy: 'single_agent',
      fallbackStrategy: 'cascading_fallback',
      complexityThreshold: 0.5,
      collaborationThreshold: 0.7
    };
  }

  updateRoutingRules(domain, newRule) {
    this.routingRules.set(domain, {
      ...this.getDefaultRule(),
      ...newRule
    });
    
    console.log(chalk.cyan(`📝 Updated routing rule for ${domain}`));
  }

  getRoutingStatistics() {
    const stats = {
      totalDecisions: 0,
      strategyUsage: {},
      domainDistribution: {},
      averageAgentsPerTask: 0,
      performanceData: {}
    };
    
    for (const [key, data] of this.performanceHistory) {
      const [strategy, domain] = key.split('_');
      
      stats.totalDecisions += data.attempts;
      stats.strategyUsage[strategy] = (stats.strategyUsage[strategy] || 0) + data.attempts;
      stats.domainDistribution[domain] = (stats.domainDistribution[domain] || 0) + data.attempts;
      
      stats.performanceData[key] = {
        attempts: data.attempts,
        successRate: data.successRate,
        averageDuration: data.averageDuration
      };
    }
    
    const recentDecisions = [];
    for (const data of this.performanceHistory.values()) {
      recentDecisions.push(...data.recentDecisions);
    }
    
    if (recentDecisions.length > 0) {
      const totalAgents = recentDecisions.reduce((sum, decision) => 
        sum + (decision.agents ? decision.agents.length : 1), 0);
      stats.averageAgentsPerTask = totalAgents / recentDecisions.length;
    }
    
    return stats;
  }

  optimizeRouting() {
    console.log(chalk.blue('🔧 Optimizing routing rules based on performance data...'));
    
    let optimizationsApplied = 0;
    
    for (const [domain, rule] of this.routingRules) {
      const domainPerformance = this.analyzedomainPerformance(domain);
      
      if (domainPerformance.shouldOptimize) {
        const optimizedRule = this.optimizeRule(rule, domainPerformance);
        if (JSON.stringify(optimizedRule) !== JSON.stringify(rule)) {
          this.routingRules.set(domain, optimizedRule);
          optimizationsApplied++;
          console.log(chalk.green(`✅ Optimized routing for ${domain}`));
        }
      }
    }
    
    console.log(chalk.cyan(`🎯 Applied ${optimizationsApplied} routing optimizations`));
  }

  analyzedomainPerformance(domain) {
    const domainData = [];
    
    for (const [key, data] of this.performanceHistory) {
      const [strategy, keyDomain] = key.split('_');
      if (keyDomain === domain) {
        domainData.push({ strategy, ...data });
      }
    }
    
    if (domainData.length === 0) {
      return { shouldOptimize: false };
    }
    
    const bestStrategy = domainData.reduce((best, current) => 
      current.successRate > best.successRate ? current : best
    );
    
    const averageSuccess = domainData.reduce((sum, d) => sum + d.successRate, 0) / domainData.length;
    
    return {
      shouldOptimize: averageSuccess < 0.8,
      bestStrategy: bestStrategy.strategy,
      bestSuccessRate: bestStrategy.successRate,
      currentAverage: averageSuccess,
      recommendations: this.generateOptimizationRecommendations(domainData)
    };
  }

  optimizeRule(rule, performance) {
    const optimizedRule = { ...rule };
    
    if (performance.bestSuccessRate > 0.8) {
      optimizedRule.strategy = performance.bestStrategy;
    }
    
    if (performance.currentAverage < 0.6) {
      optimizedRule.complexityThreshold = Math.max(0.3, rule.complexityThreshold - 0.1);
      optimizedRule.collaborationThreshold = Math.max(0.4, rule.collaborationThreshold - 0.1);
    }
    
    return optimizedRule;
  }

  generateOptimizationRecommendations(domainData) {
    const recommendations = [];
    
    const failingStrategies = domainData.filter(d => d.successRate < 0.7);
    if (failingStrategies.length > 0) {
      recommendations.push(`Consider avoiding: ${failingStrategies.map(s => s.strategy).join(', ')}`);
    }
    
    const successfulStrategies = domainData.filter(d => d.successRate > 0.8);
    if (successfulStrategies.length > 0) {
      recommendations.push(`Prefer strategies: ${successfulStrategies.map(s => s.strategy).join(', ')}`);
    }
    
    return recommendations;
  }
}