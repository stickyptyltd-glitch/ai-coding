import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class PredictiveHelper {
  constructor(agent) {
    this.agent = agent;
    this.patterns = new Map();
    this.suggestions = new Map();
    this.workflowHistory = [];
    this.activeContext = new Map();
    this.predictionCache = new Map();
    this.initializePatterns();
  }

  initializePatterns() {
    // Common development patterns and their predictions
    this.patterns.set('express_server', {
      triggers: ['express', 'app.js', 'server.js', 'app.listen'],
      predictions: [
        {
          type: 'middleware',
          description: 'Express middleware setup',
          files: ['middleware/auth.js', 'middleware/cors.js', 'middleware/logger.js'],
          priority: 'high'
        },
        {
          type: 'routes',
          description: 'API route structure',
          files: ['routes/api.js', 'routes/users.js', 'routes/auth.js'],
          priority: 'high'
        },
        {
          type: 'models',
          description: 'Data models',
          files: ['models/User.js', 'models/index.js'],
          priority: 'medium'
        },
        {
          type: 'config',
          description: 'Configuration files',
          files: ['config/database.js', 'config/env.js', '.env.example'],
          priority: 'medium'
        }
      ]
    });

    this.patterns.set('react_component', {
      triggers: ['jsx', 'tsx', 'useState', 'useEffect', 'Component'],
      predictions: [
        {
          type: 'hooks',
          description: 'Custom React hooks',
          files: ['hooks/useApi.js', 'hooks/useAuth.js', 'hooks/useLocalStorage.js'],
          priority: 'high'
        },
        {
          type: 'context',
          description: 'React Context providers',
          files: ['context/AppContext.js', 'context/AuthContext.js'],
          priority: 'medium'
        },
        {
          type: 'utils',
          description: 'Utility functions',
          files: ['utils/helpers.js', 'utils/api.js', 'utils/validation.js'],
          priority: 'medium'
        },
        {
          type: 'styles',
          description: 'Styling files',
          files: ['styles/components.css', 'styles/variables.css'],
          priority: 'low'
        }
      ]
    });

    this.patterns.set('database_model', {
      triggers: ['mongoose', 'sequelize', 'schema', 'Model'],
      predictions: [
        {
          type: 'validation',
          description: 'Data validation utilities',
          files: ['validators/userValidator.js', 'validators/common.js'],
          priority: 'high'
        },
        {
          type: 'migrations',
          description: 'Database migrations',
          files: ['migrations/001_create_users.js', 'migrations/index.js'],
          priority: 'high'
        },
        {
          type: 'seeds',
          description: 'Database seeders',
          files: ['seeds/users.js', 'seeds/index.js'],
          priority: 'medium'
        },
        {
          type: 'services',
          description: 'Data service layer',
          files: ['services/userService.js', 'services/database.js'],
          priority: 'medium'
        }
      ]
    });

    this.patterns.set('authentication', {
      triggers: ['jwt', 'passport', 'auth', 'login', 'register'],
      predictions: [
        {
          type: 'security',
          description: 'Security utilities',
          files: ['utils/hash.js', 'utils/crypto.js', 'utils/tokens.js'],
          priority: 'high'
        },
        {
          type: 'middleware',
          description: 'Auth middleware',
          files: ['middleware/authenticate.js', 'middleware/authorize.js'],
          priority: 'high'
        },
        {
          type: 'routes',
          description: 'Auth routes',
          files: ['routes/auth.js', 'routes/password-reset.js'],
          priority: 'high'
        },
        {
          type: 'templates',
          description: 'Email templates',
          files: ['templates/welcome.html', 'templates/password-reset.html'],
          priority: 'low'
        }
      ]
    });

    this.patterns.set('testing', {
      triggers: ['jest', 'test', 'spec', 'describe', 'it('],
      predictions: [
        {
          type: 'setup',
          description: 'Test setup files',
          files: ['tests/setup.js', 'tests/helpers.js', 'tests/mocks.js'],
          priority: 'high'
        },
        {
          type: 'fixtures',
          description: 'Test fixtures',
          files: ['tests/fixtures/users.js', 'tests/fixtures/api-responses.js'],
          priority: 'medium'
        },
        {
          type: 'integration',
          description: 'Integration tests',
          files: ['tests/integration/api.test.js', 'tests/integration/database.test.js'],
          priority: 'medium'
        }
      ]
    });
  }

  async analyzeCurrentContext() {
    console.log(chalk.blue('🔮 Analyzing current development context...'));
    
    try {
      // Get current files and recent changes
      const files = await this.getAllProjectFiles();
      const recentFiles = await this.getRecentlyModifiedFiles(files);
      const currentCode = await this.analyzeCodePatterns(recentFiles);
      
      // Update active context
      this.activeContext.set('files', files);
      this.activeContext.set('recentFiles', recentFiles);
      this.activeContext.set('codePatterns', currentCode);
      this.activeContext.set('timestamp', new Date());

      return {
        totalFiles: files.length,
        recentFiles: recentFiles.length,
        detectedPatterns: currentCode.patterns,
        suggestions: await this.generatePredictions(currentCode)
      };
      
    } catch (error) {
      console.log(chalk.red('Context analysis failed:', error.message));
      return { error: error.message };
    }
  }

  async getAllProjectFiles() {
    const files = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.css', '.html'];
    
    async function traverse(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            const stats = await fs.stat(fullPath);
            files.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              modified: stats.mtime,
              extension: path.extname(entry.name)
            });
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await traverse('.');
    return files;
  }

  async getRecentlyModifiedFiles(files, hours = 2) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return files
      .filter(file => file.modified > cutoff)
      .sort((a, b) => b.modified - a.modified);
  }

  async analyzeCodePatterns(files) {
    const analysis = {
      patterns: [],
      technologies: new Set(),
      frameworks: new Set(),
      intentions: []
    };

    for (const file of files.slice(0, 10)) { // Analyze recent files
      try {
        const content = await fs.readFile(file.path, 'utf8');
        
        // Detect patterns
        for (const [patternName, pattern] of this.patterns) {
          const matches = pattern.triggers.filter(trigger => 
            content.toLowerCase().includes(trigger.toLowerCase())
          );
          
          if (matches.length > 0) {
            analysis.patterns.push({
              name: patternName,
              file: file.path,
              matches,
              confidence: matches.length / pattern.triggers.length
            });
          }
        }

        // Extract technologies and frameworks
        this.extractTechnologies(content, analysis);
        
      } catch (error) {
        // Skip files we can't read
      }
    }

    analysis.technologies = Array.from(analysis.technologies);
    analysis.frameworks = Array.from(analysis.frameworks);
    
    return analysis;
  }

  extractTechnologies(content, analysis) {
    const techPatterns = {
      'React': /import.*react/i,
      'Express': /express\(\)/i,
      'MongoDB': /mongoose|mongodb/i,
      'PostgreSQL': /pg|postgres/i,
      'JWT': /jsonwebtoken|jwt/i,
      'Stripe': /stripe/i,
      'Socket.IO': /socket\.io/i,
      'Jest': /describe\(|test\(|it\(/i,
      'TypeScript': /interface |type |enum /i,
      'Next.js': /next\/|getStaticProps|getServerSideProps/i,
      'GraphQL': /graphql|apollo/i
    };

    for (const [tech, pattern] of Object.entries(techPatterns)) {
      if (pattern.test(content)) {
        analysis.technologies.add(tech);
      }
    }
  }

  async generatePredictions(codeAnalysis) {
    console.log(chalk.cyan('🎯 Generating predictive suggestions...'));
    
    const predictions = [];
    
    // Pattern-based predictions
    for (const detectedPattern of codeAnalysis.patterns) {
      const pattern = this.patterns.get(detectedPattern.name);
      if (pattern && detectedPattern.confidence > 0.3) {
        
        for (const prediction of pattern.predictions) {
          const existingFiles = await this.checkExistingFiles(prediction.files);
          const missingFiles = prediction.files.filter(file => !existingFiles.includes(file));
          
          if (missingFiles.length > 0) {
            predictions.push({
              type: prediction.type,
              description: prediction.description,
              basedOn: detectedPattern.name,
              files: missingFiles,
              priority: prediction.priority,
              confidence: detectedPattern.confidence,
              reasoning: `Detected ${detectedPattern.name} pattern in ${path.basename(detectedPattern.file)}`
            });
          }
        }
      }
    }

    // AI-powered predictions
    const aiPredictions = await this.getAIPredictions(codeAnalysis);
    predictions.push(...aiPredictions);

    // Workflow-based predictions
    const workflowPredictions = this.getWorkflowPredictions();
    predictions.push(...workflowPredictions);

    return this.prioritizePredictions(predictions);
  }

  async checkExistingFiles(filePaths) {
    const existing = [];
    
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
        existing.push(filePath);
      } catch {
        // File doesn't exist
      }
    }
    
    return existing;
  }

  async getAIPredictions(codeAnalysis) {
    if (codeAnalysis.patterns.length === 0) return [];
    
    try {
      const prompt = `Based on this code analysis, predict what the developer will likely need next:

Detected patterns: ${codeAnalysis.patterns.map(p => p.name).join(', ')}
Technologies: ${codeAnalysis.technologies.join(', ')}
Recent activity: Working on ${codeAnalysis.patterns[0]?.file || 'unknown'}

Generate 3 specific predictions of files/components the developer will likely need next.
Consider common development workflows and best practices.

Format as JSON array with: type, description, files[], priority, reasoning`;

      const response = await this.agent.aiProvider.query(prompt, {
        taskType: 'prediction',
        maxTokens: 800,
        format: 'json'
      });

      return JSON.parse(response);
      
    } catch (error) {
      console.log(chalk.yellow('AI predictions failed:', error.message));
      return [];
    }
  }

  getWorkflowPredictions() {
    const predictions = [];
    const recentWorkflow = this.workflowHistory.slice(-5);
    
    // Common workflow patterns
    const workflows = {
      'model-route-test': {
        sequence: ['model', 'route', 'test'],
        next: 'integration test'
      },
      'component-hook-style': {
        sequence: ['component', 'hook', 'style'],
        next: 'story or test'
      },
      'api-service-validation': {
        sequence: ['api', 'service', 'validation'],
        next: 'error handling'
      }
    };

    for (const [workflowName, workflow] of Object.entries(workflows)) {
      if (this.matchesWorkflowSequence(recentWorkflow, workflow.sequence)) {
        predictions.push({
          type: 'workflow',
          description: `Continue ${workflowName} pattern`,
          suggestion: workflow.next,
          priority: 'medium',
          reasoning: `Following common ${workflowName} workflow pattern`
        });
      }
    }

    return predictions;
  }

  matchesWorkflowSequence(recentWorkflow, sequence) {
    if (recentWorkflow.length < sequence.length) return false;
    
    const recent = recentWorkflow.slice(-sequence.length);
    return sequence.every((step, index) => 
      recent[index]?.type?.includes(step) || recent[index]?.description?.toLowerCase().includes(step)
    );
  }

  prioritizePredictions(predictions) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return predictions
      .sort((a, b) => {
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        const aConfidence = a.confidence || 0.5;
        const bConfidence = b.confidence || 0.5;
        
        return (bPriority * bConfidence) - (aPriority * aConfidence);
      })
      .slice(0, 8); // Limit to top 8 predictions
  }

  async generatePredictiveFiles(predictions, options = {}) {
    console.log(chalk.blue('🛠️ Pre-generating predicted files...'));
    
    const generated = [];
    const toGenerate = predictions
      .filter(p => p.files && p.priority !== 'low')
      .slice(0, options.maxFiles || 5);

    for (const prediction of toGenerate) {
      for (const filePath of prediction.files) {
        try {
          // Check if file already exists
          try {
            await fs.access(filePath);
            continue; // Skip existing files
          } catch {
            // File doesn't exist, generate it
          }

          const content = await this.generateFileContent(filePath, prediction);
          if (content) {
            // Ensure directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            if (options.preview) {
              generated.push({
                path: filePath,
                preview: content.slice(0, 200) + '...',
                type: prediction.type,
                reasoning: prediction.reasoning
              });
            } else {
              await fs.writeFile(filePath, content);
              generated.push({
                path: filePath,
                type: prediction.type,
                size: content.length
              });
              console.log(chalk.green(`  ✅ Generated ${filePath}`));
            }
          }
        } catch (error) {
          console.log(chalk.red(`  ❌ Failed to generate ${filePath}: ${error.message}`));
        }
      }
    }

    return {
      success: true,
      generated,
      count: generated.length,
      predictions: predictions.length
    };
  }

  async generateFileContent(filePath, prediction) {
    const extension = path.extname(filePath);
    
    // Use templates for common patterns
    if (this.hasTemplate(filePath, prediction.type)) {
      return this.generateFromTemplate(filePath, prediction);
    }

    // AI-powered generation
    const prompt = `Generate content for this file:

Path: ${filePath}
Type: ${prediction.type}
Description: ${prediction.description}
Context: ${prediction.reasoning}

Create a complete, functional ${extension} file that follows best practices.
Include appropriate imports, exports, and documentation.
Make it ready to use with minimal modification.`;

    try {
      const content = await this.agent.aiProvider.query(prompt, {
        taskType: 'fileGeneration',
        maxTokens: 1000
      });

      return this.cleanGeneratedContent(content, extension);
      
    } catch (error) {
      console.log(chalk.yellow(`Content generation failed for ${filePath}`));
      return this.generateFallbackContent(filePath, prediction);
    }
  }

  hasTemplate(filePath, type) {
    const templates = {
      'middleware/auth.js': true,
      'routes/api.js': true,
      'hooks/useApi.js': true,
      'utils/helpers.js': true
    };
    
    return templates[filePath] || templates[type];
  }

  generateFromTemplate(filePath, prediction) {
    const fileName = path.basename(filePath);
    
    const templates = {
      'auth.js': `// Authentication middleware
export const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    // Verify token logic here
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};`,

      'useApi.js': `// Custom API hook
import { useState, useEffect } from 'react';

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, options);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};`
    };

    return templates[fileName] || templates[prediction.type] || null;
  }

  cleanGeneratedContent(content, extension) {
    // Remove markdown code blocks if present
    let cleaned = content.replace(/```[\w]*\n?/g, '').replace(/```$/g, '');
    
    // Ensure proper file structure
    if (extension === '.js' || extension === '.ts') {
      if (!cleaned.includes('export') && !cleaned.includes('module.exports')) {
        // Add basic export if missing
        cleaned += '\n\nexport default {};\n';
      }
    }

    return cleaned.trim() + '\n';
  }

  generateFallbackContent(filePath, prediction) {
    const extension = path.extname(filePath);
    const baseName = path.basename(filePath, extension);
    
    const fallbacks = {
      '.js': `// ${baseName} - ${prediction.description}\n// Generated by Predictive Helper\n\nexport default {};\n`,
      '.ts': `// ${baseName} - ${prediction.description}\n// Generated by Predictive Helper\n\nexport {};\n`,
      '.css': `/* ${baseName} - ${prediction.description} */\n/* Generated by Predictive Helper */\n`,
      '.md': `# ${baseName}\n\n${prediction.description}\n\n*Generated by Predictive Helper*\n`
    };

    return fallbacks[extension] || `// ${prediction.description}\n// Generated by Predictive Helper\n`;
  }

  async trackWorkflow(action) {
    this.workflowHistory.push({
      action,
      timestamp: new Date(),
      context: this.activeContext.get('codePatterns')?.patterns || []
    });

    // Keep only recent history
    if (this.workflowHistory.length > 20) {
      this.workflowHistory = this.workflowHistory.slice(-20);
    }

    // Trigger real-time predictions if significant action
    if (this.isSignificantAction(action)) {
      const predictions = await this.generatePredictions(
        this.activeContext.get('codePatterns') || { patterns: [] }
      );
      
      this.suggestions.set('latest', {
        predictions,
        timestamp: new Date(),
        trigger: action
      });
    }
  }

  isSignificantAction(action) {
    const significantActions = [
      'file_created', 'major_edit', 'new_feature', 'refactor_completed',
      'test_added', 'api_endpoint_added', 'component_created'
    ];
    
    return significantActions.some(sig => 
      action.toLowerCase().includes(sig.toLowerCase())
    );
  }

  getLatestSuggestions() {
    const latest = this.suggestions.get('latest');
    if (!latest || Date.now() - latest.timestamp > 30 * 60 * 1000) { // 30 minutes
      return { predictions: [], stale: true };
    }
    
    return latest;
  }

  async runPredictiveAnalysis() {
    console.log(chalk.blue('🔮 Running complete predictive analysis...'));
    
    const context = await this.analyzeCurrentContext();
    const suggestions = context.suggestions || [];
    
    const result = {
      success: true,
      context: {
        files: context.totalFiles,
        recentActivity: context.recentFiles,
        patterns: context.detectedPatterns
      },
      predictions: suggestions,
      readyToGenerate: suggestions.filter(s => s.priority === 'high').length,
      summary: `Found ${suggestions.length} predictions, ${suggestions.filter(s => s.priority === 'high').length} high priority`
    };

    // Cache the results
    this.predictionCache.set('latest', {
      result,
      timestamp: new Date()
    });

    return result;
  }

  async autoGenerate(options = { preview: true, maxFiles: 3 }) {
    const analysis = await this.runPredictiveAnalysis();
    
    if (analysis.predictions.length === 0) {
      return {
        success: true,
        message: 'No predictions available for auto-generation',
        generated: []
      };
    }

    return await this.generatePredictiveFiles(analysis.predictions, options);
  }
}
