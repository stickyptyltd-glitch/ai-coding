import chalk from 'chalk';
import fs from 'fs/promises';

export class ExplainAsItBuilds {
  constructor(agent) {
    this.agent = agent;
    this.sessions = new Map();
    this.explanations = new Map();
    this.patterns = new Map();
    this.educationalContent = new Map();
    this.mentorMode = true;
    this.initializePatterns();
  }

  initializePatterns() {
    // Code pattern explanations
    this.patterns.set('express_server', {
      title: 'Express Server Setup',
      explanation: 'Creating an Express server involves importing the framework, creating an app instance, and setting up middleware. This is the foundation for building web APIs.',
      whyChosen: 'Express is lightweight, flexible, and has excellent middleware support',
      tradeoffs: 'Minimal structure means more configuration needed vs frameworks like NestJS',
      edgeCases: ['Port conflicts', 'Middleware order matters', 'Error handling'],
      learningTips: ['Start with basic routes', 'Learn middleware concepts', 'Understand request/response cycle']
    });

    this.patterns.set('react_component', {
      title: 'React Functional Component',
      explanation: 'Functional components are the modern way to create React components using hooks for state management',
      whyChosen: 'Hooks provide cleaner code and better reusability than class components',
      tradeoffs: 'Learning curve for hooks vs simpler class component lifecycle',
      edgeCases: ['Hook dependency arrays', 'Stale closures', 'Component re-renders'],
      learningTips: ['Master useState and useEffect first', 'Learn dependency arrays', 'Understand component lifecycle']
    });

    this.patterns.set('async_function', {
      title: 'Async/Await Pattern',
      explanation: 'Async functions allow handling asynchronous operations with cleaner syntax than promises',
      whyChosen: 'More readable than promise chains, easier error handling',
      tradeoffs: 'Can hide parallelism opportunities vs Promise.all',
      edgeCases: ['Unhandled promise rejections', 'Sequential vs parallel execution'],
      learningTips: ['Always handle errors with try/catch', 'Use Promise.all for parallel operations']
    });

    this.patterns.set('database_model', {
      title: 'Database Model Definition',
      explanation: 'Models define the structure and behavior of data entities in your application',
      whyChosen: 'Provides data validation, relationships, and query methods',
      tradeoffs: 'Schema rigidity vs flexibility, ORM performance overhead',
      edgeCases: ['Migration conflicts', 'Circular dependencies', 'Large dataset performance'],
      learningTips: ['Design schema carefully', 'Understand relationships', 'Plan for migrations']
    });
  }

  async startExplanationSession(projectName, options = {}) {
    console.log(chalk.blue(`📚 Starting explanation session for: ${projectName}`));
    
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      projectName,
      startTime: new Date(),
      options: {
        verbosity: options.verbosity || 'detailed', // brief, normal, detailed, expert
        includeAlternatives: options.includeAlternatives !== false,
        mentorMode: options.mentorMode !== false,
        saveDocumentation: options.saveDocumentation !== false
      },
      explanations: [],
      generatedFiles: [],
      learningOutcomes: []
    };

    this.sessions.set(sessionId, session);

