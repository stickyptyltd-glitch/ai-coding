import chalk from 'chalk';

export class MultiAgentSystem {
  constructor(agent) {
    this.agent = agent;
    this.agents = new Map();
    this.conversations = new Map();
    this.taskQueue = [];
    this.activeCollaborations = new Map();
    this.agentPerformance = new Map();
    this.communicationChannels = new Map();
    this.consensusEngine = new ConsensusEngine();
    this.taskDelegator = new TaskDelegator();
    this.agentFactory = new DynamicAgentFactory();
    this.coordinationProtocols = new Map();

    this.initializeAgents();
    this.initializeCoordinationProtocols();
  }

  initializeCoordinationProtocols() {
    // Define coordination protocols for different types of tasks
    this.coordinationProtocols.set('code_review', {
      phases: ['individual_review', 'discussion', 'consensus', 'final_decision'],
      requiredAgents: ['senior_dev', 'security_expert', 'performance_expert'],
      optionalAgents: ['tester', 'doc_writer'],
      timeoutPerPhase: 30000, // 30 seconds
      consensusThreshold: 0.7
    });

    this.coordinationProtocols.set('architecture_design', {
      phases: ['requirements_analysis', 'design_proposals', 'evaluation', 'refinement', 'finalization'],
      requiredAgents: ['architect', 'senior_dev', 'devops_expert'],
      optionalAgents: ['security_expert', 'performance_expert'],
      timeoutPerPhase: 60000, // 60 seconds
      consensusThreshold: 0.8
    });

    this.coordinationProtocols.set('debugging', {
      phases: ['error_analysis', 'hypothesis_generation', 'solution_proposals', 'validation'],
      requiredAgents: ['debugger', 'senior_dev'],
      optionalAgents: ['security_expert', 'tester'],
      timeoutPerPhase: 45000, // 45 seconds
      consensusThreshold: 0.6
    });

    console.log(chalk.blue('🤝 Coordination protocols initialized'));
  }

  async initialize() {
    try {
      // Initialize all subsystems
      await this.consensusEngine.initialize();
      await this.taskDelegator.initialize();
      await this.agentFactory.initialize();

      // Set up communication channels
      this.setupCommunicationChannels();

      console.log(chalk.green('✅ Multi-Agent System fully initialized'));
      return { success: true };
    } catch (error) {
      console.log(chalk.red('❌ Multi-Agent System initialization failed:', error.message));
      return { success: false, error: error.message };
    }
  }

  setupCommunicationChannels() {
    // Create communication channels between agents
    const agentIds = Array.from(this.agents.keys());

    for (const agentId of agentIds) {
      this.communicationChannels.set(agentId, {
        inbox: [],
        outbox: [],
        subscriptions: new Set(),
        messageHistory: []
      });
    }

    // Set up broadcast channel for system-wide messages
    this.communicationChannels.set('broadcast', {
      subscribers: new Set(agentIds),
      messageHistory: []
    });
  }

  initializeAgents() {
    // Enhanced Senior Developer Agent
    this.agents.set('senior_dev', {
      id: 'senior_dev',
      role: 'Senior Developer',
      personality: 'Experienced, architectural thinking, best practices focused',
      expertise: ['system design', 'performance', 'scalability', 'code review'],
      capabilities: ['code_analysis', 'architecture_review', 'mentoring', 'technical_leadership'],
      communicationStyle: 'direct_and_technical',
      workload: 0,
      availability: 1.0,
      performanceScore: 0.9,
      systemPrompt: `You are a Senior Developer with 10+ years of experience. You focus on:
- Architectural decisions and system design
- Performance optimization and scalability
- Code quality and best practices
- Technical debt management
- Security considerations

Respond in a professional, mentoring tone. Provide strategic insights and long-term thinking.`,
      emoji: '🏗️'
    });

    // Enhanced Tester Agent
    this.agents.set('tester', {
      id: 'tester',
      role: 'QA Engineer',
      personality: 'Detail-oriented, thorough, edge-case focused',
      expertise: ['testing strategies', 'edge cases', 'automation', 'quality assurance'],
      capabilities: ['test_design', 'automation_setup', 'bug_detection', 'quality_metrics'],
      communicationStyle: 'methodical_and_detailed',
      workload: 0,
      availability: 1.0,
      performanceScore: 0.88,
      systemPrompt: `You are an expert QA Engineer focused on testing and quality. You excel at:
- Identifying edge cases and potential bugs
- Creating comprehensive test strategies
- Test automation and CI/CD integration
- Performance and security testing
- User acceptance criteria

Think like a tester - what could go wrong? What needs to be tested? Be thorough and methodical.`,
      emoji: '🧪'
    });

    // Documentation Writer
    this.agents.set('doc_writer', {
      role: 'Technical Writer',
      personality: 'Clear communicator, user-focused, comprehensive',
      expertise: ['documentation', 'API docs', 'user guides', 'technical communication'],
      systemPrompt: `You are a Technical Writer specializing in developer documentation. You create:
- Clear, comprehensive API documentation
- User-friendly guides and tutorials
- Code comments that explain why, not just what
- Architecture decision records (ADRs)
- Onboarding documentation

Write for different audiences - developers, users, stakeholders. Make complex topics accessible.`,
      emoji: '📚'
    });

    // DevOps Engineer
    this.agents.set('devops', {
      role: 'DevOps Engineer',
      personality: 'Automation-focused, reliability-oriented, infrastructure-minded',
      expertise: ['deployment', 'monitoring', 'infrastructure', 'automation'],
      systemPrompt: `You are a DevOps Engineer focused on deployment and operations. Your expertise includes:
- CI/CD pipelines and automation
- Infrastructure as Code (IaC)
- Monitoring, logging, and observability
- Security and compliance
- Performance and reliability

Think about operational concerns - how will this be deployed, monitored, and maintained?`,
      emoji: '⚡'
    });

    // Product Owner
    this.agents.set('product', {
      role: 'Product Owner',
      personality: 'User-focused, business-oriented, priority-driven',
      expertise: ['user needs', 'business value', 'prioritization', 'requirements'],
      systemPrompt: `You are a Product Owner focused on user needs and business value. You consider:
- User experience and customer needs
- Business objectives and ROI
- Feature prioritization and roadmaps
- Acceptance criteria and definitions of done
- Market competition and trends

Always think from the user's perspective - what value does this provide? What problems does it solve?`,
      emoji: '🎯'
    });

    // Security Specialist
    this.agents.set('security', {
      role: 'Security Specialist',
      personality: 'Security-first, risk-aware, thorough',
      expertise: ['security analysis', 'vulnerability assessment', 'compliance', 'threat modeling'],
      systemPrompt: `You are a Security Specialist focused on secure coding and system security. You analyze:
- Security vulnerabilities and threats
- Data protection and privacy concerns
- Authentication and authorization
- Secure coding practices
- Compliance requirements

Think like an attacker - what could be exploited? How can we make this more secure?`,
      emoji: '🔒'
    });
  }

