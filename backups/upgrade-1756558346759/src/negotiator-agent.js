import chalk from 'chalk';

export class NegotiatorAgent {
  constructor(agent) {
    this.agent = agent;
    this.tradeoffs = new Map();
    this.negotiations = new Map();
    this.criteria = new Map();
    this.initializeTradeoffPatterns();
  }

  initializeTradeoffPatterns() {
    // Common software development tradeoffs
    this.tradeoffs.set('speed_vs_quality', {
      name: 'Development Speed vs Code Quality',
      description: 'Balance between rapid development and maintainable code',
      factors: {
        speed: {
          benefits: ['Faster time to market', 'Quick prototyping', 'Immediate feedback'],
          costs: ['Technical debt', 'Bug accumulation', 'Maintenance issues'],
          metrics: ['delivery_time', 'feature_velocity', 'time_to_market']
        },
        quality: {
          benefits: ['Maintainable code', 'Fewer bugs', 'Better performance'],
          costs: ['Longer development time', 'Higher upfront cost', 'More complex planning'],
          metrics: ['code_coverage', 'cyclomatic_complexity', 'bug_count']
        }
      },
      recommendations: {
        speed_focused: 'Use rapid prototyping, minimal viable product approach, defer optimization',
        balanced: 'Implement core quality practices, automated testing, regular refactoring',
        quality_focused: 'Extensive testing, code reviews, architectural planning, documentation'
      }
    });

    this.tradeoffs.set('performance_vs_maintainability', {
      name: 'Performance vs Maintainability',
      description: 'Optimize for speed vs readable, maintainable code',
      factors: {
        performance: {
          benefits: ['Faster execution', 'Lower resource usage', 'Better user experience'],
          costs: ['Complex code', 'Harder to debug', 'Difficult to modify'],
          metrics: ['response_time', 'memory_usage', 'cpu_utilization']
        },
        maintainability: {
          benefits: ['Easy to understand', 'Simple to modify', 'Reduced debugging time'],
          costs: ['Potentially slower', 'Higher resource usage', 'More verbose code'],
          metrics: ['code_complexity', 'documentation_coverage', 'onboarding_time']
        }
      },
      recommendations: {
        performance_focused: 'Optimize critical paths, use profiling, micro-optimizations',
        balanced: 'Profile first, optimize bottlenecks, maintain code clarity',
        maintainability_focused: 'Prioritize readability, use abstractions, comprehensive documentation'
      }
    });

    this.tradeoffs.set('features_vs_stability', {
      name: 'Feature Richness vs System Stability',
      description: 'Add functionality vs maintain reliable operation',
      factors: {
        features: {
          benefits: ['Enhanced user value', 'Competitive advantage', 'Market differentiation'],
          costs: ['Increased complexity', 'More potential bugs', 'Testing overhead'],
          metrics: ['feature_count', 'user_engagement', 'market_coverage']
        },
        stability: {
          benefits: ['Reliable operation', 'User trust', 'Lower support costs'],
          costs: ['Slower feature delivery', 'Potential market lag', 'User impatience'],
          metrics: ['uptime', 'error_rate', 'user_satisfaction']
        }
      },
      recommendations: {
        features_focused: 'Rapid iteration, feature flags, beta testing programs',
        balanced: 'Feature planning with stability checkpoints, gradual rollouts',
        stability_focused: 'Comprehensive testing, staged deployments, conservative changes'
      }
    });

    this.tradeoffs.set('scalability_vs_simplicity', {
      name: 'Scalability vs Simplicity',
      description: 'Build for future growth vs keep current solution simple',
      factors: {
        scalability: {
          benefits: ['Handle growth', 'Future-proof architecture', 'Better resource utilization'],
          costs: ['Complex design', 'Longer development', 'Over-engineering risk'],
          metrics: ['concurrent_users', 'transaction_throughput', 'resource_efficiency']
        },
        simplicity: {
          benefits: ['Faster development', 'Easier debugging', 'Lower complexity'],
          costs: ['Scaling bottlenecks', 'Architecture limitations', 'Refactoring needs'],
          metrics: ['development_time', 'bug_count', 'team_productivity']
        }
      },
      recommendations: {
        scalability_focused: 'Microservices, horizontal scaling, distributed architecture',
        balanced: 'Modular monolith, vertical scaling with horizontal options',
        simplicity_focused: 'Monolithic architecture, simple deployment, direct solutions'
      }
    });

    this.tradeoffs.set('security_vs_usability', {
      name: 'Security vs Usability',
      description: 'Secure the system vs maintain user-friendly experience',
      factors: {
        security: {
          benefits: ['Data protection', 'Regulatory compliance', 'Risk mitigation'],
          costs: ['Complex user flows', 'Additional friction', 'Development overhead'],
          metrics: ['security_score', 'vulnerability_count', 'compliance_level']
        },
        usability: {
          benefits: ['Better user experience', 'Higher adoption', 'Reduced support'],
          costs: ['Security risks', 'Compliance issues', 'Potential breaches'],
          metrics: ['user_satisfaction', 'conversion_rate', 'support_tickets']
        }
      },
      recommendations: {
        security_focused: 'Multi-factor authentication, strict validation, comprehensive auditing',
        balanced: 'Risk-based authentication, progressive security, user education',
        usability_focused: 'Single sign-on, minimal friction, transparent security'
      }
    });
  }