    return {
      success: true,
      sessionId,
      message: `Explanation session started. I'll explain every decision as we build ${projectName}.`
    };
  }

  async explainAndExecute(action, context = {}, sessionId = null) {
    console.log(chalk.cyan(`💭 Explaining and executing: ${action.type || action}`));
    
    const session = sessionId ? this.sessions.get(sessionId) : null;
    const explanation = await this.generateExplanation(action, context, session?.options);
    
    // Store explanation
    if (session) {
      session.explanations.push({
        action,
        explanation,
        timestamp: new Date(),
        context
      });
    }

    // Execute the action
    let result;
    try {
      result = await this.executeAction(action, context);
    } catch (error) {
      result = { success: false, error: error.message };
    }

    // Explain the outcome
    const outcomeExplanation = await this.explainOutcome(action, result, explanation);
    
    if (session) {
      session.explanations.push({
        type: 'outcome',
        explanation: outcomeExplanation,
        result,
        timestamp: new Date()
      });
    }

    // Generate documentation if requested
    if (session?.options.saveDocumentation) {
      await this.generateDocumentation(action, explanation, result);
    }

    return {
      success: result.success,
      explanation,
      outcomeExplanation,
      result,
      learningPoints: this.extractLearningPoints(explanation, result)
    };
  }

  async generateExplanation(action, context, options = {}) {
    console.log(chalk.yellow('🧠 Generating explanation...'));
    
    const verbosity = options.verbosity || 'normal';
    const explanation = {
      what: '',
      why: '',
      how: '',
      alternatives: [],
      tradeoffs: [],
      edgeCases: [],
      learningTips: [],
      codeComments: []
    };

    // Get pattern-based explanation if available
    const patternKey = this.identifyPattern(action);
    const pattern = this.patterns.get(patternKey);
    
    if (pattern) {
      explanation.what = pattern.explanation;
      explanation.why = pattern.whyChosen;
      explanation.tradeoffs = pattern.tradeoffs;
      explanation.edgeCases = pattern.edgeCases;
      explanation.learningTips = pattern.learningTips;
    } else {
      // Generate AI-powered explanation
      const aiExplanation = await this.generateAIExplanation(action, context, verbosity);
      Object.assign(explanation, aiExplanation);
    }

    // Add context-specific information
    explanation.contextualInfo = this.addContextualInfo(action, context);
    
    // Adjust detail level based on verbosity
    return this.adjustVerbosity(explanation, verbosity);
  }

  identifyPattern(action) {
    const actionStr = JSON.stringify(action).toLowerCase();
    
    if (actionStr.includes('express') || actionStr.includes('server')) return 'express_server';
    if (actionStr.includes('react') || actionStr.includes('component')) return 'react_component';
    if (actionStr.includes('async') || actionStr.includes('await')) return 'async_function';
    if (actionStr.includes('model') || actionStr.includes('schema')) return 'database_model';
    
    return null;
  }

  async generateAIExplanation(action, context, verbosity) {
    try {
      const prompt = `Explain this coding action in an educational, mentoring style:

Action: ${JSON.stringify(action)}
Context: ${JSON.stringify(context)}
Verbosity: ${verbosity}

Please provide:
1. What this code/action does (clear explanation)
2. Why this approach was chosen (reasoning)
3. How it works (step-by-step if complex)
4. Alternative approaches (2-3 options)
5. Key tradeoffs and considerations
6. Common pitfalls and edge cases
7. Learning tips for beginners
8. Helpful code comments

Make it educational and encouraging, like a senior developer mentoring a junior.`;

      const response = await this.agent.aiProvider.query(prompt, {
        taskType: 'explanation',
        maxTokens: 1500
      });

      return this.parseAIExplanation(response);
      
    } catch (error) {
      console.log(chalk.yellow('AI explanation failed, using basic explanation'));
      return {
        what: 'Performing coding action',
        why: 'Based on current requirements',
        how: 'Step by step execution',
        alternatives: [],
        tradeoffs: [],
        edgeCases: [],
        learningTips: ['Practice makes perfect'],
        codeComments: []
      };
    }
  }

  parseAIExplanation(response) {
    // Simple parsing - in practice would be more sophisticated
    const sections = response.split(/\d+\.\s+/);
    
    return {
      what: this.extractSection(response, 'what this code') || sections[1] || '',
      why: this.extractSection(response, 'why this approach') || sections[2] || '',
      how: this.extractSection(response, 'how it works') || sections[3] || '',
      alternatives: this.extractList(response, 'alternative') || [],
      tradeoffs: this.extractList(response, 'tradeoff') || [],
      edgeCases: this.extractList(response, 'pitfall|edge case') || [],
      learningTips: this.extractList(response, 'learning tip') || [],
      codeComments: this.extractList(response, 'comment') || []
    };
  }

  extractSection(text, keyword) {
    const regex = new RegExp(`${keyword}.*?\\n(.+?)(?=\\n\\d+\\.|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  extractList(text, keyword) {
    const regex = new RegExp(`${keyword}.*?\\n([\\s\\S]*?)(?=\\n\\d+\\.|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    
    return match[1]
      .split(/[-•*]\s+/)
      .filter(item => item.trim())
      .map(item => item.trim())
      .slice(0, 5); // Limit to 5 items
  }

  addContextualInfo(action, context) {
    const info = {
      projectStage: this.determineProjectStage(context),
      complexity: this.assessComplexity(action),
      dependencies: this.findDependencies(action, context),
      impact: this.assessImpact(action, context)
    };

    return info;
  }

  determineProjectStage(context) {
    if (!context.existingFiles || context.existingFiles.length === 0) return 'initialization';
    if (context.existingFiles.length < 5) return 'early_development';
    if (context.testFiles || context.hasTests) return 'mature_development';
    return 'active_development';
  }

  assessComplexity(action) {
    const actionStr = JSON.stringify(action).toLowerCase();
    let complexity = 1;
    
    if (actionStr.includes('async') || actionStr.includes('promise')) complexity += 1;
    if (actionStr.includes('database') || actionStr.includes('model')) complexity += 1;
    if (actionStr.includes('api') || actionStr.includes('endpoint')) complexity += 1;
    if (actionStr.includes('authentication') || actionStr.includes('security')) complexity += 2;
    
    if (complexity <= 2) return 'beginner';
    if (complexity <= 4) return 'intermediate';
    return 'advanced';
  }

  findDependencies(action, context) {
    const deps = [];
    const actionStr = JSON.stringify(action).toLowerCase();
    
    if (actionStr.includes('express')) deps.push('Express.js framework');
    if (actionStr.includes('react')) deps.push('React library');
    if (actionStr.includes('mongoose')) deps.push('Mongoose ODM');
    if (actionStr.includes('jwt')) deps.push('JSON Web Tokens');
    
    return deps;
  }

  assessImpact(action, context) {
    const actionStr = JSON.stringify(action).toLowerCase();
    
    if (actionStr.includes('delete') || actionStr.includes('remove')) return 'high';
    if (actionStr.includes('create') || actionStr.includes('add')) return 'medium';
    if (actionStr.includes('update') || actionStr.includes('modify')) return 'medium';
    return 'low';
  }

  adjustVerbosity(explanation, verbosity) {
    switch (verbosity) {
      case 'brief':
        return {
          what: explanation.what,
          why: explanation.why.substring(0, 100) + '...'
        };
        
      case 'normal':
        return {
          what: explanation.what,
          why: explanation.why,
          how: explanation.how,
          tradeoffs: explanation.tradeoffs.slice(0, 2)
        };
        
      case 'detailed':
        return explanation;
        
      case 'expert':
        return {
          ...explanation,
          technicalDetails: this.addTechnicalDetails(explanation),
          performanceNotes: this.addPerformanceNotes(explanation)
        };
        
      default:
        return explanation;
    }
  }

  addTechnicalDetails(explanation) {
    return [
      'Memory allocation patterns',
      'Execution context implications',
      'Optimization opportunities'
    ];
  }

  addPerformanceNotes(explanation) {
    return [
      'Consider async operations impact',
      'Monitor memory usage',
      'Profile critical paths'
    ];
  }

  async executeAction(action, context) {
    // Delegate to appropriate execution method based on action type
    if (typeof action === 'string') {
      return await this.executeCommand(action, context);
    }
    
    switch (action.type) {
      case 'create_file':
        return await this.executeCreateFile(action, context);
      case 'modify_file':
        return await this.executeModifyFile(action, context);
      case 'install_dependency':
        return await this.executeInstallDependency(action, context);
      case 'run_command':
        return await this.executeCommand(action.command, context);
      default:
        return { success: false, error: 'Unknown action type' };
    }
  }

  async executeCreateFile(action, context) {
    try {
      const { filePath, content, explanation } = action;
      
      // Add educational comments to the code
      const commentedContent = this.addEducationalComments(content, explanation);
      
      await fs.writeFile(filePath, commentedContent);
      
      return {
        success: true,
        filePath,
        size: commentedContent.length,
        linesAdded: commentedContent.split('\n').length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async executeModifyFile(action, context) {
    try {
      const { filePath, changes } = action;
      
      let content = await fs.readFile(filePath, 'utf8');
      
      // Apply changes with educational comments
      for (const change of changes) {
        if (change.type === 'replace') {
          content = content.replace(change.from, change.to);
        } else if (change.type === 'append') {
          content += '\n' + change.content;
        }
      }
      
      await fs.writeFile(filePath, content);
      
      return {
        success: true,
        filePath,
        changesApplied: changes.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async executeInstallDependency(action, context) {
    // Simulate dependency installation
    return {
      success: true,
      package: action.package,
      version: action.version || 'latest'
    };
  }

  async executeCommand(command, context) {
    // Simulate command execution
    return {
      success: true,
      command,
      output: 'Command executed successfully'
    };
  }

  addEducationalComments(code, explanation) {
    if (!explanation || !explanation.codeComments) return code;
    
    let commented = code;
    
    // Add header comment with explanation
    const header = `/*
 * ${explanation.what}
 * 
 * Why this approach: ${explanation.why}
 * 
 * Key considerations:
${explanation.tradeoffs.map(t => ` * - ${t}`).join('\n')}
 */\n\n`;
    
    commented = header + commented;
    
    // Add inline comments for complex sections
    for (const comment of explanation.codeComments) {
      // Simple comment insertion logic
      if (comment.line && comment.text) {
        const lines = commented.split('\n');
        if (lines[comment.line - 1]) {
          lines.splice(comment.line - 1, 0, `  // ${comment.text}`);
          commented = lines.join('\n');
        }
      }
    }
    
    return commented;
  }

  async explainOutcome(action, result, originalExplanation) {
    const outcome = {
      success: result.success,
      what_happened: '',
      lessons_learned: [],
      next_steps: [],
      debugging_tips: []
    };

    if (result.success) {
      outcome.what_happened = `Successfully ${this.getActionVerb(action)}. ${this.describeResult(result)}`;
      outcome.lessons_learned = this.extractSuccessLessons(action, result);
      outcome.next_steps = this.suggestNextSteps(action, result);
    } else {
      outcome.what_happened = `Failed to ${this.getActionVerb(action)}: ${result.error}`;
      outcome.lessons_learned = this.extractErrorLessons(action, result);
      outcome.debugging_tips = this.generateDebuggingTips(action, result);
    }

    return outcome;
  }

  getActionVerb(action) {
    if (typeof action === 'string') return action;
    
    const verbs = {
      'create_file': 'create file',
      'modify_file': 'modify file',
      'install_dependency': 'install dependency',
      'run_command': 'execute command'
    };
    
    return verbs[action.type] || 'perform action';
  }

  describeResult(result) {
    if (result.filePath) return `File created at ${result.filePath}`;
    if (result.package) return `Package ${result.package} installed`;
    if (result.command) return `Command "${result.command}" completed`;
    return 'Operation completed';
  }

  extractSuccessLessons(action, result) {
    return [
      'Planning and execution aligned successfully',
      'Code structure follows best practices',
      'Ready for the next development step'
    ];
  }

  suggestNextSteps(action, result) {
    const actionType = typeof action === 'object' ? action.type : 'command';
    
    const nextSteps = {
      'create_file': ['Add tests for the new file', 'Import and use in other files', 'Add error handling'],
      'modify_file': ['Test the changes', 'Update related documentation', 'Consider edge cases'],
      'install_dependency': ['Import in relevant files', 'Check for peer dependencies', 'Update documentation'],
      'command': ['Verify output', 'Check for any warnings', 'Consider automation']
    };
    
    return nextSteps[actionType] || ['Continue with next development task'];
  }

  extractErrorLessons(action, result) {
    const lessons = ['Debugging is a normal part of development'];
    
    if (result.error.includes('permission')) {
      lessons.push('Check file/folder permissions');
    }
    if (result.error.includes('not found')) {
      lessons.push('Verify file paths and dependencies');
    }
    if (result.error.includes('syntax')) {
      lessons.push('Review code syntax and formatting');
    }
    
    return lessons;
  }

  generateDebuggingTips(action, result) {
    const tips = ['Read error messages carefully'];
    
    if (result.error.includes('ENOENT')) {
      tips.push('File or directory does not exist - check the path');
    }
    if (result.error.includes('EACCES')) {
      tips.push('Permission denied - check file/folder permissions');
    }
    if (result.error.includes('EEXIST')) {
      tips.push('File already exists - consider different name or overwrite');
    }
    
    return tips;
  }

  extractLearningPoints(explanation, result) {
    const points = [];
    
    if (explanation.learningTips) {
      points.push(...explanation.learningTips);
    }
    
    if (explanation.edgeCases) {
      points.push(`Watch out for: ${explanation.edgeCases.join(', ')}`);
    }
    
    if (result.success) {
      points.push('Success builds confidence - keep practicing!');
    } else {
      points.push('Errors are learning opportunities - analyze what went wrong');
    }
    
    return points.slice(0, 5); // Limit to top 5 learning points
  }

  async generateDocumentation(action, explanation, result) {
    const doc = {
      title: `${this.getActionVerb(action)} - Documentation`,
      timestamp: new Date().toISOString(),
      explanation,
      result,
      codeExample: this.generateCodeExample(action),
      bestPractices: this.generateBestPractices(action),
      commonMistakes: this.generateCommonMistakes(action)
    };

    const docPath = `docs/${Date.now()}_${this.getActionVerb(action).replace(/\s+/g, '_')}.md`;
    const markdown = this.convertToMarkdown(doc);
    
    try {
      await fs.mkdir('docs', { recursive: true });
      await fs.writeFile(docPath, markdown);
      return { success: true, docPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateCodeExample(action) {
    // Generate relevant code examples based on action
    const examples = {
      'create_file': '// Example: Creating a new module\nmodule.exports = { /* your code */ };',
      'modify_file': '// Example: Adding a new function\nfunction newFeature() { /* implementation */ }',
      'install_dependency': '// Example: Using the installed package\nconst package = require(\'package-name\');'
    };
    
    const actionType = typeof action === 'object' ? action.type : 'command';
    return examples[actionType] || '// Code example would go here';
  }

  generateBestPractices(action) {
    return [
      'Follow consistent naming conventions',
      'Add comprehensive comments',
      'Handle errors gracefully',
      'Write tests for new functionality'
    ];
  }

  generateCommonMistakes(action) {
    return [
      'Forgetting to handle edge cases',
      'Not validating input parameters',
      'Missing error handling',
      'Inadequate testing coverage'
    ];
  }

  convertToMarkdown(doc) {
    return `# ${doc.title}

*Generated on: ${doc.timestamp}*

## What We Did
${doc.explanation.what}

## Why This Approach
${doc.explanation.why}

## How It Works
${doc.explanation.how}

## Code Example
\`\`\`javascript
${doc.codeExample}
\`\`\`

## Best Practices
${doc.bestPractices.map(bp => `- ${bp}`).join('\n')}

## Common Mistakes to Avoid
${doc.commonMistakes.map(cm => `- ${cm}`).join('\n')}

## Learning Points
${doc.explanation.learningTips ? doc.explanation.learningTips.map(tip => `- ${tip}`).join('\n') : 'No specific tips for this action'}

---
*This documentation was auto-generated by ExplainAsItBuilds*`;
  }

  async endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.endTime = new Date();
    session.duration = session.endTime - session.startTime;

    const summary = this.generateSessionSummary(session);
    
    return {
      success: true,
      sessionId,
      summary,
      totalExplanations: session.explanations.length,
      duration: Math.round(session.duration / 1000) + 's'
    };
  }

  generateSessionSummary(session) {
    return {
      project: session.projectName,
      duration: Math.round(session.duration / 1000) + 's',
      explanations: session.explanations.length,
      filesGenerated: session.generatedFiles.length,
      keyLearnings: this.extractKeyLearnings(session),
      topPatterns: this.getTopPatterns(session)
    };
  }

  extractKeyLearnings(session) {
    const learnings = new Set();
    
    for (const explanation of session.explanations) {
      if (explanation.explanation?.learningTips) {
        explanation.explanation.learningTips.forEach(tip => learnings.add(tip));
      }
    }
    
    return Array.from(learnings).slice(0, 5);
  }

  getTopPatterns(session) {
    const patterns = new Map();
    
    for (const explanation of session.explanations) {
      const pattern = this.identifyPattern(explanation.action);
      if (pattern) {
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      }
    }
    
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  listSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      projectName: session.projectName,
      startTime: session.startTime,
      explanations: session.explanations.length,
      status: session.endTime ? 'completed' : 'active'
    }));
  }

  generateSessionId() {
    return `explain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
