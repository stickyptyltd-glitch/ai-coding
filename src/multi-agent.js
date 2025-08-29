import chalk from 'chalk';

export class MultiAgentSystem {
  constructor(agent) {
    this.agent = agent;
    this.agents = new Map();
    this.conversations = new Map();
    this.initializeAgents();
  }

  initializeAgents() {
    // Senior Developer Agent
    this.agents.set('senior_dev', {
      role: 'Senior Developer',
      personality: 'Experienced, architectural thinking, best practices focused',
      expertise: ['system design', 'performance', 'scalability', 'code review'],
      systemPrompt: `You are a Senior Developer with 10+ years of experience. You focus on:
- Architectural decisions and system design
- Performance optimization and scalability
- Code quality and best practices
- Technical debt management
- Security considerations

Respond in a professional, mentoring tone. Provide strategic insights and long-term thinking.`,
      emoji: '🏗️'
    });

    // Tester Agent
    this.agents.set('tester', {
      role: 'QA Engineer',
      personality: 'Detail-oriented, thorough, edge-case focused',
      expertise: ['testing strategies', 'edge cases', 'automation', 'quality assurance'],
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

  async collaborate(task, agentRoles = ['senior_dev', 'tester', 'doc_writer'], options = {}) {
    console.log(chalk.blue(`🤝 Starting multi-agent collaboration on: ${task}`));
    
    const conversationId = this.generateConversationId();
    const collaboration = {
      id: conversationId,
      task,
      participants: agentRoles,
      startTime: new Date(),
      discussions: [],
      decisions: [],
      outputs: {}
    };

    this.conversations.set(conversationId, collaboration);

    try {
      // Phase 1: Individual Analysis
      console.log(chalk.cyan('📋 Phase 1: Individual Analysis'));
      const analyses = await this.gatherIndividualAnalyses(task, agentRoles);
      collaboration.discussions.push(...analyses);

      // Phase 2: Cross-Agent Discussion
      console.log(chalk.cyan('💬 Phase 2: Cross-Agent Discussion'));
      const discussions = await this.facilitateDiscussion(task, analyses, agentRoles);
      collaboration.discussions.push(...discussions);

      // Phase 3: Consensus Building
      console.log(chalk.cyan('🤝 Phase 3: Building Consensus'));
      const consensus = await this.buildConsensus(task, collaboration.discussions, agentRoles);
      collaboration.decisions.push(consensus);

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
}