  // Enhanced collaboration with dynamic agent selection and coordination protocols
  async collaborate(task, agentRoles = null, options = {}) {
    console.log(chalk.blue(`🤝 Starting enhanced multi-agent collaboration on: ${task}`));

    const conversationId = this.generateConversationId();

    // Dynamic agent selection if not specified
    if (!agentRoles) {
      agentRoles = await this.selectOptimalAgents(task, options);
      console.log(chalk.cyan(`🎯 Selected agents: ${agentRoles.join(', ')}`));
    }

    // Determine coordination protocol
    const protocol = this.determineCoordinationProtocol(task, agentRoles);
    console.log(chalk.cyan(`📋 Using protocol: ${protocol.name}`));

    const collaboration = {
      id: conversationId,
      task,
      participants: agentRoles,
      protocol,
      startTime: new Date(),
      phases: [],
      discussions: [],
      decisions: [],
      outputs: {},
      metrics: {
        totalTime: 0,
        phaseTimings: {},
        participationRates: {},
        consensusScore: 0
      }
    };

    this.activeCollaborations.set(conversationId, collaboration);

    try {
      // Execute coordination protocol phases
      for (const phase of protocol.phases) {
        const phaseStartTime = Date.now();
        console.log(chalk.cyan(`🔄 Phase: ${phase}`));

        const phaseResult = await this.executeCollaborationPhase(
          phase,
          task,
          collaboration,
          agentRoles,
          options
        );

        const phaseDuration = Date.now() - phaseStartTime;
        collaboration.phases.push({
          name: phase,
          result: phaseResult,
          duration: phaseDuration,
          timestamp: new Date()
        });

        collaboration.metrics.phaseTimings[phase] = phaseDuration;

        // Check for early termination conditions
        if (phaseResult.shouldTerminate) {
          console.log(chalk.yellow(`⏹️ Early termination in phase: ${phase}`));
          break;
        }
      }

      // Final consensus and output generation
      const finalResult = await this.generateFinalOutput(collaboration);
      collaboration.outputs.final = finalResult;
      collaboration.metrics.totalTime = Date.now() - collaboration.startTime.getTime();

      // Update agent performance metrics
      this.updateAgentPerformanceMetrics(collaboration);

      console.log(chalk.green(`✅ Collaboration completed in ${collaboration.metrics.totalTime}ms`));

      return {
        success: true,
        collaborationId: conversationId,
        result: finalResult,
        metrics: collaboration.metrics,
        participants: agentRoles
      };

      // Phase 4: Deliverable Generation
      console.log(chalk.cyan('📦 Phase 4: Generating Deliverables'));
      const deliverables = await this.generateDeliverables(task, consensus, agentRoles);
      collaboration.outputs = deliverables;

      collaboration.endTime = new Date();
      collaboration.duration = collaboration.endTime - collaboration.startTime;

      return {
        success: true,
        conversationId,
        collaboration,
        summary: this.generateCollaborationSummary(collaboration)
      };

    } catch (error) {
      console.error(chalk.red('Collaboration failed:'), error);
      return {
        success: false,
        error: error.message,
        conversationId,
        partialResults: collaboration
      };
    }
  }

  // Enhanced methods for improved multi-agent coordination
  determineCoordinationProtocol(task, agentRoles) {
    const taskLower = task.toLowerCase();

    // Check for specific protocol matches
    for (const [protocolName, protocol] of this.coordinationProtocols) {
      if (taskLower.includes(protocolName.replace('_', ' '))) {
        return { name: protocolName, ...protocol };
      }
    }

    // Default protocol based on agent count and task complexity
    if (agentRoles.length > 4) {
      return {
        name: 'large_group_consensus',
        phases: ['individual_analysis', 'subgroup_discussion', 'cross_group_synthesis', 'final_consensus'],
        timeoutPerPhase: 45000,
        consensusThreshold: 0.75
      };
    } else if (taskLower.includes('urgent') || taskLower.includes('critical')) {
      return {
        name: 'rapid_response',
        phases: ['quick_analysis', 'immediate_decision'],
        timeoutPerPhase: 15000,
        consensusThreshold: 0.6
      };
    } else {
      return {
        name: 'standard_collaboration',
        phases: ['individual_analysis', 'discussion', 'consensus', 'validation'],
        timeoutPerPhase: 30000,
        consensusThreshold: 0.7
      };
    }
  }

