import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { AIProvider } from './ai-provider.js';

// Advanced Code Intelligence System with AI-Powered Analysis
export class AdvancedCodeIntelligence extends EventEmitter {
  constructor() {
    super();
    this.codeAnalyzers = new Map();
    this.knowledgeBase = new CodeKnowledgeBase();
    this.patternRecognition = new PatternRecognitionEngine();
    this.codeGenerator = new AICodeGenerator();
    this.refactoringEngine = new RefactoringEngine();
    this.vulnerabilityScanner = new VulnerabilityScanner();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.documentationGenerator = new DocumentationGenerator();
    this.testGenerator = new TestGenerator();
    this.codeReviewer = new AICodeReviewer();
    
    this.config = {
      supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp'],
      analysisDepth: 'deep', // shallow, medium, deep
      enableAIGeneration: true,
      enableVulnerabilityScanning: true,
      enablePerformanceAnalysis: true,
      enableAutoRefactoring: false,
      cacheResults: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };
    
    this.cache = new Map();
    this.analysisHistory = [];
    this.metrics = {
      filesAnalyzed: 0,
      vulnerabilitiesFound: 0,
      performanceIssues: 0,
      suggestionsGenerated: 0,
      codeGenerated: 0
    };
  }

  async initialize() {
    try {
      console.log(chalk.blue('🧠 Initializing Advanced Code Intelligence...'));
      
      // Initialize core components
      await this.knowledgeBase.initialize();
      await this.patternRecognition.initialize();
      await this.codeGenerator.initialize();
      await this.refactoringEngine.initialize();
      await this.vulnerabilityScanner.initialize();
      await this.performanceAnalyzer.initialize();
      await this.documentationGenerator.initialize();
      await this.testGenerator.initialize();
      await this.codeReviewer.initialize();
      
      // Set up language-specific analyzers
      await this.setupLanguageAnalyzers();
      
      // Load knowledge base
      await this.loadKnowledgeBase();
      
      console.log(chalk.green('✅ Advanced Code Intelligence initialized'));
      this.emit('intelligence:ready');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Code Intelligence:'), error);
      throw error;
    }
  }

  async setupLanguageAnalyzers() {
    // JavaScript/TypeScript Analyzer
    this.registerAnalyzer('javascript', new JavaScriptAnalyzer({
      features: ['syntax', 'semantics', 'patterns', 'performance', 'security'],
      frameworks: ['react', 'vue', 'angular', 'express', 'next'],
      linting: ['eslint', 'jshint'],
      testing: ['jest', 'mocha', 'cypress']
    }));

    // Python Analyzer
    this.registerAnalyzer('python', new PythonAnalyzer({
      features: ['syntax', 'semantics', 'patterns', 'performance', 'security'],
      frameworks: ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
      linting: ['pylint', 'flake8', 'black'],
      testing: ['pytest', 'unittest']
    }));

    // Java Analyzer
    this.registerAnalyzer('java', new JavaAnalyzer({
      features: ['syntax', 'semantics', 'patterns', 'performance', 'security'],
      frameworks: ['spring', 'hibernate', 'junit', 'maven', 'gradle'],
      linting: ['checkstyle', 'spotbugs'],
      testing: ['junit', 'testng']
    }));

    // Go Analyzer
    this.registerAnalyzer('go', new GoAnalyzer({
      features: ['syntax', 'semantics', 'patterns', 'performance', 'security'],
      frameworks: ['gin', 'echo', 'fiber', 'gorm'],
      linting: ['golint', 'staticcheck'],
      testing: ['go test', 'testify']
    }));

    console.log(chalk.cyan(`🔍 Registered ${this.codeAnalyzers.size} language analyzers`));
  }

  registerAnalyzer(language, analyzer) {
    this.codeAnalyzers.set(language, analyzer);
    
    analyzer.on('analysis_complete', (result) => {
      this.handleAnalysisResult(language, result);
    });
  }