  async negotiateTradeoff(scenario, constraints = {}, stakeholders = []) {
    console.log(chalk.blue(`⚖️ Negotiating tradeoff: ${scenario}`));
    
    const negotiationId = this.generateNegotiationId();
    const negotiation = {
      id: negotiationId,
      scenario,
      constraints,
      stakeholders,
      startTime: new Date(),
      status: 'analyzing'
    };

    this.negotiations.set(negotiationId, negotiation);

    try {
      // Identify relevant tradeoffs
      const relevantTradeoffs = this.identifyRelevantTradeoffs(scenario);
      
      // Analyze constraints and requirements
      const analysis = await this.analyzeScenario(scenario, constraints, stakeholders);
      
      // Generate options
      const options = await this.generateOptions(relevantTradeoffs, analysis);
      
      // Evaluate each option
      const evaluations = await this.evaluateOptions(options, analysis);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(evaluations, analysis);
      
      negotiation.results = {
        relevantTradeoffs,
        analysis,
        options,
        evaluations,
        recommendations
      };
      
      negotiation.status = 'completed';
      negotiation.endTime = new Date();
      
      return {
        success: true,
        negotiationId,
        results: negotiation.results,
        summary: this.generateNegotiationSummary(negotiation)
      };
      
    } catch (error) {
      negotiation.status = 'failed';
      negotiation.error = error.message;
      
      return {
        success: false,
        error: error.message,
        negotiationId
      };
    }
  }

  identifyRelevantTradeoffs(scenario) {
    const relevant = [];
    const scenarioLower = scenario.toLowerCase();
    
    for (const [key, tradeoff] of this.tradeoffs) {
      let relevanceScore = 0;
      
      // Check if scenario mentions tradeoff factors
      const allFactors = Object.keys(tradeoff.factors).join(' ');
      const factorWords = allFactors.split(' ');
      
      for (const word of factorWords) {
        if (scenarioLower.includes(word.toLowerCase())) {
          relevanceScore += 1;
        }
      }
      
      // Check tradeoff name and description
      if (scenarioLower.includes(tradeoff.name.toLowerCase().split(' vs ')[0]) ||
          scenarioLower.includes(tradeoff.name.toLowerCase().split(' vs ')[1])) {
        relevanceScore += 2;
      }
      
      if (relevanceScore > 0) {
        relevant.push({
          key,
          tradeoff,
          relevanceScore
        });
      }
    }
    
    return relevant.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async analyzeScenario(scenario, constraints, stakeholders) {
    console.log(chalk.cyan('🔍 Analyzing scenario and constraints...'));
    
    const analysis = {
      priorities: {},
      constraints: this.parseConstraints(constraints),
      stakeholderNeeds: this.analyzeStakeholders(stakeholders),
      contextFactors: await this.analyzeContext(scenario),
      riskFactors: this.identifyRiskFactors(scenario, constraints)
    };

    // Use AI to enhance analysis
    const aiAnalysis = await this.getAIAnalysis(scenario, constraints, stakeholders);
    analysis.aiInsights = aiAnalysis;

    return analysis;
  }

  parseConstraints(constraints) {
    const parsed = {
      timeline: constraints.timeline || 'flexible',
      budget: constraints.budget || 'moderate',
      quality: constraints.quality || 'standard',
      performance: constraints.performance || 'standard',
      security: constraints.security || 'standard',
      scalability: constraints.scalability || 'moderate'
    };

    // Convert string constraints to numeric scores
    const stringToScore = {
      'low': 1, 'minimal': 1,
      'moderate': 2, 'standard': 2, 'medium': 2,
      'high': 3, 'critical': 3, 'maximum': 3
    };

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && stringToScore[value.toLowerCase()]) {
        parsed[key] = stringToScore[value.toLowerCase()];
      }
    }

