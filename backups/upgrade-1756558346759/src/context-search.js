import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class ContextAwareSearch {
  constructor(agent) {
    this.agent = agent;
    this.projectContext = new Map();
    this.functionRegistry = new Map();
    this.classRegistry = new Map();
    this.importRegistry = new Map();
    this.configRegistry = new Map();
    this.indexingComplete = false;
  }

  async indexProject(rootPath = '.') {
    console.log(chalk.blue('🔍 Indexing project for context-aware search...'));
    
    const files = await this.getAllCodeFiles(rootPath);
    const indexPromises = files.map(file => this.indexFile(file));
    
    await Promise.all(indexPromises);
    
    this.indexingComplete = true;
    console.log(chalk.green(`✅ Indexed ${files.length} files`));
    
    return {
      filesIndexed: files.length,
      functionsFound: this.functionRegistry.size,
      classesFound: this.classRegistry.size,
      configsFound: this.configRegistry.size
    };
  }

  async getAllCodeFiles(rootPath) {
    const files = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rb', '.php'];
    
    async function traverse(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await traverse(rootPath);
    return files;
  }

  async indexFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const analysis = await this.analyzeCodeStructure(content, filePath);
      
      // Store file context
      this.projectContext.set(filePath, {
        content,
        analysis,
        lastModified: new Date(),
        size: content.length
      });

      // Index functions
      analysis.functions.forEach(func => {
        const key = `${func.name}:${filePath}`;
        this.functionRegistry.set(func.name, {
          ...func,
          file: filePath,
          key
        });
      });

      // Index classes
      analysis.classes.forEach(cls => {
        const key = `${cls.name}:${filePath}`;
        this.classRegistry.set(cls.name, {
          ...cls,
          file: filePath,
          key
        });
      });

      // Index imports
      analysis.imports.forEach(imp => {
        if (!this.importRegistry.has(imp.module)) {
          this.importRegistry.set(imp.module, []);
        }
        this.importRegistry.get(imp.module).push({
          ...imp,
          file: filePath
        });
      });

      // Index config files
      if (this.isConfigFile(filePath)) {
        this.configRegistry.set(path.basename(filePath), {
          path: filePath,
          content,
          type: this.getConfigType(filePath)
        });
      }

    } catch (error) {
      console.log(chalk.yellow(`Warning: Could not index ${filePath}: ${error.message}`));
    }
  }

  async analyzeCodeStructure(content, filePath) {
    const ext = path.extname(filePath);
    
    // Basic regex-based analysis (can be enhanced with AST parsing)
    const analysis = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      variables: [],
      comments: []
    };

    // JavaScript/TypeScript analysis
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      // Functions
      const funcMatches = content.matchAll(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)|(\w+)\s*:\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g);
      for (const match of funcMatches) {
        const name = match[1] || match[2] || match[3];
        if (name) {
          analysis.functions.push({
            name,
            line: this.getLineNumber(content, match.index),
            type: match[1] ? 'declaration' : 'expression'
          });
        }
      }

      // Classes
      const classMatches = content.matchAll(/class\s+(\w+)(?:\s+extends\s+(\w+))?/g);
      for (const match of classMatches) {
        analysis.classes.push({
          name: match[1],
          extends: match[2],
          line: this.getLineNumber(content, match.index)
        });
      }

      // Imports
      const importMatches = content.matchAll(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        analysis.imports.push({
          names: match[1] ? match[1].split(',').map(s => s.trim()) : [match[2] || match[3]],
          module: match[4],
          line: this.getLineNumber(content, match.index)
        });
      }
    }

    return analysis;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  isConfigFile(filePath) {
    const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', '.env', 'docker-compose.yml', 'Dockerfile'];
    const basename = path.basename(filePath);
    return configFiles.some(config => basename.includes(config.split('.')[0]));
  }

  getConfigType(filePath) {
    const basename = path.basename(filePath);
    if (basename.includes('package')) return 'npm';
    if (basename.includes('docker')) return 'docker';
    if (basename.includes('webpack')) return 'build';
    if (basename.includes('env')) return 'environment';
    return 'config';
  }

  async smartSearch(query) {
    if (!this.indexingComplete) {
      await this.indexProject();
    }

    const results = {
      functions: [],
      classes: [],
      files: [],
      configs: [],
      relatedCode: [],
      suggestions: []
    };

    // Search functions
    for (const [name, func] of this.functionRegistry) {
      if (name.toLowerCase().includes(query.toLowerCase()) || 
          this.fuzzyMatch(name, query)) {
        results.functions.push(func);
      }
    }

    // Search classes
    for (const [name, cls] of this.classRegistry) {
      if (name.toLowerCase().includes(query.toLowerCase()) || 
          this.fuzzyMatch(name, query)) {
        results.classes.push(cls);
      }
    }

    // Search file contents
    for (const [filePath, context] of this.projectContext) {
      if (context.content.toLowerCase().includes(query.toLowerCase())) {
        results.files.push({
          path: filePath,
          matches: this.extractMatches(context.content, query),
          relevance: this.calculateRelevance(context.content, query)
        });
      }
    }

    // Search configs
    for (const [, config] of this.configRegistry) {
      if (config.content.toLowerCase().includes(query.toLowerCase())) {
        results.configs.push({
          ...config,
          matches: this.extractMatches(config.content, query)
        });
      }
    }

    // Find related code
    results.relatedCode = await this.findRelatedCode(query, results);

    // Generate suggestions
    results.suggestions = this.generateSuggestions(query, results);

    // Sort by relevance
    results.files.sort((a, b) => b.relevance - a.relevance);
    results.functions.sort((a, b) => this.fuzzyMatch(b.name, query) - this.fuzzyMatch(a.name, query));

    return results;
  }

  fuzzyMatch(str, query) {
    const s = str.toLowerCase();
    const q = query.toLowerCase();
    
    if (s === q) return 100;
    if (s.includes(q)) return 80;
    
    // Calculate edit distance
    let distance = 0;
    let i = 0, j = 0;
    
    while (i < s.length && j < q.length) {
      if (s[i] === q[j]) {
        i++; j++;
      } else {
        distance++;
        i++;
      }
    }
    
    distance += Math.abs((s.length - i) + (q.length - j));
    const similarity = Math.max(0, 100 - (distance * 10));
    
    return similarity;
  }

  extractMatches(content, query) {
    const matches = [];
    const lines = content.split('\n');
    const queryLower = query.toLowerCase();
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(queryLower)) {
        matches.push({
          line: index + 1,
          content: line.trim(),
          context: this.getContext(lines, index)
        });
      }
    });
    
    return matches.slice(0, 5); // Limit matches
  }

  getContext(lines, index) {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    return lines.slice(start, end).map((line, i) => ({
      line: start + i + 1,
      content: line.trim(),
      isMatch: start + i === index
    }));
  }

  calculateRelevance(content, query) {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    let score = 0;
    
    // Exact matches get highest score
    const exactMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += exactMatches * 10;
    
    // Function/class name matches
    if (contentLower.includes(`function ${queryLower}`) || 
        contentLower.includes(`class ${queryLower}`)) {
      score += 50;
    }
    
    // Import matches
    if (contentLower.includes(`import`) && contentLower.includes(queryLower)) {
      score += 20;
    }
    
    return score;
  }

  async findRelatedCode(query, searchResults) {
    const related = [];
    
    // Find files that import/export search results
    for (const func of searchResults.functions) {
      const importers = this.findImporters(func.name);
      related.push(...importers);
    }
    
    // Find similar function names
    const similarFunctions = this.findSimilarFunctions(query);
    related.push(...similarFunctions);
    
    return related.slice(0, 10);
  }

  findImporters(functionName) {
    const importers = [];
    
    for (const [filePath, context] of this.projectContext) {
      if (context.content.includes(functionName) && 
          context.content.includes('import')) {
        importers.push({
          file: filePath,
          type: 'importer',
          target: functionName
        });
      }
    }
    
    return importers;
  }

  findSimilarFunctions(query) {
    const similar = [];
    
    for (const [name, func] of this.functionRegistry) {
      const similarity = this.fuzzyMatch(name, query);
      if (similarity > 30 && similarity < 80) { // Similar but not exact
        similar.push({
          ...func,
          similarity,
          type: 'similar_function'
        });
      }
    }
    
    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  generateSuggestions(query, results) {
    const suggestions = [];
    
    // Suggest creating missing functions
    if (results.functions.length === 0) {
      suggestions.push({
        type: 'create',
        action: `Create function '${query}'`,
        description: 'No functions found with this name. Would you like to create one?'
      });
    }
    
    // Suggest file locations for new code
    if (results.files.length > 0) {
      const mostRelevantFile = results.files[0];
      suggestions.push({
        type: 'location',
        action: `Add to ${path.basename(mostRelevantFile.path)}`,
        description: `This file seems most relevant for '${query}'`
      });
    }
    
    // Suggest related patterns
    const patterns = this.detectPatterns(query, results);
    suggestions.push(...patterns);
    
    return suggestions;
  }

  detectPatterns(query, results) {
    const patterns = [];
    
    // Detect common naming patterns
    const functionNames = results.functions.map(f => f.name);
    if (functionNames.length > 0) {
      const commonPrefixes = this.findCommonPrefixes(functionNames);
      if (commonPrefixes.length > 0) {
        patterns.push({
          type: 'pattern',
          action: 'Follow naming convention',
          description: `Consider using prefix: ${commonPrefixes[0]}`
        });
      }
    }
    
    return patterns;
  }

  findCommonPrefixes(names) {
    const prefixes = new Map();
    
    names.forEach(name => {
      const camelCaseParts = name.split(/(?=[A-Z])/);
      if (camelCaseParts.length > 1) {
        const prefix = camelCaseParts[0];
        prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
      }
    });
    
    return Array.from(prefixes.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([prefix, _]) => prefix);
  }

  async getSmartSuggestion(currentCode, cursorPosition) {
    // Analyze current context and provide intelligent suggestions
    const context = this.analyzeCurrentContext(currentCode, cursorPosition);
    
    const prompt = `Based on the current code context, suggest what the developer likely wants to do next:

Current code:
${currentCode}

Cursor position: ${cursorPosition}
Context: ${JSON.stringify(context)}

Available functions: ${Array.from(this.functionRegistry.keys()).slice(0, 20).join(', ')}
Available classes: ${Array.from(this.classRegistry.keys()).slice(0, 20).join(', ')}

Provide 3 specific, actionable suggestions.`;

    const suggestions = await this.agent.aiProvider.query(prompt, {
      taskType: 'codeCompletion',
      maxTokens: 500
    });

    return {
      context,
      suggestions: suggestions.split('\n').filter(s => s.trim()),
      availableSymbols: {
        functions: Array.from(this.functionRegistry.keys()).slice(0, 10),
        classes: Array.from(this.classRegistry.keys()).slice(0, 10)
      }
    };
  }

  analyzeCurrentContext(code, cursorPosition) {
    const beforeCursor = code.substring(0, cursorPosition);
    
    const currentLine = beforeCursor.split('\n').pop();
    const isInFunction = beforeCursor.includes('function') || beforeCursor.includes('=>');
    const isInClass = beforeCursor.includes('class');
    const isInImport = currentLine.trim().startsWith('import');
    
    return {
      currentLine,
      isInFunction,
      isInClass,
      isInImport,
      indentLevel: (currentLine.match(/^\s*/)[0] || '').length,
      nearbySymbols: this.extractNearbySymbols(beforeCursor)
    };
  }

  extractNearbySymbols(code) {
    const symbols = new Set();
    const lines = code.split('\n').slice(-10); // Last 10 lines
    
    lines.forEach(line => {
      const matches = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
      for (const match of matches) {
        if (this.functionRegistry.has(match[1]) || this.classRegistry.has(match[1])) {
          symbols.add(match[1]);
        }
      }
    });
    
    return Array.from(symbols);
  }
}