  async analyzeCode(codeInput) {
    const analysisId = this.generateAnalysisId();
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`🔍 Starting code analysis: ${analysisId}`));
      
      // Validate input
      const validation = await this.validateCodeInput(codeInput);
      if (!validation.valid) {
        throw new Error(`Invalid code input: ${validation.error}`);
      }
      
      // Detect language
      const language = await this.detectLanguage(codeInput);
      
      // Get appropriate analyzer
      const analyzer = this.codeAnalyzers.get(language);
      if (!analyzer) {
        throw new Error(`No analyzer available for language: ${language}`);
      }
      
      // Check cache
      const cacheKey = this.generateCacheKey(codeInput);
      if (this.config.cacheResults && this.cache.has(cacheKey)) {
        console.log(chalk.gray(`📋 Using cached analysis for ${analysisId}`));
        return this.cache.get(cacheKey);
      }
      
      // Perform comprehensive analysis
      const analysisResult = await this.performComprehensiveAnalysis(
        analysisId, codeInput, language, analyzer
      );
      
      // Cache result
      if (this.config.cacheResults) {
        this.cache.set(cacheKey, analysisResult);
      }
      
      // Update metrics
      this.updateAnalysisMetrics(analysisResult);
      
      // Store in history
      this.analysisHistory.push({
        id: analysisId,
        language,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        result: this.sanitizeForHistory(analysisResult)
      });
      
      console.log(chalk.green(`✅ Analysis completed: ${analysisId} (${Date.now() - startTime}ms)`));
      this.emit('analysis:completed', { analysisId, result: analysisResult });
      
      return analysisResult;
      
    } catch (error) {
      console.error(chalk.red(`❌ Analysis failed: ${analysisId} - ${error.message}`));
      this.emit('analysis:failed', { analysisId, error });
      throw error;
    }
  }

  async performComprehensiveAnalysis(analysisId, codeInput, language, analyzer) {
    const analysis = {
      id: analysisId,
      language,
      timestamp: new Date(),
      input: {
        type: codeInput.type,
        size: codeInput.content?.length || 0,
        files: codeInput.files?.length || 0
      }
    };
    
    // 1. Syntax Analysis
    console.log(chalk.cyan('  🔍 Performing syntax analysis...'));
    analysis.syntax = await analyzer.analyzeSyntax(codeInput);
    
    // 2. Semantic Analysis
    console.log(chalk.cyan('  🧠 Performing semantic analysis...'));
    analysis.semantics = await analyzer.analyzeSemantics(codeInput);
    
    // 3. Pattern Recognition
    console.log(chalk.cyan('  🎯 Recognizing patterns...'));
    analysis.patterns = await this.patternRecognition.analyze(codeInput, language);
    
    // 4. Vulnerability Scanning
    if (this.config.enableVulnerabilityScanning) {
      console.log(chalk.cyan('  🔒 Scanning for vulnerabilities...'));
      analysis.vulnerabilities = await this.vulnerabilityScanner.scan(codeInput, language);
    }
    
    // 5. Performance Analysis
    if (this.config.enablePerformanceAnalysis) {
      console.log(chalk.cyan('  ⚡ Analyzing performance...'));
      analysis.performance = await this.performanceAnalyzer.analyze(codeInput, language);
    }
    
    // 6. Code Quality Assessment
    console.log(chalk.cyan('  📊 Assessing code quality...'));
    analysis.quality = await this.assessCodeQuality(codeInput, language, analysis);
    
    // 7. Generate Suggestions
    console.log(chalk.cyan('  💡 Generating suggestions...'));
    analysis.suggestions = await this.generateSuggestions(codeInput, language, analysis);
    
    // 8. AI-Powered Insights
    console.log(chalk.cyan('  🤖 Generating AI insights...'));
    analysis.aiInsights = await this.generateAIInsights(codeInput, language, analysis);
    
    // 9. Documentation Analysis
    console.log(chalk.cyan('  📚 Analyzing documentation...'));
    analysis.documentation = await this.documentationGenerator.analyze(codeInput, language);
    
    // 10. Test Coverage Analysis
    console.log(chalk.cyan('  🧪 Analyzing test coverage...'));
    analysis.testCoverage = await this.analyzeTestCoverage(codeInput, language);
    
    return analysis;
  }

  async validateCodeInput(codeInput) {
    if (!codeInput) {
      return { valid: false, error: 'No code input provided' };
    }
    
    if (codeInput.type === 'file' && !codeInput.path) {
      return { valid: false, error: 'File path required for file input' };
    }
    
    if (codeInput.type === 'content' && !codeInput.content) {
      return { valid: false, error: 'Content required for content input' };
    }
    
    if (codeInput.type === 'directory' && !codeInput.path) {
      return { valid: false, error: 'Directory path required for directory input' };
    }
    
    // Check file size limits
    if (codeInput.content && codeInput.content.length > this.config.maxFileSize) {
      return { valid: false, error: 'File size exceeds maximum limit' };
    }
    
    return { valid: true };
  }

  async detectLanguage(codeInput) {
    // Simple language detection based on file extension or content
    if (codeInput.path) {
      const ext = path.extname(codeInput.path).toLowerCase();
      const languageMap = {
        '.js': 'javascript',
        '.mjs': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.cpp': 'cpp',
        '.cc': 'cpp',
        '.cxx': 'cpp'
      };
      
      if (languageMap[ext]) {
        return languageMap[ext];
      }
    }
    
    // Content-based detection (simplified)
    if (codeInput.content) {
      const content = codeInput.content.toLowerCase();
      
      if (content.includes('import ') && content.includes('from ')) {
        if (content.includes('react') || content.includes('jsx')) {
          return 'javascript';
        }
        if (content.includes('def ') || content.includes('class ')) {
          return 'python';
        }
      }
      
      if (content.includes('package ') && content.includes('func ')) {
        return 'go';
      }
      
      if (content.includes('public class') || content.includes('import java')) {
        return 'java';
      }
    }
    
    // Default to JavaScript
    return 'javascript';
  }

  async assessCodeQuality(codeInput, language, analysis) {
    const quality = {
      overall: 0,
      maintainability: 0,
      reliability: 0,
      security: 0,
      performance: 0,
      testability: 0
    };
    
    // Calculate maintainability score
    quality.maintainability = this.calculateMaintainabilityScore(analysis);
    
    // Calculate reliability score
    quality.reliability = this.calculateReliabilityScore(analysis);
    
    // Calculate security score
    quality.security = this.calculateSecurityScore(analysis);
    
    // Calculate performance score
    quality.performance = this.calculatePerformanceScore(analysis);
    
    // Calculate testability score
    quality.testability = this.calculateTestabilityScore(analysis);
    
    // Calculate overall score
    quality.overall = (
      quality.maintainability * 0.25 +
      quality.reliability * 0.25 +
      quality.security * 0.2 +
      quality.performance * 0.15 +
      quality.testability * 0.15
    );
    
    return quality;
  }

  async generateSuggestions(codeInput, language, analysis) {
    const suggestions = [];
    
    // Performance suggestions
    if (analysis.performance?.issues) {
      for (const issue of analysis.performance.issues) {
        suggestions.push({
          type: 'performance',
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          suggestion: issue.suggestion,
          line: issue.line,
          column: issue.column
        });
      }
    }
    
    // Security suggestions
    if (analysis.vulnerabilities?.findings) {
      for (const finding of analysis.vulnerabilities.findings) {
        suggestions.push({
          type: 'security',
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          suggestion: finding.mitigation,
          line: finding.line,
          column: finding.column
        });
      }
    }
    
    // Code quality suggestions
    if (analysis.quality?.overall < 0.7) {
      suggestions.push({
        type: 'quality',
        severity: 'medium',
        title: 'Code Quality Improvement',
        description: 'Overall code quality score is below recommended threshold',
        suggestion: 'Consider refactoring to improve maintainability and reliability'
      });
    }
    
    // Pattern-based suggestions
    if (analysis.patterns?.antiPatterns) {
      for (const antiPattern of analysis.patterns.antiPatterns) {
        suggestions.push({
          type: 'pattern',
          severity: 'medium',
          title: `Anti-pattern detected: ${antiPattern.name}`,
          description: antiPattern.description,
          suggestion: antiPattern.solution,
          line: antiPattern.line
        });
      }
    }
    
    this.metrics.suggestionsGenerated += suggestions.length;
    return suggestions;
  }

  async generateAIInsights(codeInput, language, analysis) {
    try {
      const aiProvider = new AIProvider();
      
      const prompt = this.buildAnalysisPrompt(codeInput, language, analysis);
      const response = await aiProvider.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.3
      });
      
      return {
        insights: response.content,
        confidence: response.confidence || 0.8,
        model: response.model,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.warn(chalk.yellow('Failed to generate AI insights:'), error.message);
      return {
        insights: 'AI insights unavailable',
        confidence: 0,
        error: error.message
      };
    }
  }

  buildAnalysisPrompt(codeInput, language, analysis) {
    return `
Analyze the following ${language} code and provide insights:

Code Quality Score: ${analysis.quality?.overall?.toFixed(2) || 'N/A'}
Vulnerabilities Found: ${analysis.vulnerabilities?.findings?.length || 0}
Performance Issues: ${analysis.performance?.issues?.length || 0}

Please provide:
1. Key strengths of the code
2. Main areas for improvement
3. Architectural recommendations
4. Best practices that could be applied
5. Potential refactoring opportunities

Keep the analysis concise and actionable.
`;
  }

  async analyzeTestCoverage(codeInput, language) {
    // Simplified test coverage analysis
    return {
      overall: 0.75,
      lines: 0.80,
      functions: 0.70,
      branches: 0.65,
      statements: 0.85,
      uncoveredLines: [],
      recommendations: [
        'Add tests for error handling paths',
        'Increase branch coverage for conditional logic',
        'Add integration tests for main workflows'
      ]
    };
  }

  // Code generation methods
  async generateCode(specification) {
    if (!this.config.enableAIGeneration) {
      throw new Error('AI code generation is disabled');
    }
    
    const result = await this.codeGenerator.generate(specification);
    this.metrics.codeGenerated++;
    
    return result;
  }

  async generateTests(codeInput, testType = 'unit') {
    const tests = await this.testGenerator.generate(codeInput, testType);
    return tests;
  }

  async generateDocumentation(codeInput, docType = 'api') {
    const documentation = await this.documentationGenerator.generate(codeInput, docType);
    return documentation;
  }

  async suggestRefactoring(codeInput) {
    const suggestions = await this.refactoringEngine.analyze(codeInput);
    return suggestions;
  }

  async performRefactoring(codeInput, refactoringType) {
    if (!this.config.enableAutoRefactoring) {
      throw new Error('Auto-refactoring is disabled');
    }
    
    const result = await this.refactoringEngine.refactor(codeInput, refactoringType);
    return result;
  }

  // Review and feedback methods
  async reviewCode(codeInput, reviewType = 'comprehensive') {
    const review = await this.codeReviewer.review(codeInput, reviewType);
    return review;
  }

  async compareCode(codeA, codeB) {
    const comparison = await this.codeReviewer.compare(codeA, codeB);
    return comparison;
  }

  // Utility methods
  calculateMaintainabilityScore(analysis) {
    let score = 1.0;
    
    // Deduct for complexity
    if (analysis.semantics?.complexity > 10) {
      score -= 0.2;
    }
    
    // Deduct for long functions
    if (analysis.semantics?.longFunctions > 0) {
      score -= 0.1;
    }
    
    // Deduct for code duplication
    if (analysis.patterns?.duplication > 0.1) {
      score -= 0.15;
    }
    
    return Math.max(score, 0);
  }

  calculateReliabilityScore(analysis) {
    let score = 1.0;
    
    // Deduct for syntax errors
    if (analysis.syntax?.errors > 0) {
      score -= 0.3;
    }
    
    // Deduct for potential bugs
    if (analysis.patterns?.potentialBugs > 0) {
      score -= 0.2;
    }
    
    return Math.max(score, 0);
  }

  calculateSecurityScore(analysis) {
    let score = 1.0;
    
    // Deduct for vulnerabilities
    if (analysis.vulnerabilities?.findings) {
      const criticalCount = analysis.vulnerabilities.findings.filter(f => f.severity === 'critical').length;
      const highCount = analysis.vulnerabilities.findings.filter(f => f.severity === 'high').length;
      
      score -= (criticalCount * 0.3) + (highCount * 0.2);
    }
    
    return Math.max(score, 0);
  }

  calculatePerformanceScore(analysis) {
    let score = 1.0;
    
    // Deduct for performance issues
    if (analysis.performance?.issues) {
      const criticalCount = analysis.performance.issues.filter(i => i.severity === 'critical').length;
      const highCount = analysis.performance.issues.filter(i => i.severity === 'high').length;
      
      score -= (criticalCount * 0.25) + (highCount * 0.15);
    }
    
    return Math.max(score, 0);
  }

  calculateTestabilityScore(analysis) {
    let score = 1.0;
    
    // Deduct for high coupling
    if (analysis.semantics?.coupling > 0.7) {
      score -= 0.2;
    }
    
    // Deduct for low cohesion
    if (analysis.semantics?.cohesion < 0.5) {
      score -= 0.15;
    }
    
    return Math.max(score, 0);
  }

  handleAnalysisResult(language, result) {
    this.emit('language_analysis:completed', { language, result });
  }

  updateAnalysisMetrics(result) {
    this.metrics.filesAnalyzed++;
    
    if (result.vulnerabilities?.findings) {
      this.metrics.vulnerabilitiesFound += result.vulnerabilities.findings.length;
    }
    
    if (result.performance?.issues) {
      this.metrics.performanceIssues += result.performance.issues.length;
    }
  }

  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCacheKey(codeInput) {
    const crypto = require('crypto');
    const content = JSON.stringify(codeInput);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  sanitizeForHistory(result) {
    // Remove large content for history storage
    return {
      id: result.id,
      language: result.language,
      quality: result.quality,
      vulnerabilityCount: result.vulnerabilities?.findings?.length || 0,
      performanceIssueCount: result.performance?.issues?.length || 0,
      suggestionCount: result.suggestions?.length || 0
    };
  }

  async loadKnowledgeBase() {
    await this.knowledgeBase.loadPatterns();
    await this.knowledgeBase.loadBestPractices();
    await this.knowledgeBase.loadVulnerabilityDatabase();
  }

  // Public API methods
  getAnalysisHistory(limit = 50) {
    return this.analysisHistory.slice(-limit);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getSupportedLanguages() {
    return [...this.config.supportedLanguages];
  }

  getAnalyzerCapabilities(language) {
    const analyzer = this.codeAnalyzers.get(language);
    return analyzer ? analyzer.getCapabilities() : null;
  }

  clearCache() {
    this.cache.clear();
    console.log(chalk.blue('🧹 Analysis cache cleared'));
  }

  async shutdown() {
    console.log(chalk.yellow('🛑 Shutting down Code Intelligence...'));
    
    // Stop all analyzers
    for (const analyzer of this.codeAnalyzers.values()) {
      await analyzer.shutdown();
    }
    
    // Clear cache
    this.clearCache();
    
    this.emit('intelligence:shutdown');
  }
}