    return parsed;
  }

  analyzeStakeholders(stakeholders) {
    const needs = {
      developers: { priority: 'maintainability', secondary: 'productivity' },
      users: { priority: 'usability', secondary: 'performance' },
      business: { priority: 'features', secondary: 'timeline' },
      operations: { priority: 'stability', secondary: 'scalability' },
      security: { priority: 'security', secondary: 'compliance' }
    };

    const relevantNeeds = {};
    
    for (const stakeholder of stakeholders) {
      const type = stakeholder.toLowerCase();
      if (needs[type]) {
        relevantNeeds[type] = needs[type];
      }
    }

    return relevantNeeds;
  }

  async analyzeContext(scenario) {
    // Analyze current project context
    const context = {
      projectStage: this.determineProjectStage(scenario),
      teamSize: 'medium', // Could be determined from project
      timeframe: this.extractTimeframe(scenario),
      complexity: this.assessComplexity(scenario)
    };

    return context;
  }

  determineProjectStage(scenario) {
    const scenarioLower = scenario.toLowerCase();
    
    if (scenarioLower.includes('prototype') || scenarioLower.includes('proof of concept')) {
      return 'prototype';
    } else if (scenarioLower.includes('mvp') || scenarioLower.includes('minimum viable')) {
      return 'mvp';
    } else if (scenarioLower.includes('production') || scenarioLower.includes('launch')) {
      return 'production';
    } else if (scenarioLower.includes('mature') || scenarioLower.includes('established')) {
      return 'mature';
    }
    
    return 'development';
  }

  extractTimeframe(scenario) {
    const scenarioLower = scenario.toLowerCase();
    
    if (scenarioLower.includes('urgent') || scenarioLower.includes('asap')) return 'urgent';
    if (scenarioLower.includes('week')) return 'weeks';
    if (scenarioLower.includes('month')) return 'months';
    if (scenarioLower.includes('year')) return 'long-term';
    
    return 'moderate';
  }

  assessComplexity(scenario) {
    const complexityIndicators = [
      'microservices', 'distributed', 'real-time', 'machine learning',
      'blockchain', 'integration', 'legacy', 'multiple teams'
    ];
    
    const matches = complexityIndicators.filter(indicator => 
      scenario.toLowerCase().includes(indicator)
    );
    
    if (matches.length === 0) return 'low';
    if (matches.length <= 2) return 'medium';
    return 'high';
  }

  identifyRiskFactors(scenario, constraints) {
    const risks = [];
    
    if (constraints.timeline === 'urgent') {
      risks.push({ type: 'schedule', level: 'high', description: 'Tight timeline increases quality risks' });
    }
    
    if (constraints.budget === 'low') {
      risks.push({ type: 'resource', level: 'medium', description: 'Limited budget may constrain options' });
    }
    
    const scenarioLower = scenario.toLowerCase();
    if (scenarioLower.includes('new technology')) {
      risks.push({ type: 'technical', level: 'medium', description: 'New technology adoption risk' });
    }
    
    if (scenarioLower.includes('legacy')) {
      risks.push({ type: 'integration', level: 'high', description: 'Legacy system integration complexity' });
    }

    return risks;
  }

  async getAIAnalysis(scenario, constraints, stakeholders) {
    try {
      const prompt = `Analyze this software development tradeoff scenario:

Scenario: ${scenario}
Constraints: ${JSON.stringify(constraints)}
Stakeholders: ${stakeholders.join(', ')}

Please provide:
1. Key priorities and concerns
2. Critical success factors
3. Major risks and challenges
4. Stakeholder alignment issues
5. Recommended approach strategy

Keep the analysis practical and actionable.`;

      const analysis = await this.agent.aiProvider.query(prompt, {
        taskType: 'tradeoffAnalysis',
        maxTokens: 800
      });

      return analysis;
      
    } catch (error) {
      return 'AI analysis unavailable: ' + error.message;
    }
  }

  async generateOptions(relevantTradeoffs, analysis) {
    console.log(chalk.cyan('💡 Generating solution options...'));
    
    const options = [];
    
    for (const { key, tradeoff } of relevantTradeoffs.slice(0, 3)) { // Top 3 relevant
      const factorKeys = Object.keys(tradeoff.factors);
      
      // Generate option for each factor emphasis
      for (const factorKey of factorKeys) {
        const option = {
          id: `${key}_${factorKey}`,
          name: `${factorKey.charAt(0).toUpperCase() + factorKey.slice(1)}-Focused Approach`,
          description: tradeoff.recommendations[`${factorKey}_focused`] || `Prioritize ${factorKey}`,
          tradeoff: key,
          emphasis: factorKey,
          benefits: tradeoff.factors[factorKey].benefits,
          costs: tradeoff.factors[factorKey].costs,
          metrics: tradeoff.factors[factorKey].metrics
        };
        
        options.push(option);
      }
      
      // Generate balanced option
      if (tradeoff.recommendations.balanced) {
        options.push({
          id: `${key}_balanced`,
          name: 'Balanced Approach',
          description: tradeoff.recommendations.balanced,
          tradeoff: key,
          emphasis: 'balanced',
          benefits: this.combineFactorLists(tradeoff.factors, 'benefits'),
          costs: this.combineFactorLists(tradeoff.factors, 'costs'),
          metrics: this.combineFactorLists(tradeoff.factors, 'metrics')
        });
      }
    }

    return this.deduplicateOptions(options);
  }

  combineFactorLists(factors, listType) {
    const combined = [];
    for (const factor of Object.values(factors)) {
      combined.push(...factor[listType].slice(0, 2)); // Take top 2 from each
    }
    return [...new Set(combined)]; // Remove duplicates
  }

  deduplicateOptions(options) {
    const unique = new Map();
    
    for (const option of options) {
      const key = `${option.emphasis}_${option.tradeoff}`;
      if (!unique.has(key) || unique.get(key).benefits.length < option.benefits.length) {
        unique.set(key, option);
      }
    }
    
    return Array.from(unique.values());
  }

  async evaluateOptions(options, analysis) {
    console.log(chalk.cyan('📊 Evaluating options against criteria...'));
    
    const evaluations = [];
    
    for (const option of options) {
      const evaluation = {
        option: option.id,
        name: option.name,
        scores: {},
        totalScore: 0,
        ranking: 0,
        pros: [],
        cons: [],
        feasibility: 'medium',
        recommendation: ''
      };
      
      // Score against constraints
      evaluation.scores.timeline = this.scoreAgainstConstraint(option, 'timeline', analysis.constraints);
      evaluation.scores.quality = this.scoreAgainstConstraint(option, 'quality', analysis.constraints);
      evaluation.scores.performance = this.scoreAgainstConstraint(option, 'performance', analysis.constraints);
      evaluation.scores.security = this.scoreAgainstConstraint(option, 'security', analysis.constraints);
      
      // Score against stakeholder needs
      evaluation.scores.stakeholders = this.scoreAgainstStakeholders(option, analysis.stakeholderNeeds);
      
      // Calculate total score
      evaluation.totalScore = Object.values(evaluation.scores).reduce((sum, score) => sum + score, 0);
      
      // Determine feasibility
      evaluation.feasibility = this.assessFeasibility(option, analysis);
      
      // Generate pros and cons
      evaluation.pros = this.generatePros(option, analysis);
      evaluation.cons = this.generateCons(option, analysis);
      
      evaluations.push(evaluation);
    }
    
    // Rank options
    evaluations.sort((a, b) => b.totalScore - a.totalScore);
    evaluations.forEach((evaluation, index) => {
      evaluation.ranking = index + 1;
    });

    return evaluations;
  }

  scoreAgainstConstraint(option, constraintType, constraints) {
    const constraintValue = constraints[constraintType] || 2;
    let score = 2; // Base score
    
    // Adjust score based on option emphasis and constraint
    if (option.emphasis === constraintType) {
      score = constraintValue; // Direct match
    } else if (option.emphasis === 'balanced') {
      score = Math.min(constraintValue + 1, 3); // Balanced gets slight bonus
    } else {
      // Check if emphasis conflicts with constraint
      const conflicts = {
        'speed': ['quality', 'security'],
        'performance': ['maintainability'],
        'features': ['stability'],
        'scalability': ['simplicity'],
        'security': ['usability']
      };
      
      if (conflicts[option.emphasis]?.includes(constraintType)) {
        score = Math.max(constraintValue - 1, 1);
      }
    }
    
    return score;
  }

  scoreAgainstStakeholders(option, stakeholderNeeds) {
    let totalScore = 0;
    let stakeholderCount = 0;
    
    for (const needs of Object.values(stakeholderNeeds)) {
      let stakeholderScore = 2; // Base score
      
      if (option.emphasis === needs.priority) {
        stakeholderScore = 3;
      } else if (option.emphasis === needs.secondary) {
        stakeholderScore = 2.5;
      } else if (option.emphasis === 'balanced') {
        stakeholderScore = 2.5;
      }
      
      totalScore += stakeholderScore;
      stakeholderCount++;
    }
    
    return stakeholderCount > 0 ? totalScore / stakeholderCount : 2;
  }

  assessFeasibility(option, analysis) {
    let feasibilityScore = 2; // Base: medium
    
    // Adjust based on context
    if (analysis.contextFactors.complexity === 'high' && option.emphasis !== 'simplicity') {
      feasibilityScore -= 0.5;
    }
    
    if (analysis.contextFactors.projectStage === 'prototype' && option.emphasis === 'scalability') {
      feasibilityScore -= 0.5;
    }
    
    if (analysis.constraints.budget <= 1 && ['performance', 'scalability'].includes(option.emphasis)) {
      feasibilityScore -= 0.5;
    }
    
    if (feasibilityScore <= 1.5) return 'low';
    if (feasibilityScore >= 2.5) return 'high';
    return 'medium';
  }

  generatePros(option, analysis) {
    const pros = [...option.benefits];
    
    // Add context-specific pros
    if (option.emphasis === 'speed' && analysis.contextFactors.timeframe === 'urgent') {
      pros.push('Meets urgent timeline requirements');
    }
    
    if (option.emphasis === 'balanced') {
      pros.push('Reduces extreme risks', 'Satisfies multiple stakeholders');
    }
    
    return pros.slice(0, 4); // Limit to top 4
  }

  generateCons(option, analysis) {
    const cons = [...option.costs];
    
    // Add context-specific cons
    if (option.emphasis === 'performance' && analysis.contextFactors.teamSize === 'small') {
      cons.push('May require specialized expertise');
    }
    
    // Add risk-based cons
    for (const risk of analysis.riskFactors) {
      if (this.optionAmplifiesRisk(option, risk)) {
        cons.push(`May amplify ${risk.type} risks`);
      }
    }
    
    return cons.slice(0, 4); // Limit to top 4
  }

  optionAmplifiesRisk(option, risk) {
    const amplifications = {
      'schedule': ['quality', 'security'],
      'technical': ['performance', 'scalability'],
      'resource': ['features', 'quality'],
      'integration': ['features', 'performance']
    };
    
    return amplifications[risk.type]?.includes(option.emphasis);
  }

  generateRecommendations(evaluations, analysis) {
    const recommendations = {
      primary: evaluations[0],
      alternatives: evaluations.slice(1, 3),
      considerations: [],
      implementation: {},
      warnings: []
    };
    
    // Generate implementation guidance
    recommendations.implementation = this.generateImplementationGuidance(
      recommendations.primary, 
      analysis
    );
    
    // Generate considerations
    recommendations.considerations = this.generateConsiderations(evaluations, analysis);
    
    // Generate warnings
    recommendations.warnings = this.generateWarnings(recommendations.primary, analysis);

    return recommendations;
  }

  generateImplementationGuidance(primaryOption, analysis) {
    const guidance = {
      phases: [],
      milestones: [],
      riskMitigation: [],
      successMetrics: primaryOption.option.metrics || []
    };
    
    // Generate phases based on option
    if (primaryOption.name.includes('Speed')) {
      guidance.phases = [
        'Rapid prototyping and core features',
        'Essential functionality delivery',
        'Quality improvement iteration'
      ];
    } else if (primaryOption.name.includes('Quality')) {
      guidance.phases = [
        'Architecture and design foundation',
        'Core implementation with testing',
        'Quality validation and optimization'
      ];
    } else if (primaryOption.name.includes('Balanced')) {
      guidance.phases = [
        'Foundation and planning',
        'Iterative development with quality gates',
        'Integration and optimization'
      ];
    }
    
    // Generate milestones
    guidance.milestones = [
      `Complete Phase 1: ${guidance.phases[0]}`,
      'Stakeholder review and feedback',
      'Risk assessment checkpoint',
      'Final delivery and evaluation'
    ];
    
    // Risk mitigation
    guidance.riskMitigation = analysis.riskFactors.map(risk => 
      `Monitor and address ${risk.type} risks through ${this.getRiskMitigation(risk.type)}`
    );

    return guidance;
  }

  getRiskMitigation(riskType) {
    const mitigations = {
      'schedule': 'regular progress reviews and scope adjustments',
      'technical': 'proof of concepts and expert consultation',
      'resource': 'careful resource allocation and contingency planning',
      'integration': 'early integration testing and parallel development'
    };
    
    return mitigations[riskType] || 'careful monitoring and contingency planning';
  }

  generateConsiderations(evaluations, analysis) {
    const considerations = [];
    
    // Close scores consideration
    const topTwo = evaluations.slice(0, 2);
    if (topTwo[1] && Math.abs(topTwo[0].totalScore - topTwo[1].totalScore) < 1) {
      considerations.push(`Consider hybrid approach: ${topTwo[0].name} initially, then ${topTwo[1].name}`);
    }
    
    // Stakeholder alignment
    if (Object.keys(analysis.stakeholderNeeds).length > 2) {
      considerations.push('Multiple stakeholders require careful change management and communication');
    }
    
    // Context-specific considerations
    if (analysis.contextFactors.complexity === 'high') {
      considerations.push('High complexity requires experienced team and careful risk management');
    }

    return considerations;
  }

  generateWarnings(primaryOption, analysis) {
    const warnings = [];
    
    // Budget warnings
    if (analysis.constraints.budget <= 1 && primaryOption.name.includes('Quality')) {
      warnings.push('Quality-focused approach may exceed budget constraints');
    }
    
    // Timeline warnings
    if (analysis.constraints.timeline >= 3 && primaryOption.name.includes('Speed')) {
      warnings.push('Speed-focused approach may compromise long-term maintainability');
    }
    
    // Risk warnings
    for (const risk of analysis.riskFactors) {
      if (risk.level === 'high') {
        warnings.push(`High ${risk.type} risk: ${risk.description}`);
      }
    }

    return warnings;
  }

  generateNegotiationSummary(negotiation) {
    const results = negotiation.results;
    const primary = results.recommendations.primary;
    
    return {
      id: negotiation.id,
      scenario: negotiation.scenario,
      duration: Math.round((negotiation.endTime - negotiation.startTime) / 1000) + 's',
      recommendation: {
        approach: primary.name,
        confidence: this.calculateConfidence(primary.totalScore, results.evaluations),
        feasibility: primary.feasibility,
        ranking: `${primary.ranking} of ${results.evaluations.length}`
      },
      tradeoffs: results.relevantTradeoffs.length,
      options: results.options.length,
      keyConsiderations: results.recommendations.considerations.slice(0, 3),
      warnings: results.recommendations.warnings.length
    };
  }

  calculateConfidence(score, allEvaluations) {
    const maxScore = Math.max(...allEvaluations.map(e => e.totalScore));
    const confidence = (score / maxScore) * 100;
    
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  async createTradeoffCriteria(name, criteria) {
    console.log(chalk.blue(`📋 Creating custom tradeoff criteria: ${name}`));
    
    const criteriaId = this.generateCriteriaId();
    
    this.criteria.set(criteriaId, {
      id: criteriaId,
      name,
      criteria,
      created: new Date()
    });
    
    return {
      success: true,
      criteriaId,
      message: `Custom criteria '${name}' created successfully`
    };
  }

  getNegotiation(negotiationId) {
    return this.negotiations.get(negotiationId);
  }

  listNegotiations() {
    return Array.from(this.negotiations.values()).map(n => ({
      id: n.id,
      scenario: n.scenario,
      status: n.status,
      startTime: n.startTime,
      stakeholders: n.stakeholders?.length || 0
    }));
  }

  getTradeoffPatterns() {
    return Array.from(this.tradeoffs.entries()).map(([key, tradeoff]) => ({
      key,
      name: tradeoff.name,
      description: tradeoff.description,
      factors: Object.keys(tradeoff.factors)
    }));
  }

  generateNegotiationId() {
    return `negotiation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCriteriaId() {
    return `criteria_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
