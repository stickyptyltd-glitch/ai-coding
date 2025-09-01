import path from 'path';

export class CodeAnalyzer {
  constructor() {
    this.languageDetectors = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };
  }

  async analyze(code, filePath) {
    const language = this.detectLanguage(filePath);
    const analysis = {
      language,
      filePath,
      metrics: this.calculateMetrics(code),
      structure: this.analyzeStructure(code, language),
      complexity: this.analyzeComplexity(code, language),
      patterns: this.detectPatterns(code, language),
      dependencies: this.extractDependencies(code, language),
      issues: this.detectIssues(code, language),
      suggestions: this.generateSuggestions(code, language)
    };

    return analysis;
  }

  detectLanguage(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return this.languageDetectors[extension] || 'unknown';
  }

  calculateMetrics(code) {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    const commentLines = this.countCommentLines(code);
    
    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length - commentLines,
      commentLines,
      blankLines: lines.length - nonEmptyLines.length,
      characters: code.length,
      averageLineLength: code.length / lines.length
    };
  }

  countCommentLines(code) {
    const singleLineComments = (code.match(/\/\/.*$/gm) || []).length;
    const multiLineComments = (code.match(/\/\*[\s\S]*?\*\//g) || [])
      .reduce((count, comment) => count + comment.split('\n').length, 0);
    
    return singleLineComments + multiLineComments;
  }

  analyzeStructure(code, language) {
    const structure = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      variables: []
    };

    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.analyzeJavaScriptStructure(code, structure);
      case 'python':
        return this.analyzePythonStructure(code, structure);
      case 'java':
        return this.analyzeJavaStructure(code, structure);
      default:
        return this.analyzeGenericStructure(code, structure);
    }
  }

  analyzeJavaScriptStructure(code, structure) {
    // Function declarations
    const functionMatches = code.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\w+))/g);
    for (const match of functionMatches) {
      const name = match[1] || match[2];
      const line = code.substring(0, match.index).split('\n').length;
      structure.functions.push({ name, line, type: 'function' });
    }

    // Class declarations
    const classMatches = code.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      structure.classes.push({ name: match[1], line, type: 'class' });
    }

    // Imports
    const importMatches = code.matchAll(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
    for (const match of importMatches) {
      structure.imports.push({ module: match[1], type: 'import' });
    }

    // Exports
    const exportMatches = code.matchAll(/export\s+(?:default\s+)?(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+))/g);
    for (const match of exportMatches) {
      const name = match[1] || match[2] || match[3];
      structure.exports.push({ name, type: 'export' });
    }

    return structure;
  }

  analyzePythonStructure(code, structure) {
    // Function definitions
    const functionMatches = code.matchAll(/def\s+(\w+)\s*\(/g);
    for (const match of functionMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      structure.functions.push({ name: match[1], line, type: 'function' });
    }

    // Class definitions
    const classMatches = code.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      structure.classes.push({ name: match[1], line, type: 'class' });
    }

    // Imports
    const importMatches = code.matchAll(/(?:from\s+(\w+)\s+import|import\s+(\w+))/g);
    for (const match of importMatches) {
      const module = match[1] || match[2];
      structure.imports.push({ module, type: 'import' });
    }

    return structure;
  }

  analyzeJavaStructure(code, structure) {
    // Method definitions
    const methodMatches = code.matchAll(/(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/g);
    for (const match of methodMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      structure.functions.push({ name: match[1], line, type: 'method' });
    }

    // Class definitions
    const classMatches = code.matchAll(/(?:public\s+)?class\s+(\w+)/g);
    for (const match of classMatches) {
      const line = code.substring(0, match.index).split('\n').length;
      structure.classes.push({ name: match[1], line, type: 'class' });
    }

    // Imports
    const importMatches = code.matchAll(/import\s+([^;]+);/g);
    for (const match of importMatches) {
      structure.imports.push({ module: match[1], type: 'import' });
    }

    return structure;
  }

  analyzeGenericStructure(code, structure) {
    // Try to find function-like patterns
    const functionPatterns = [
      /def\s+(\w+)/g,          // Python
      /function\s+(\w+)/g,     // JavaScript
      /fn\s+(\w+)/g,           // Rust
      /func\s+(\w+)/g,         // Go
      /void\s+(\w+)/g,         // C/C++
      /int\s+(\w+)/g           // C/C++
    ];

    for (const pattern of functionPatterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        const line = code.substring(0, match.index).split('\n').length;
        structure.functions.push({ name: match[1], line, type: 'function' });
      }
    }

    return structure;
  }

  analyzeComplexity(code, language) {
    const complexity = {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(code),
      nestingDepth: this.calculateMaxNestingDepth(code),
      functionLengths: this.calculateFunctionLengths(code, language)
    };

    return complexity;
  }

  calculateCyclomaticComplexity(code) {
    // Simple cyclomatic complexity calculation
    const decisionPoints = [
      /if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ];

    let complexity = 1; // Base complexity
    
    for (const pattern of decisionPoints) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  calculateMaxNestingDepth(code) {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{' || char === '(' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ')' || char === ']') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  calculateFunctionLengths(code, language) {
    const functions = [];

    // This is a simplified implementation
    // In a real analyzer, you'd need proper parsing for each language
    
    return functions;
  }

  detectPatterns(code, language) {
    const patterns = {
      designPatterns: [],
      codeSmells: [],
      bestPractices: []
    };

    // Detect common design patterns
    if (code.includes('class') && code.includes('new ')) {
      patterns.designPatterns.push('Constructor Pattern');
    }
    
    if (code.includes('function') && code.includes('return')) {
      patterns.designPatterns.push('Factory Pattern');
    }

    // Detect code smells
    if (this.calculateCyclomaticComplexity(code) > 10) {
      patterns.codeSmells.push('High Cyclomatic Complexity');
    }

    const longLines = code.split('\n').filter(line => line.length > 100);
    if (longLines.length > 5) {
      patterns.codeSmells.push('Long Lines');
    }

    // Check for best practices
    if (language === 'javascript' || language === 'typescript') {
      if (code.includes('const ') || code.includes('let ')) {
        patterns.bestPractices.push('Modern Variable Declarations');
      }
      
      if (code.includes('async') && code.includes('await')) {
        patterns.bestPractices.push('Modern Async/Await');
      }
    }

    return patterns;
  }

  extractDependencies(code, language) {
    const dependencies = {
      internal: [],
      external: [],
      builtin: []
    };

    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.extractJavaScriptDependencies(code, dependencies);
      case 'python':
        return this.extractPythonDependencies(code, dependencies);
      default:
        return dependencies;
    }
  }

  extractJavaScriptDependencies(code, dependencies) {
    const importMatches = code.matchAll(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g);
    const requireMatches = code.matchAll(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);

    for (const match of importMatches) {
      const module = match[1];
      if (module.startsWith('.') || module.startsWith('/')) {
        dependencies.internal.push(module);
      } else if (['fs', 'path', 'http', 'https', 'util', 'os'].includes(module)) {
        dependencies.builtin.push(module);
      } else {
        dependencies.external.push(module);
      }
    }

    for (const match of requireMatches) {
      const module = match[1];
      if (module.startsWith('.') || module.startsWith('/')) {
        dependencies.internal.push(module);
      } else {
        dependencies.external.push(module);
      }
    }

    return dependencies;
  }

  extractPythonDependencies(code, dependencies) {
    const importMatches = code.matchAll(/(?:from\s+(\w+)(?:\.\w+)*\s+import|import\s+(\w+)(?:\.\w+)*)/g);

    for (const match of importMatches) {
      const module = match[1] || match[2];
      if (['os', 'sys', 'json', 'time', 'datetime', 'math', 're'].includes(module)) {
        dependencies.builtin.push(module);
      } else if (module.startsWith('.')) {
        dependencies.internal.push(module);
      } else {
        dependencies.external.push(module);
      }
    }

    return dependencies;
  }

  detectIssues(code, language) {
    const issues = [];

    // Generic issues
    if (code.includes('TODO') || code.includes('FIXME')) {
      issues.push({
        type: 'todo',
        severity: 'info',
        message: 'Contains TODO or FIXME comments'
      });
    }

    if (code.includes('console.log') || code.includes('print(')) {
      issues.push({
        type: 'debug',
        severity: 'warning',
        message: 'Contains debug/logging statements'
      });
    }

    // Language-specific issues
    if (language === 'javascript' || language === 'typescript') {
      if (code.includes('var ')) {
        issues.push({
          type: 'deprecated',
          severity: 'warning',
          message: 'Uses deprecated var declarations'
        });
      }

      if (code.includes('==') && !code.includes('===')) {
        issues.push({
          type: 'equality',
          severity: 'warning',
          message: 'Uses loose equality operator'
        });
      }
    }

    return issues;
  }

  generateSuggestions(code, language) {
    const suggestions = [];

    if (this.calculateCyclomaticComplexity(code) > 10) {
      suggestions.push({
        type: 'refactor',
        priority: 'high',
        message: 'Consider breaking down complex functions'
      });
    }

    const metrics = this.calculateMetrics(code);
    if (metrics.commentLines / metrics.codeLines < 0.1) {
      suggestions.push({
        type: 'documentation',
        priority: 'medium',
        message: 'Consider adding more comments and documentation'
      });
    }

    if (language === 'javascript' || language === 'typescript') {
      if (!code.includes('use strict')) {
        suggestions.push({
          type: 'best-practice',
          priority: 'low',
          message: 'Consider using strict mode'
        });
      }
    }

    return suggestions;
  }

  async analyzeProject(filesystem, rootPath = '.') {
    const files = await filesystem.listFiles(rootPath, {
      recursive: true,
      extensions: Object.keys(this.languageDetectors).map(ext => ext.replace('.', ''))
    });

    const projectAnalysis = {
      overview: {
        totalFiles: files.length,
        languages: new Set(),
        totalLines: 0,
        totalComplexity: 0
      },
      files: [],
      patterns: {
        architecturalPatterns: [],
        commonIssues: [],
        suggestions: []
      }
    };

    for (const file of files.slice(0, 50)) { // Limit to 50 files for performance
      try {
        const content = await filesystem.readFile(file);
        const analysis = await this.analyze(content, file);
        
        projectAnalysis.overview.languages.add(analysis.language);
        projectAnalysis.overview.totalLines += analysis.metrics.totalLines;
        projectAnalysis.overview.totalComplexity += analysis.complexity.cyclomaticComplexity;
        
        projectAnalysis.files.push({
          path: file,
          language: analysis.language,
          metrics: analysis.metrics,
          complexity: analysis.complexity.cyclomaticComplexity,
          issues: analysis.issues.length
        });
      } catch (error) {
        // Skip files that can't be analyzed
        continue;
      }
    }

    projectAnalysis.overview.languages = Array.from(projectAnalysis.overview.languages);
    
    return projectAnalysis;
  }
}