  async executeCollaborationPhase(phase, task, collaboration, agentRoles, options) {
    const phaseStartTime = Date.now();
    const timeout = collaboration.protocol.timeoutPerPhase || 30000;

    try {
      switch (phase) {
        case 'individual_analysis':
          return await this.executeIndividualAnalysis(task, agentRoles, timeout);

        case 'discussion':
        case 'subgroup_discussion':
        case 'cross_group_synthesis':
          return await this.executeDiscussionPhase(task, collaboration, agentRoles, timeout);

        case 'consensus':
        case 'final_consensus':
          return await this.executeConsensusPhase(task, collaboration, agentRoles, timeout);

        case 'validation':
          return await this.executeValidationPhase(task, collaboration, agentRoles, timeout);

        case 'quick_analysis':
          return await this.executeQuickAnalysis(task, agentRoles, timeout / 2);

        case 'immediate_decision':
          return await this.executeImmediateDecision(task, collaboration, agentRoles, timeout / 2);

        default:
          throw new Error(`Unknown collaboration phase: ${phase}`);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Phase ${phase} failed: ${error.message}`));
      return {
        success: false,
        error: error.message,
        phase,
        duration: Date.now() - phaseStartTime
      };
    }
  }

  async executeIndividualAnalysis(task, agentRoles, timeout) {
    console.log(chalk.blue('🔍 Executing individual analysis phase'));

    const analyses = await Promise.allSettled(
      agentRoles.map(async (roleId) => {
        const agent = this.agents.get(roleId);
        if (!agent) throw new Error(`Agent ${roleId} not found`);

        const analysisPrompt = `${agent.systemPrompt}

Task: ${task}

Provide your individual analysis from your perspective as a ${agent.role}. Focus on:
1. Key considerations from your domain expertise
2. Potential challenges or risks you foresee
3. Your recommended approach or solution
4. Dependencies or requirements you identify

Be concise but thorough. Limit to 200 words.`;

        const response = await this.agent.aiProvider.query(analysisPrompt, {
          taskType: 'individual_analysis',
          maxTokens: 300,
          timeout: timeout * 0.8 // Leave buffer for processing
        });

        return {
          agent: roleId,
          role: agent.role,
          analysis: response,
          timestamp: new Date()
        };
      })
    );

    const successfulAnalyses = analyses
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    const failedAnalyses = analyses
      .filter(result => result.status === 'rejected')
      .map(result => ({ error: result.reason.message }));

    if (failedAnalyses.length > 0) {
      console.log(chalk.yellow(`⚠️ ${failedAnalyses.length} analyses failed`));
    }

    return {
      success: true,
      analyses: successfulAnalyses,
      failures: failedAnalyses,
      participationRate: successfulAnalyses.length / agentRoles.length
    };
  }

  async gatherIndividualAnalyses(task, agentRoles) {
    const analyses = [];
    
    for (const roleId of agentRoles) {
      const agent = this.agents.get(roleId);
      if (!agent) continue;

      console.log(chalk.yellow(`  ${agent.emoji} ${agent.role} analyzing...`));
      
      const prompt = `${agent.systemPrompt}

Task: ${task}

Please provide your analysis from your perspective as a ${agent.role}. Consider:
1. Key concerns from your domain
2. Potential challenges or risks
3. Requirements and considerations
4. Initial recommendations

Keep your response focused and practical.`;

      try {
        const analysis = await this.agent.aiProvider.query(prompt, {
          taskType: 'collaboration',
          maxTokens: 800
        });

        analyses.push({
          agent: roleId,
          role: agent.role,
          analysis,
          timestamp: new Date(),
          phase: 'individual_analysis'
        });

      } catch (error) {
        console.log(chalk.red(`  Failed to get analysis from ${agent.role}: ${error.message}`));
      }
    }

    return analyses;
  }

  async facilitateDiscussion(task, analyses, agentRoles) {
    const discussions = [];
    
    // Create discussion context
    const context = analyses.map(a => 
      `${a.role}: ${a.analysis}`
    ).join('\n\n');

    // Each agent responds to others' analyses
    for (const roleId of agentRoles) {
      const agent = this.agents.get(roleId);
      if (!agent) continue;

      console.log(chalk.yellow(`  ${agent.emoji} ${agent.role} discussing...`));
      
      const prompt = `${agent.systemPrompt}

Original Task: ${task}

Here are the analyses from your team members:
${context}

Based on these perspectives, provide your thoughts on:
1. Points you agree/disagree with and why
2. Additional considerations they might have missed
3. How your expertise complements or conflicts with theirs
4. Suggested compromises or solutions

Be collaborative but don't compromise your professional standards.`;

      try {
        const discussion = await this.agent.aiProvider.query(prompt, {
          taskType: 'collaboration',
          maxTokens: 600
        });

        discussions.push({
          agent: roleId,
          role: agent.role,
          discussion,
          timestamp: new Date(),
          phase: 'cross_discussion'
        });

      } catch (error) {
        console.log(chalk.red(`  Failed to get discussion from ${agent.role}: ${error.message}`));
      }
    }

    return discussions;
  }

  async buildConsensus(task, allDiscussions, agentRoles) {
    console.log(chalk.yellow('  🎭 Facilitating consensus...'));
    
    const discussionContext = allDiscussions
      .map(d => `${d.role} (${d.phase}): ${d.analysis || d.discussion}`)
      .join('\n\n');

    const prompt = `You are facilitating a technical discussion between multiple specialists about this task:

Task: ${task}

Team Discussion:
${discussionContext}

Please synthesize the discussion into a consensus that:
1. Addresses the main concerns raised by each specialist
2. Balances different perspectives and constraints
3. Provides a clear path forward
4. Identifies any remaining risks or decisions needed
5. Defines success criteria and next steps

The consensus should be practical and implementable, considering input from all team members.`;

    try {
      const consensus = await this.agent.aiProvider.query(prompt, {
        taskType: 'consensus',
        maxTokens: 1000
      });

      return {
        consensus,
        participants: agentRoles.map(roleId => this.agents.get(roleId)?.role).filter(Boolean),
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to build consensus: ${error.message}`);
    }
  }

  async generateDeliverables(task, consensusResult, agentRoles) {
    const deliverables = {};
    
    // Generate role-specific deliverables based on consensus
    for (const roleId of agentRoles) {
      const agent = this.agents.get(roleId);
      if (!agent) continue;

      console.log(chalk.yellow(`  ${agent.emoji} ${agent.role} creating deliverables...`));
      
      const prompt = `${agent.systemPrompt}

Task: ${task}

Team Consensus:
${consensusResult.consensus}

Based on the consensus, create your specific deliverable as a ${agent.role}:

${this.getDeliverablePrompt(roleId)}

Make it practical and actionable, ready to be implemented or used.`;

      try {
        const deliverable = await this.agent.aiProvider.query(prompt, {
          taskType: 'deliverable',
          maxTokens: 1200
        });

        deliverables[roleId] = {
          role: agent.role,
          deliverable,
          timestamp: new Date()
        };

      } catch (error) {
        console.log(chalk.red(`  Failed to generate ${agent.role} deliverable: ${error.message}`));
      }
    }

    return deliverables;
  }

  getDeliverablePrompt(roleId) {
    const prompts = {
      senior_dev: `
- System architecture and technical approach
- Code structure and key components
- Performance and scalability considerations
- Implementation roadmap and milestones`,

      tester: `
- Test strategy and approach
- Test cases for key scenarios
- Edge cases and error conditions
- Automation requirements and tools`,

      doc_writer: `
- Documentation outline and structure
- User guide sections and content
- API documentation requirements
- Code commenting standards`,

      devops: `
- Deployment strategy and pipeline
- Infrastructure requirements
- Monitoring and logging plan
- Rollback and recovery procedures`,

      product: `
- User stories and acceptance criteria
- Success metrics and KPIs
- Priority and timeline recommendations
- Stakeholder communication plan`,

      security: `
- Security requirements and constraints
- Threat model and risk assessment
- Security testing recommendations
- Compliance considerations`
    };

    return prompts[roleId] || 'Create your professional deliverable for this task.';
  }

  generateCollaborationSummary(collaboration) {
    const participantRoles = collaboration.participants.map(roleId => 
      this.agents.get(roleId)?.role
    ).filter(Boolean);

    return {
      task: collaboration.task,
      participants: participantRoles,
      duration: Math.round(collaboration.duration / 1000) + ' seconds',
      discussionRounds: collaboration.discussions.length,
      decisionsReached: collaboration.decisions.length,
      deliverablesCreated: Object.keys(collaboration.outputs).length,
      keyInsights: this.extractKeyInsights(collaboration),
      nextSteps: this.extractNextSteps(collaboration)
    };
  }

  extractKeyInsights(collaboration) {
    // Extract key points from the consensus
    const consensus = collaboration.decisions[0]?.consensus || '';
    const insights = [];
    
    // Simple extraction based on common patterns
    const sentences = consensus.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes('important') ||
          sentence.toLowerCase().includes('critical') ||
          sentence.toLowerCase().includes('key')) {
        insights.push(sentence.trim());
      }
    });

    return insights.slice(0, 3);
  }

  extractNextSteps(collaboration) {
    const consensus = collaboration.decisions[0]?.consensus || '';
    const steps = [];
    
    // Look for action items and next steps
    const actionWords = ['should', 'must', 'need to', 'implement', 'create', 'develop'];
    const sentences = consensus.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      if (actionWords.some(word => sentence.toLowerCase().includes(word))) {
        steps.push(sentence.trim());
      }
    });

    return steps.slice(0, 5);
  }

  async roleplayConversation(topic, participants, rounds = 3) {
    console.log(chalk.blue(`🎭 Starting roleplay conversation: ${topic}`));
    
    const conversationId = this.generateConversationId();
    const conversation = {
      id: conversationId,
      topic,
      participants,
      rounds,
      messages: [],
      startTime: new Date()
    };

    // Initialize conversation with the topic
    let currentContext = `Topic: ${topic}`;
    
    for (let round = 1; round <= rounds; round++) {
      console.log(chalk.cyan(`Round ${round}:`));
      
      for (const roleId of participants) {
        const agent = this.agents.get(roleId);
        if (!agent) continue;

        console.log(chalk.yellow(`  ${agent.emoji} ${agent.role}:`));
        
        const prompt = `${agent.systemPrompt}

Conversation Topic: ${topic}

Previous conversation:
${currentContext}

Continue this conversation from your perspective as a ${agent.role}. 
Be natural and engaging, while staying true to your professional role.
Keep your response concise (2-3 sentences).`;

        try {
          const response = await this.agent.aiProvider.query(prompt, {
            taskType: 'roleplay',
            maxTokens: 200
          });

          const message = {
            agent: roleId,
            role: agent.role,
            message: response,
            round,
            timestamp: new Date()
          };

          conversation.messages.push(message);
          console.log(chalk.gray(`    "${response}"`));
          
          // Update context with latest exchange
          currentContext += `\n${agent.role}: ${response}`;
          
        } catch (error) {
          console.log(chalk.red(`    Error: ${error.message}`));
        }
      }
    }

    conversation.endTime = new Date();
    this.conversations.set(conversationId, conversation);

    return {
      success: true,
      conversationId,
      conversation,
      summary: `${conversation.messages.length} messages exchanged over ${rounds} rounds`
    };
  }

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  listConversations() {
    return Array.from(this.conversations.values()).map(conv => ({
      id: conv.id,
      task: conv.task || conv.topic,
      participants: conv.participants,
      startTime: conv.startTime,
      messageCount: conv.messages?.length || 0
    }));
  }

  getAgentInfo(roleId) {
    return this.agents.get(roleId);
  }

  listAgents() {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      role: agent.role,
      personality: agent.personality,
      expertise: agent.expertise,
      emoji: agent.emoji
    }));
  }

  // Enhanced coordination methods
  updateAgentPerformanceMetrics(collaboration) {
    for (const agentId of collaboration.participants) {
      const existing = this.agentPerformance.get(agentId) || {
        collaborations: 0,
        totalTime: 0,
        successRate: 0,
        averageConfidence: 0,
        participationRate: 0
      };

      existing.collaborations++;
      existing.totalTime += collaboration.metrics.totalTime;

      // Calculate success rate
      const wasSuccessful = collaboration.outputs.final && collaboration.metrics.consensusScore > 0.6;
      existing.successRate = ((existing.successRate * (existing.collaborations - 1)) + (wasSuccessful ? 1 : 0)) / existing.collaborations;

      // Update agent's performance score
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.performanceScore = existing.successRate;
        agent.workload = Math.max(0, agent.workload - 0.1); // Reduce workload after completion
      }

      this.agentPerformance.set(agentId, existing);
    }
  }

  // Dynamic agent creation
  async createSpecializedAgent(requirements) {
    const agentId = `dynamic_${Date.now()}`;
    const agent = await this.agentFactory.createAgent({
      id: agentId,
      requirements,
      baseTemplate: this.selectBestTemplate(requirements)
    });

    this.agents.set(agentId, agent);
    this.setupCommunicationChannel(agentId);

    console.log(chalk.green(`✨ Created specialized agent: ${agent.role}`));
    return agentId;
  }

  selectBestTemplate(requirements) {
    const templates = ['senior_dev', 'security_expert', 'tester', 'doc_writer', 'devops'];

    // Simple matching based on keywords
    const reqLower = requirements.toLowerCase();
    if (reqLower.includes('security')) return 'security_expert';
    if (reqLower.includes('test')) return 'tester';
    if (reqLower.includes('document')) return 'doc_writer';
    if (reqLower.includes('deploy') || reqLower.includes('infrastructure')) return 'devops';

    return 'senior_dev'; // Default
  }

  setupCommunicationChannel(agentId) {
    this.communicationChannels.set(agentId, {
      inbox: [],
      outbox: [],
      subscriptions: new Set(),
      messageHistory: []
    });
  }

  // Agent communication methods
  async sendMessage(fromAgent, toAgent, message, priority = 'normal') {
    const timestamp = new Date();
    const messageObj = {
      id: `msg_${Date.now()}`,
      from: fromAgent,
      to: toAgent,
      content: message,
      priority,
      timestamp,
      status: 'sent'
    };

    // Add to sender's outbox
    const senderChannel = this.communicationChannels.get(fromAgent);
    if (senderChannel) {
      senderChannel.outbox.push(messageObj);
      senderChannel.messageHistory.push(messageObj);
    }

    // Add to receiver's inbox
    const receiverChannel = this.communicationChannels.get(toAgent);
    if (receiverChannel) {
      receiverChannel.inbox.push(messageObj);
      receiverChannel.messageHistory.push(messageObj);
      messageObj.status = 'delivered';
    }

    return messageObj;
  }

  async broadcastMessage(fromAgent, message, priority = 'normal') {
    const broadcastChannel = this.communicationChannels.get('broadcast');
    if (!broadcastChannel) return;

    const messageObj = {
      id: `broadcast_${Date.now()}`,
      from: fromAgent,
      to: 'all',
      content: message,
      priority,
      timestamp: new Date(),
      status: 'broadcast'
    };

    broadcastChannel.messageHistory.push(messageObj);

    // Deliver to all subscribed agents
    for (const agentId of broadcastChannel.subscribers) {
      if (agentId !== fromAgent) {
        const channel = this.communicationChannels.get(agentId);
        if (channel) {
          channel.inbox.push(messageObj);
        }
      }
    }

    return messageObj;
  }

  getAgentMessages(agentId, type = 'inbox') {
    const channel = this.communicationChannels.get(agentId);
    return channel ? channel[type] : [];
  }

  clearAgentMessages(agentId, type = 'inbox') {
    const channel = this.communicationChannels.get(agentId);
    if (channel) {
      channel[type] = [];
    }
  }

  // Performance monitoring
  getSystemMetrics() {
    return {
      totalAgents: this.agents.size,
      activeCollaborations: this.activeCollaborations.size,
      totalConversations: this.conversations.size,
      agentPerformance: Object.fromEntries(this.agentPerformance),
      communicationStats: this.getCommunicationStats()
    };
  }

  getCommunicationStats() {
    const stats = {
      totalMessages: 0,
      broadcastMessages: 0,
      averageResponseTime: 0
    };

    for (const [agentId, channel] of this.communicationChannels) {
      if (agentId === 'broadcast') {
        stats.broadcastMessages += channel.messageHistory.length;
      } else {
        stats.totalMessages += channel.messageHistory.length;
      }
    }

    return stats;
  }
}

// Supporting classes for enhanced multi-agent coordination
class ConsensusEngine {
  constructor() {
    this.consensusHistory = [];
    this.votingStrategies = new Map();
    this.initializeVotingStrategies();
  }

  async initialize() {
    console.log(chalk.blue('🤝 Consensus Engine initialized'));
  }

  initializeVotingStrategies() {
    this.votingStrategies.set('majority', this.majorityVoting.bind(this));
    this.votingStrategies.set('weighted', this.weightedVoting.bind(this));
    this.votingStrategies.set('unanimous', this.unanimousVoting.bind(this));
    this.votingStrategies.set('democratic', this.democraticVoting.bind(this));
  }

  async buildConsensus({ task, content, participants, threshold = 0.7, timeout, strategy = 'democratic' }) {
    const startTime = Date.now();

    try {
      // Parse agent contributions
      const contributions = this.parseContributions(content);

      // Apply voting strategy
      const votingStrategy = this.votingStrategies.get(strategy) || this.democraticVoting.bind(this);
      const consensusResult = await votingStrategy(contributions, participants, threshold);

      // Record consensus history
      this.consensusHistory.push({
        task,
        participants,
        strategy,
        result: consensusResult,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      });

      return consensusResult;

    } catch (error) {
      console.log(chalk.red('Consensus building failed:', error.message));
      return {
        consensus: 'Unable to reach consensus due to processing error',
        agreements: [],
        disagreements: [],
        score: 0.3,
        error: error.message
      };
    }
  }

  parseContributions(content) {
    // Simple parsing - in practice, this would be more sophisticated
    const lines = content.split('\n');
    const contributions = [];
    let currentAgent = null;
    let currentContent = '';

    for (const line of lines) {
      const agentMatch = line.match(/^(\w+):\s*(.+)/);
      if (agentMatch) {
        if (currentAgent && currentContent) {
          contributions.push({
            agent: currentAgent,
            content: currentContent.trim(),
            sentiment: this.analyzeSentiment(currentContent),
            keywords: this.extractKeywords(currentContent)
          });
        }
        currentAgent = agentMatch[1];
        currentContent = agentMatch[2];
      } else if (currentAgent && line.trim()) {
        currentContent += ' ' + line.trim();
      }
    }

    // Add the last contribution
    if (currentAgent && currentContent) {
      contributions.push({
        agent: currentAgent,
        content: currentContent.trim(),
        sentiment: this.analyzeSentiment(currentContent),
        keywords: this.extractKeywords(currentContent)
      });
    }

    return contributions;
  }

  analyzeSentiment(text) {
    // Simple sentiment analysis
    const positiveWords = ['good', 'excellent', 'great', 'effective', 'optimal', 'recommend'];
    const negativeWords = ['bad', 'poor', 'ineffective', 'problematic', 'risky', 'concern'];

    const words = text.toLowerCase().split(/\s+/);
    const positive = words.filter(word => positiveWords.includes(word)).length;
    const negative = words.filter(word => negativeWords.includes(word)).length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  extractKeywords(text) {
    // Simple keyword extraction
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));

    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  async democraticVoting(contributions, participants, threshold) {
    // Democratic consensus building with equal weight for all participants
    const agreements = [];
    const disagreements = [];
    const keywordFrequency = {};

    // Analyze common themes
    contributions.forEach(contrib => {
      contrib.keywords.forEach(keyword => {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      });
    });

    // Find consensus themes (keywords mentioned by multiple agents)
    const consensusThemes = Object.entries(keywordFrequency)
      .filter(([, count]) => count >= Math.ceil(participants.length * threshold))
      .map(([keyword]) => keyword);

    // Build consensus statement
    const consensus = this.buildConsensusStatement(contributions, consensusThemes);

    // Calculate consensus score
    const positiveContributions = contributions.filter(c => c.sentiment === 'positive').length;
    const score = Math.min(1.0, (positiveContributions / contributions.length) + (consensusThemes.length * 0.1));

    return {
      consensus,
      agreements: consensusThemes,
      disagreements: this.identifyDisagreements(contributions),
      score,
      strategy: 'democratic',
      participationRate: contributions.length / participants.length
    };
  }

  buildConsensusStatement(contributions, themes) {
    if (themes.length === 0) {
      return 'No clear consensus emerged from the discussion. Further deliberation may be needed.';
    }

    const themeText = themes.slice(0, 3).join(', ');
    return `The team reached consensus around key themes including: ${themeText}. The proposed approach should incorporate these elements while addressing individual concerns raised by team members.`;
  }

  identifyDisagreements(contributions) {
    const negativeContributions = contributions
      .filter(c => c.sentiment === 'negative')
      .map(c => `${c.agent}: ${c.content.substring(0, 100)}...`);

    return negativeContributions.slice(0, 3); // Limit to top 3 disagreements
  }

  majorityVoting(contributions, participants, threshold) {
    // Simple majority voting implementation
    return this.democraticVoting(contributions, participants, 0.5);
  }

  weightedVoting(contributions, participants, threshold) {
    // Weighted voting based on agent expertise (simplified)
    return this.democraticVoting(contributions, participants, threshold);
  }

  unanimousVoting(contributions, participants, threshold) {
    // Unanimous consensus requirement
    return this.democraticVoting(contributions, participants, 1.0);
  }
}

class TaskDelegator {
  constructor() {
    this.delegationHistory = [];
    this.workloadTracking = new Map();
  }

  async initialize() {
    console.log(chalk.blue('📋 Task Delegator initialized'));
  }

  async delegateTask(task, availableAgents, requirements = {}) {
    const startTime = Date.now();

    // Analyze task complexity and requirements
    const taskAnalysis = this.analyzeTask(task, requirements);

    // Score and rank agents
    const agentScores = this.scoreAgents(availableAgents, taskAnalysis);

    // Create delegation plan
    const delegation = {
      taskId: `task_${Date.now()}`,
      task,
      primaryAgent: agentScores[0]?.id,
      supportingAgents: agentScores.slice(1, Math.min(4, agentScores.length)).map(a => a.id),
      taskBreakdown: this.breakdownTask(task, taskAnalysis),
      estimatedDuration: taskAnalysis.estimatedDuration,
      priority: requirements.priority || 'normal',
      timestamp: new Date()
    };

    // Update workload tracking
    this.updateWorkloadTracking(delegation);

    // Record delegation history
    this.delegationHistory.push({
      ...delegation,
      processingTime: Date.now() - startTime
    });

    return delegation;
  }

  analyzeTask(task, requirements) {
    const taskLower = task.toLowerCase();
    const analysis = {
      complexity: 0.5,
      urgency: 0.5,
      estimatedDuration: 30, // minutes
      requiredSkills: [],
      riskLevel: 'medium'
    };

    // Complexity analysis
    const complexityIndicators = ['complex', 'advanced', 'enterprise', 'scalable', 'distributed', 'architecture'];
    analysis.complexity = Math.min(1.0, complexityIndicators.filter(indicator =>
      taskLower.includes(indicator)).length / complexityIndicators.length + 0.3);

    // Urgency analysis
    const urgencyIndicators = ['urgent', 'critical', 'asap', 'immediate', 'emergency'];
    analysis.urgency = Math.min(1.0, urgencyIndicators.filter(indicator =>
      taskLower.includes(indicator)).length / urgencyIndicators.length + 0.2);

    // Skill requirements
    if (taskLower.includes('security')) analysis.requiredSkills.push('security');
    if (taskLower.includes('performance')) analysis.requiredSkills.push('performance');
    if (taskLower.includes('test')) analysis.requiredSkills.push('testing');
    if (taskLower.includes('ui') || taskLower.includes('ux')) analysis.requiredSkills.push('ui_ux');
    if (taskLower.includes('database')) analysis.requiredSkills.push('database');

    // Adjust duration based on complexity and urgency
    analysis.estimatedDuration = Math.round(30 * (1 + analysis.complexity) * (1 + analysis.urgency * 0.5));

    // Risk assessment
    if (analysis.complexity > 0.7 || analysis.urgency > 0.8) {
      analysis.riskLevel = 'high';
    } else if (analysis.complexity < 0.3 && analysis.urgency < 0.3) {
      analysis.riskLevel = 'low';
    }

    return analysis;
  }

  scoreAgents(availableAgents, taskAnalysis) {
    const scoredAgents = availableAgents.map(agentId => {
      const agent = this.getAgentById(agentId);
      if (!agent) return { id: agentId, score: 0 };

      let score = 0;

      // Skill matching (40% of score)
      const skillMatch = this.calculateSkillMatch(agent.expertise || [], taskAnalysis.requiredSkills);
      score += skillMatch * 0.4;

      // Availability (30% of score)
      const availability = (agent.availability || 1.0) * (1 - (agent.workload || 0));
      score += availability * 0.3;

      // Performance history (20% of score)
      score += (agent.performanceScore || 0.7) * 0.2;

      // Workload balance (10% of score)
      const currentWorkload = this.workloadTracking.get(agentId) || 0;
      const workloadScore = Math.max(0, 1 - currentWorkload / 5); // Penalize high workload
      score += workloadScore * 0.1;

      return { id: agentId, agent, score };
    });

    return scoredAgents
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  calculateSkillMatch(agentSkills, requiredSkills) {
    if (requiredSkills.length === 0) return 0.5; // Neutral if no specific requirements

    const matches = requiredSkills.filter(required =>
      agentSkills.some(skill =>
        skill.toLowerCase().includes(required.toLowerCase()) ||
        required.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return matches.length / requiredSkills.length;
  }

  breakdownTask(task, analysis) {
    const breakdown = [];

    // Basic task breakdown based on complexity
    if (analysis.complexity > 0.7) {
      breakdown.push('Requirements analysis and planning');
      breakdown.push('Architecture and design phase');
      breakdown.push('Implementation phase');
      breakdown.push('Testing and validation');
      breakdown.push('Documentation and review');
    } else if (analysis.complexity > 0.4) {
      breakdown.push('Analysis and planning');
      breakdown.push('Implementation');
      breakdown.push('Testing and review');
    } else {
      breakdown.push('Quick analysis');
      breakdown.push('Direct implementation');
    }

    return breakdown;
  }

  updateWorkloadTracking(delegation) {
    // Increase workload for assigned agents
    if (delegation.primaryAgent) {
      const current = this.workloadTracking.get(delegation.primaryAgent) || 0;
      this.workloadTracking.set(delegation.primaryAgent, current + 1);
    }

    delegation.supportingAgents.forEach(agentId => {
      const current = this.workloadTracking.get(agentId) || 0;
      this.workloadTracking.set(agentId, current + 0.5);
    });
  }

  getAgentById(agentId) {
    // This would typically reference the main agent registry
    // For now, return a placeholder
    return {
      id: agentId,
      expertise: [],
      availability: 1.0,
      workload: 0,
      performanceScore: 0.7
    };
  }

  getDelegationHistory() {
    return this.delegationHistory;
  }

  getWorkloadStatus() {
    return Object.fromEntries(this.workloadTracking);
  }
}

class DynamicAgentFactory {
  constructor() {
    this.createdAgents = new Map();
    this.agentTemplates = new Map();
    this.initializeTemplates();
  }

  async initialize() {
    console.log(chalk.blue('🏭 Dynamic Agent Factory initialized'));
  }

  initializeTemplates() {
    this.agentTemplates.set('senior_dev', {
      personality: 'Experienced, architectural thinking, best practices focused',
      communicationStyle: 'technical_and_mentoring',
      baseExpertise: ['system design', 'code review', 'architecture'],
      baseCapabilities: ['code_analysis', 'architecture_review', 'mentoring']
    });

    this.agentTemplates.set('security_expert', {
      personality: 'Security-first mindset, thorough, risk-aware',
      communicationStyle: 'detailed_and_cautious',
      baseExpertise: ['security analysis', 'threat modeling', 'compliance'],
      baseCapabilities: ['security_audit', 'vulnerability_assessment', 'compliance_check']
    });

    this.agentTemplates.set('performance_expert', {
      personality: 'Optimization-focused, data-driven, efficiency-minded',
      communicationStyle: 'analytical_and_precise',
      baseExpertise: ['performance optimization', 'profiling', 'scalability'],
      baseCapabilities: ['performance_analysis', 'bottleneck_identification', 'optimization']
    });

    this.agentTemplates.set('tester', {
      personality: 'Detail-oriented, thorough, edge-case focused',
      communicationStyle: 'methodical_and_detailed',
      baseExpertise: ['testing strategies', 'quality assurance', 'automation'],
      baseCapabilities: ['test_design', 'automation_setup', 'quality_metrics']
    });

    this.agentTemplates.set('doc_writer', {
      personality: 'Clear communicator, user-focused, comprehensive',
      communicationStyle: 'clear_and_comprehensive',
      baseExpertise: ['technical writing', 'documentation', 'communication'],
      baseCapabilities: ['documentation_writing', 'api_docs', 'user_guides']
    });
  }

  async createAgent({ id, requirements, baseTemplate = 'senior_dev', customizations = {} }) {
    const template = this.agentTemplates.get(baseTemplate) || this.agentTemplates.get('senior_dev');

    const agent = {
      id,
      role: this.generateRole(requirements, customizations.role),
      personality: customizations.personality || template.personality,
      expertise: this.generateExpertise(requirements, template.baseExpertise),
      capabilities: this.generateCapabilities(requirements, template.baseCapabilities),
      communicationStyle: customizations.communicationStyle || template.communicationStyle,
      workload: 0,
      availability: 1.0,
      performanceScore: 0.7, // Start with neutral score
      systemPrompt: this.generateSystemPrompt(requirements, customizations),
      emoji: this.selectEmoji(requirements),
      createdAt: new Date(),
      specialization: this.extractSpecialization(requirements),
      dynamicallyCreated: true
    };

    // Store the created agent
    this.createdAgents.set(id, {
      agent,
      requirements,
      baseTemplate,
      customizations,
      creationTime: new Date()
    });

    console.log(chalk.green(`🤖 Created dynamic agent: ${agent.role} (${agent.specialization})`));

    return agent;
  }

  generateRole(requirements, customRole) {
    if (customRole) return customRole;

    const reqLower = requirements.toLowerCase();

    if (reqLower.includes('security') && reqLower.includes('audit')) return 'Security Auditor';
    if (reqLower.includes('security')) return 'Security Specialist';
    if (reqLower.includes('performance') && reqLower.includes('database')) return 'Database Performance Expert';
    if (reqLower.includes('performance')) return 'Performance Optimization Expert';
    if (reqLower.includes('ui') && reqLower.includes('accessibility')) return 'Accessibility Expert';
    if (reqLower.includes('ui') || reqLower.includes('ux')) return 'UI/UX Specialist';
    if (reqLower.includes('api') && reqLower.includes('design')) return 'API Design Expert';
    if (reqLower.includes('data') && reqLower.includes('analysis')) return 'Data Analysis Expert';
    if (reqLower.includes('machine learning') || reqLower.includes('ml')) return 'ML Engineering Expert';
    if (reqLower.includes('devops') || reqLower.includes('infrastructure')) return 'DevOps Specialist';
    if (reqLower.includes('mobile')) return 'Mobile Development Expert';
    if (reqLower.includes('blockchain')) return 'Blockchain Developer';
    if (reqLower.includes('cloud')) return 'Cloud Architecture Expert';

    return 'Specialized Developer';
  }

  generateExpertise(requirements, baseExpertise) {
    const expertise = [...baseExpertise];
    const reqLower = requirements.toLowerCase();

    // Add domain-specific expertise
    if (reqLower.includes('react') || reqLower.includes('frontend')) expertise.push('React development', 'frontend architecture');
    if (reqLower.includes('node') || reqLower.includes('backend')) expertise.push('Node.js', 'backend systems');
    if (reqLower.includes('database') || reqLower.includes('sql')) expertise.push('database design', 'SQL optimization');
    if (reqLower.includes('aws') || reqLower.includes('cloud')) expertise.push('cloud platforms', 'AWS services');
    if (reqLower.includes('docker') || reqLower.includes('kubernetes')) expertise.push('containerization', 'orchestration');
    if (reqLower.includes('microservices')) expertise.push('microservices architecture', 'distributed systems');
    if (reqLower.includes('graphql')) expertise.push('GraphQL', 'API design');
    if (reqLower.includes('typescript')) expertise.push('TypeScript', 'type systems');
    if (reqLower.includes('python')) expertise.push('Python development', 'data processing');
    if (reqLower.includes('machine learning')) expertise.push('ML algorithms', 'model training');

    return [...new Set(expertise)]; // Remove duplicates
  }

  generateCapabilities(requirements, baseCapabilities) {
    const capabilities = [...baseCapabilities];
    const reqLower = requirements.toLowerCase();

    // Add specific capabilities based on requirements
    if (reqLower.includes('audit')) capabilities.push('security_audit', 'compliance_check');
    if (reqLower.includes('optimization')) capabilities.push('performance_optimization', 'code_optimization');
    if (reqLower.includes('testing')) capabilities.push('test_automation', 'integration_testing');
    if (reqLower.includes('deployment')) capabilities.push('ci_cd_setup', 'deployment_automation');
    if (reqLower.includes('monitoring')) capabilities.push('system_monitoring', 'alerting_setup');
    if (reqLower.includes('documentation')) capabilities.push('technical_writing', 'api_documentation');
    if (reqLower.includes('review')) capabilities.push('code_review', 'architecture_review');
    if (reqLower.includes('migration')) capabilities.push('data_migration', 'system_migration');
    if (reqLower.includes('integration')) capabilities.push('system_integration', 'api_integration');

    return [...new Set(capabilities)]; // Remove duplicates
  }

  generateSystemPrompt(requirements, customizations) {
    const basePrompt = customizations.systemPrompt ||
      `You are a specialized AI agent created to handle: ${requirements}`;

    const additionalContext = `

Your primary focus areas include:
- Providing expert-level insights and recommendations
- Collaborating effectively with other team members
- Maintaining high standards of quality and best practices
- Being thorough, practical, and solution-oriented
- Communicating clearly and professionally

When working on tasks:
1. Analyze requirements carefully
2. Consider multiple approaches and trade-offs
3. Provide specific, actionable recommendations
4. Highlight potential risks or challenges
5. Suggest concrete next steps

Always maintain your specialized perspective while being collaborative and open to other viewpoints.`;

    return basePrompt + additionalContext;
  }

  selectEmoji(requirements) {
    const reqLower = requirements.toLowerCase();

    if (reqLower.includes('security')) return '🔒';
    if (reqLower.includes('performance')) return '⚡';
    if (reqLower.includes('test')) return '🧪';
    if (reqLower.includes('ui') || reqLower.includes('design')) return '🎨';
    if (reqLower.includes('data')) return '📊';
    if (reqLower.includes('api')) return '🔌';
    if (reqLower.includes('mobile')) return '📱';
    if (reqLower.includes('cloud')) return '☁️';
    if (reqLower.includes('database')) return '🗄️';
    if (reqLower.includes('machine learning')) return '🤖';
    if (reqLower.includes('devops')) return '🚀';
    if (reqLower.includes('blockchain')) return '⛓️';

    return '🔧'; // Default tool emoji
  }

  extractSpecialization(requirements) {
    const reqLower = requirements.toLowerCase();

    if (reqLower.includes('security')) return 'Security';
    if (reqLower.includes('performance')) return 'Performance';
    if (reqLower.includes('ui') || reqLower.includes('ux')) return 'UI/UX';
    if (reqLower.includes('data')) return 'Data';
    if (reqLower.includes('api')) return 'API';
    if (reqLower.includes('mobile')) return 'Mobile';
    if (reqLower.includes('cloud')) return 'Cloud';
    if (reqLower.includes('devops')) return 'DevOps';
    if (reqLower.includes('machine learning')) return 'ML';

    return 'General';
  }

  getCreatedAgents() {
    return Array.from(this.createdAgents.entries()).map(([id, data]) => ({
      id,
      role: data.agent.role,
      specialization: data.agent.specialization,
      createdAt: data.creationTime,
      requirements: data.requirements
    }));
  }

  removeAgent(agentId) {
    const removed = this.createdAgents.delete(agentId);
    if (removed) {
      console.log(chalk.yellow(`🗑️ Removed dynamic agent: ${agentId}`));
    }
    return removed;
  }

  getAgentStats() {
    const agents = Array.from(this.createdAgents.values());
    const specializations = {};

    agents.forEach(({ agent }) => {
      specializations[agent.specialization] = (specializations[agent.specialization] || 0) + 1;
    });

    return {
      totalCreated: agents.length,
      specializations,
      averagePerformance: agents.reduce((sum, { agent }) => sum + agent.performanceScore, 0) / agents.length || 0
    };
  }
}