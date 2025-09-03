import chalk from 'chalk';
import { EventEmitter } from 'events';

export class AgentRegistry extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.agentPerformance = new Map();
    this.performanceThresholds = {
      successRate: 0.8,
      responseTime: 30000,
      utilizationLimit: 0.9
    };
  }

  registerAgent(id, agent) {
    const agentInfo = {
      id,
      agent,
      status: 'idle',
      currentTask: null,
      performance: {
        tasksCompleted: 0,
        averageTime: 0,
        successRate: 1.0,
        specialtyScores: new Map()
      },
      lastActivity: new Date(),
      config: agent.config || {},
      capabilities: agent.capabilities || {}
    };

    this.agents.set(id, agentInfo);
    
    this.agentPerformance.set(id, {
      responseTime: [],
      accuracy: [],
      resourceUsage: [],
      collaborationScore: 1.0,
      recentTasks: []
    });

    this.emit('agent:registered', { id, agent: agentInfo });
    console.log(chalk.cyan(`🤖 Registered agent: ${id}`));
  }

  unregisterAgent(id) {
    if (this.agents.has(id)) {
      const agentInfo = this.agents.get(id);
      this.agents.delete(id);
      this.agentPerformance.delete(id);
      this.emit('agent:unregistered', { id, agent: agentInfo });
      console.log(chalk.yellow(`🗑️ Unregistered agent: ${id}`));
      return true;
    }
    return false;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getAvailableAgents() {
    return Array.from(this.agents.values()).filter(agent => agent.status === 'idle');
  }

  getBusyAgents() {
    return Array.from(this.agents.values()).filter(agent => agent.status === 'busy');
  }

  getAgentsByCapability(capability) {
    return Array.from(this.agents.values()).filter(agent => 
      agent.capabilities[capability] || 
      (agent.agent.specialties && agent.agent.specialties.includes(capability))
    );
  }

  getBestAgentForTask(task) {
    const domain = this.identifyTaskDomain(task);
    const requiredCapabilities = this.extractTaskCapabilities(task);
    
    const candidates = Array.from(this.agents.values())
      .filter(a => {
        if (a.status !== 'idle') return false;
        
        if (a.agent.specialties?.includes(domain)) return true;
        
        return requiredCapabilities.some(cap => 
          a.capabilities[cap] || a.agent.specialties?.includes(cap)
        );
      })
      .sort((a, b) => {
        const aScore = this.calculateAgentScore(a, task);
        const bScore = this.calculateAgentScore(b, task);
        return bScore - aScore;
      });
    
    return candidates[0] || null;
  }

  calculateAgentScore(agentInfo, task) {
    let score = agentInfo.performance.successRate;
    
    score += (agentInfo.agent.priority || 5) / 10;
    
    const domain = this.identifyTaskDomain(task);
    if (agentInfo.agent.specialties?.includes(domain)) {
      score += 0.3;
    }
    
    if (agentInfo.performance.averageTime < this.performanceThresholds.responseTime) {
      score += 0.1;
    }
    
    return score;
  }

  identifyTaskDomain(task) {
    const domains = ['code', 'architecture', 'devops', 'security', 'performance', 'documentation', 'testing'];
    
    for (const domain of domains) {
      if (task.description?.toLowerCase().includes(domain) || 
          task.type?.toLowerCase().includes(domain)) {
        return domain;
      }
    }
    
    return 'general';
  }

  extractTaskCapabilities(task) {
    const capabilities = [];
    
    const text = `${task.description || ''} ${task.requirements?.join(' ') || ''}`.toLowerCase();
    
    if (text.includes('code') || text.includes('programming')) capabilities.push('coding');
    if (text.includes('test') || text.includes('testing')) capabilities.push('testing');
    if (text.includes('deploy') || text.includes('deployment')) capabilities.push('deployment');
    if (text.includes('security') || text.includes('secure')) capabilities.push('security');
    if (text.includes('performance') || text.includes('optimize')) capabilities.push('performance');
    if (text.includes('document') || text.includes('docs')) capabilities.push('documentation');
    
    return capabilities;
  }

  updateAgentStatus(id, status, taskId = null) {
    const agent = this.agents.get(id);
    if (!agent) return false;

    const oldStatus = agent.status;
    agent.status = status;
    agent.currentTask = taskId;
    
    if (status === 'idle') {
      agent.lastActivity = new Date();
    }

    this.emit('agent:status_changed', { 
      id, 
      oldStatus, 
      newStatus: status, 
      taskId 
    });

    return true;
  }

  recordTaskCompletion(agentId, taskId, result, duration) {
    const agent = this.agents.get(agentId);
    const performance = this.agentPerformance.get(agentId);
    
    if (!agent || !performance) return;

    agent.performance.tasksCompleted++;
    
    const currentAvg = agent.performance.averageTime;
    const count = agent.performance.tasksCompleted;
    agent.performance.averageTime = ((currentAvg * (count - 1)) + duration) / count;
    
    const success = result.success !== false;
    const currentSuccessRate = agent.performance.successRate;
    agent.performance.successRate = ((currentSuccessRate * (count - 1)) + (success ? 1 : 0)) / count;
    
    performance.responseTime.push(duration);
    performance.accuracy.push(result.confidence || (success ? 1.0 : 0.0));
    performance.recentTasks.push({
      taskId,
      success,
      duration,
      timestamp: new Date()
    });
    
    if (performance.recentTasks.length > 50) {
      performance.recentTasks = performance.recentTasks.slice(-50);
    }
    
    this.emit('agent:task_completed', { 
      agentId, 
      taskId, 
      result, 
      duration, 
      performance: agent.performance 
    });
  }

  getPerformanceMetrics(agentId = null) {
    if (agentId) {
      const agent = this.agents.get(agentId);
      const performance = this.agentPerformance.get(agentId);
      
      if (!agent || !performance) return null;
      
      return {
        agentId,
        ...agent.performance,
        averageResponseTime: performance.responseTime.length > 0 
          ? performance.responseTime.reduce((a, b) => a + b, 0) / performance.responseTime.length 
          : 0,
        averageAccuracy: performance.accuracy.length > 0
          ? performance.accuracy.reduce((a, b) => a + b, 0) / performance.accuracy.length
          : 0,
        recentTaskCount: performance.recentTasks.length,
        status: agent.status
      };
    }
    
    const allMetrics = {};
    for (const [id] of this.agents) {
      allMetrics[id] = this.getPerformanceMetrics(id);
    }
    return allMetrics;
  }

  getRegistryStatus() {
    return {
      totalAgents: this.agents.size,
      availableAgents: this.getAvailableAgents().length,
      busyAgents: this.getBusyAgents().length,
      agents: Object.fromEntries(
        Array.from(this.agents.entries()).map(([id, info]) => [
          id,
          {
            status: info.status,
            currentTask: info.currentTask,
            performance: info.performance,
            lastActivity: info.lastActivity,
            capabilities: Object.keys(info.capabilities || {}),
            specialties: info.agent.specialties || []
          }
        ])
      ),
      healthStatus: this.checkRegistryHealth()
    };
  }

  checkRegistryHealth() {
    const agents = Array.from(this.agents.values());
    const totalAgents = agents.length;
    
    if (totalAgents === 0) {
      return { status: 'critical', message: 'No agents registered' };
    }
    
    const underperformingAgents = agents.filter(agent => 
      agent.performance.successRate < this.performanceThresholds.successRate
    ).length;
    
    const slowAgents = agents.filter(agent => 
      agent.performance.averageTime > this.performanceThresholds.responseTime
    ).length;
    
    const healthyAgents = totalAgents - underperformingAgents - slowAgents;
    const healthRatio = healthyAgents / totalAgents;
    
    if (healthRatio >= 0.8) {
      return { status: 'healthy', healthRatio, message: 'All systems operational' };
    } else if (healthRatio >= 0.6) {
      return { 
        status: 'warning', 
        healthRatio, 
        message: `${underperformingAgents} underperforming, ${slowAgents} slow agents`,
        recommendations: ['Monitor agent performance', 'Consider agent retraining']
      };
    } else {
      return { 
        status: 'critical', 
        healthRatio, 
        message: `System degraded: ${underperformingAgents} underperforming, ${slowAgents} slow agents`,
        recommendations: ['Immediate agent performance review', 'Consider agent replacement', 'Scale resources']
      };
    }
  }

  cleanup() {
    const staleThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, agent] of this.agents) {
      if (agent.status === 'error' && agent.lastActivity.getTime() < staleThreshold) {
        console.log(chalk.yellow(`🧹 Cleaning up stale agent: ${id}`));
        this.unregisterAgent(id);
      }
      
      const performance = this.agentPerformance.get(id);
      if (performance) {
        performance.responseTime = performance.responseTime.slice(-100);
        performance.accuracy = performance.accuracy.slice(-100);
      }
    }
  }
}