import fs from 'fs/promises';
import chalk from 'chalk';

export class RefactoringOptimizer {
  constructor(agent) {
    this.agent = agent;
    this.analysisCache = new Map();
    this.optimizationRules = new Map();
    this.initializeOptimizationRules();
  }

  initializeOptimizationRules() {
    // Performance optimizations
    this.optimizationRules.set('performance', {
      rules: [
        {
          name: 'Remove unnecessary loops',
          pattern: /for\s*\([^)]*\)\s*{\s*if\s*\([^)]*\)\s*{\s*return/g,
          suggestion: 'Consider using Array.find() or similar methods',
          severity: 'medium'
        },
        {
          name: 'Cache expensive computations',
          pattern: /([A-Za-z_]\w*\([^)]*\))\s*[+\-*/]\s*\1/g,
          suggestion: 'Cache the result of repeated expensive calls',
          severity: 'high'
        },
        {
          name: 'Use const for immutable values',
          pattern: /let\s+(\w+)\s*=\s*['"]/g,
          suggestion: 'Use const for string literals that never change',
          severity: 'low'
        }
      ]
    });

    // Readability improvements
    this.optimizationRules.set('readability', {
      rules: [
        {
          name: 'Extract complex conditions',
          pattern: /if\s*\([^{]{50,}\)\s*{/g,
          suggestion: 'Extract complex conditions into well-named variables',
          severity: 'medium'
        },
        {
          name: 'Replace magic numbers',
          pattern: /\b\d{2,}\b/g,
          suggestion: 'Replace magic numbers with named constants',
          severity: 'medium'
        },
        {
          name: 'Shorten long functions',
          pattern: /function[^{]*{[\s\S]{500,}}/g,
          suggestion: 'Consider breaking long functions into smaller ones',
          severity: 'high'
        }
      ]
    });

    // Maintainability enhancements
    this.optimizationRules.set('maintainability', {
      rules: [
        {
          name: 'Reduce parameter count',
          pattern: /function\s+\w+\s*\([^)]{50,}\)/g,
          suggestion: 'Functions with many parameters should use objects',
          severity: 'medium'
        },
        {
          name: 'Add error handling',
          pattern: /fetch\s*\([^)]*\)(?!\s*\.catch)/g,
          suggestion: 'Add proper error handling for async operations',
          severity: 'high'
        },
        {
          name: 'Use descriptive variable names',
          pattern: /\b(a|b|c|x|y|z|tmp|temp)\b\s*=/g,
          suggestion: 'Use more descriptive variable names',
          severity: 'low'
        }
      ]
    });
  }

  async analyzeFile(filePath, options = {}) {
    try {
      console.log(chalk.blue(`🔍 Analyzing ${filePath} for optimization opportunities...`));
      
      const content = await fs.readFile(filePath, 'utf8');
      const analysis = await this.performComprehensiveAnalysis(content, filePath);
      
      // Cache the analysis
      this.analysisCache.set(filePath, {
        analysis,
        timestamp: new Date(),
        content: content.slice(0, 1000) // Store snippet for comparison
      });

      return {
        success: true,
        filePath,
        analysis,
        suggestions: this.generateSuggestions(analysis),
        metrics: this.calculateMetrics(content)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  async performComprehensiveAnalysis(content, filePath) {
    const analysis = {
      codeSmells: [],
      performanceIssues: [],
      readabilityIssues: [],
      maintainabilityIssues: [],
      duplicatedCode: [],
      complexityAnalysis: {},
      dependencyAnalysis: {},
      aiInsights: null
    };

    // Pattern-based analysis
    for (const [category, ruleSet] of this.optimizationRules) {
      for (const rule of ruleSet.rules) {
        const matches = Array.from(content.matchAll(rule.pattern));
        
        matches.forEach(match => {
          const issue = {
            rule: rule.name,
            suggestion: rule.suggestion,
            severity: rule.severity,
            line: this.getLineNumber(content, match.index),
            code: match[0],
            category
          };
          
          analysis[`${category}Issues`].push(issue);
        });
      }
    }

    // Complexity analysis
    analysis.complexityAnalysis = this.analyzeComplexity(content);
    
    // Dependency analysis
    analysis.dependencyAnalysis = this.analyzeDependencies(content);
    
    // Duplication detection
    analysis.duplicatedCode = this.detectDuplication(content);
    
    // AI-powered insights
    analysis.aiInsights = await this.getAIInsights(content, filePath);

    return analysis;
  }

  analyzeComplexity(content) {
    const lines = content.split('\n');
    const complexity = {
      cyclomaticComplexity: 1, // Start with 1
      nestingDepth: 0,
      lineCount: lines.length,
      functionCount: 0,
      classCount: 0
    };

    let currentNesting = 0;
    let maxNesting = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Count complexity-increasing constructs
      if (trimmed.match(/\b(if|while|for|catch|case)\b/)) {
        complexity.cyclomaticComplexity++;
      }
      
      // Track nesting depth
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;
      currentNesting += openBraces - closeBraces;
      maxNesting = Math.max(maxNesting, currentNesting);
      
      // Count functions and classes
      if (trimmed.match(/^(function|const\s+\w+\s*=|class)\b/)) {
        if (trimmed.includes('class')) {
          complexity.classCount++;
        } else {
          complexity.functionCount++;
        }
      }
    });

    complexity.nestingDepth = maxNesting;
    
    return complexity;
  }

  analyzeDependencies(content) {
    const dependencies = {
      imports: [],
      exports: [],
      globalVariables: [],
      externalAPIs: []
    };

    // Find imports
    const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      dependencies.imports.push(match[1]);
    }

    // Find exports
    const exportMatches = content.matchAll(/export\s+(?:default\s+)?(\w+)/g);
    for (const match of exportMatches) {
      dependencies.exports.push(match[1]);
    }

    // Find potential global variables (simplified)
    const globalMatches = content.matchAll(/\b(window|document|console|process)\.\w+/g);
    for (const match of globalMatches) {
      if (!dependencies.globalVariables.includes(match[0])) {
        dependencies.globalVariables.push(match[0]);
      }
    }

    // Find external API calls
    const apiMatches = content.matchAll(/fetch\s*\(\s*['"]([^'"]+)['"]/g);
    for (const match of apiMatches) {
      dependencies.externalAPIs.push(match[1]);
    }

    return dependencies;
  }

  detectDuplication(content) {
    const duplicates = [];
    const lines = content.split('\n');
    const minLength = 3; // Minimum lines for duplication
    
    for (let i = 0; i < lines.length - minLength; i++) {
      for (let j = i + minLength; j < lines.length - minLength; j++) {
        const block1 = lines.slice(i, i + minLength).join('\n').trim();
        const block2 = lines.slice(j, j + minLength).join('\n').trim();
        
        if (block1 === block2 && block1.length > 50) { // Ignore small duplicates
          duplicates.push({
            block: block1,
            locations: [
              { start: i + 1, end: i + minLength },
              { start: j + 1, end: j + minLength }
            ]
          });
        }
      }
    }
    
    // Remove duplicates of duplicates
    return this.deduplicateDuplicates(duplicates);
  }

  deduplicateDuplicates(duplicates) {
    const unique = new Map();
    
    duplicates.forEach(dup => {
      const key = dup.block.slice(0, 50); // Use first 50 chars as key
      if (!unique.has(key)) {
        unique.set(key, dup);
      } else {
        // Merge locations
        const existing = unique.get(key);
        existing.locations.push(...dup.locations);
      }
    });
    
    return Array.from(unique.values());
  }

  async getAIInsights(content, filePath) {
    try {
      const prompt = `Analyze this code for optimization opportunities:

File: ${filePath}
Code:
${content.slice(0, 2000)}${content.length > 2000 ? '...' : ''}

Provide insights on:
1. Performance optimizations
2. Code structure improvements  
3. Best practices violations
4. Potential bugs or issues
5. Modern language features that could be used

Keep suggestions specific and actionable.`;

      const insights = await this.agent.aiProvider.query(prompt, {
        taskType: 'codeOptimization',
        maxTokens: 1000
      });
      
      return insights;
      
    } catch (error) {
      console.log(chalk.yellow('AI insights unavailable:', error.message));
      return 'AI analysis unavailable';
    }
  }

  generateSuggestions(analysis) {
    const suggestions = [];
    
    // High severity issues first
    const allIssues = [
      ...analysis.performanceIssues,
      ...analysis.readabilityIssues,
      ...analysis.maintainabilityIssues
    ].sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    allIssues.forEach(issue => {
      suggestions.push({
        type: 'refactor',
        priority: issue.severity,
        rule: issue.rule,
        suggestion: issue.suggestion,
        location: `Line ${issue.line}`,
        code: issue.code
      });
    });

    // Duplication suggestions
    analysis.duplicatedCode.forEach(dup => {
      suggestions.push({
        type: 'extract',
        priority: 'medium',
        rule: 'Extract duplicated code',
        suggestion: 'Create a reusable function for this duplicated code',
        locations: dup.locations.map(loc => `Lines ${loc.start}-${loc.end}`).join(', ')
      });
    });

    // Complexity suggestions
    if (analysis.complexityAnalysis.cyclomaticComplexity > 10) {
      suggestions.push({
        type: 'simplify',
        priority: 'high',
        rule: 'Reduce complexity',
        suggestion: `Cyclomatic complexity is ${analysis.complexityAnalysis.cyclomaticComplexity}. Consider breaking into smaller functions.`
      });
    }

    return suggestions.slice(0, 10); // Limit suggestions
  }

  calculateMetrics(content) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim()).length;
    const commentLines = lines.filter(line => line.trim().startsWith('//')).length;
    
    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines - commentLines,
      commentLines,
      commentRatio: commentLines / nonEmptyLines,
      averageLineLength: content.length / lines.length,
      fileSize: content.length
    };
  }

  async refactorFile(filePath, suggestions, options = {}) {
    try {
      console.log(chalk.blue(`🔄 Refactoring ${filePath}...`));
      
      const content = await fs.readFile(filePath, 'utf8');
      let refactoredContent = content;
      const appliedChanges = [];

      // Apply automated refactoring for safe changes
      for (const suggestion of suggestions) {
        if (suggestion.priority === 'low' && options.autoApply !== false) {
          const result = await this.applySuggestion(refactoredContent, suggestion);
          if (result.success) {
            refactoredContent = result.content;
            appliedChanges.push(suggestion.rule);
          }
        }
      }

      // Generate AI-powered refactoring for complex changes
      if (options.useAI !== false) {
        const aiRefactoring = await this.getAIRefactoring(content, suggestions);
        if (aiRefactoring) {
          refactoredContent = aiRefactoring;
          appliedChanges.push('AI-powered optimization');
        }
      }

      // Create backup before applying changes
      if (refactoredContent !== content) {
        await this.createBackup(filePath);
        await fs.writeFile(filePath, refactoredContent);
      }

      return {
        success: true,
        filePath,
        appliedChanges,
        originalSize: content.length,
        newSize: refactoredContent.length,
        changesMade: refactoredContent !== content
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  async applySuggestion(content, suggestion) {
    try {
      let modifiedContent = content;
      
      switch (suggestion.rule) {
        case 'Use const for immutable values':
          modifiedContent = content.replace(/let\s+(\w+)\s*=\s*(['"][^'"]*['"])/g, 'const $1 = $2');
          break;
          
        case 'Use descriptive variable names':
          // This would need more sophisticated analysis
          break;
          
        default:
          return { success: false, reason: 'No automated rule available' };
      }
      
      return {
        success: modifiedContent !== content,
        content: modifiedContent
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getAIRefactoring(content, suggestions) {
    try {
      const prompt = `Refactor this code to address these suggestions:

Original Code:
${content}

Suggestions to address:
${suggestions.map(s => `- ${s.suggestion}`).join('\n')}

Please provide the refactored code that:
1. Addresses the suggestions where possible
2. Maintains the same functionality
3. Follows modern best practices
4. Is more readable and maintainable

Respond with only the refactored code, no explanations.`;

      const refactoredCode = await this.agent.aiProvider.query(prompt, {
        taskType: 'codeRefactoring',
        maxTokens: 3000
      });
      
      return refactoredCode;
      
    } catch (error) {
      console.log(chalk.yellow('AI refactoring failed:', error.message));
      return null;
    }
  }

  async createBackup(filePath) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    const content = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(backupPath, content);
    console.log(chalk.gray(`📄 Backup created: ${backupPath}`));
  }

  async generateOptimizationReport(filePaths) {
    console.log(chalk.blue('📊 Generating optimization report...'));
    
    const analyses = await Promise.all(
      filePaths.map(filePath => this.analyzeFile(filePath))
    );

    const report = {
      summary: this.generateSummary(analyses),
      fileAnalyses: analyses,
      recommendations: this.generateRecommendations(analyses),
      metrics: this.aggregateMetrics(analyses)
    };

    return report;
  }

  generateSummary(analyses) {
    const successful = analyses.filter(a => a.success);
    const totalIssues = successful.reduce((sum, a) => 
      sum + a.analysis.performanceIssues.length + 
      a.analysis.readabilityIssues.length + 
      a.analysis.maintainabilityIssues.length, 0
    );

    return {
      filesAnalyzed: analyses.length,
      totalIssues,
      averageComplexity: successful.reduce((sum, a) => 
        sum + a.analysis.complexityAnalysis.cyclomaticComplexity, 0
      ) / successful.length,
      duplicatedCodeBlocks: successful.reduce((sum, a) => 
        sum + a.analysis.duplicatedCode.length, 0
      )
    };
  }

  generateRecommendations(analyses) {
    const recommendations = [];
    
    // Global recommendations based on patterns
    const allSuggestions = analyses
      .filter(a => a.success)
      .flatMap(a => a.suggestions);
    
    const suggestionCounts = new Map();
    allSuggestions.forEach(s => {
      const key = s.rule;
      suggestionCounts.set(key, (suggestionCounts.get(key) || 0) + 1);
    });

    // Most common issues
    const commonIssues = Array.from(suggestionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    commonIssues.forEach(([rule, count]) => {
      recommendations.push({
        type: 'global',
        rule,
        frequency: count,
        suggestion: `Address '${rule}' in ${count} locations across the codebase`
      });
    });

    return recommendations;
  }

  aggregateMetrics(analyses) {
    const successful = analyses.filter(a => a.success);
    
    return {
      totalLines: successful.reduce((sum, a) => sum + a.metrics.totalLines, 0),
      totalCodeLines: successful.reduce((sum, a) => sum + a.metrics.codeLines, 0),
      averageComplexity: successful.reduce((sum, a) => 
        sum + a.analysis.complexityAnalysis.cyclomaticComplexity, 0
      ) / successful.length,
      filesWithHighComplexity: successful.filter(a => 
        a.analysis.complexityAnalysis.cyclomaticComplexity > 10
      ).length
    };
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }
}
