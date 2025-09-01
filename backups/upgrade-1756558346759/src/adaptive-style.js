import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class AdaptiveStyleTransfer {
  constructor(agent) {
    this.agent = agent;
    this.styleProfile = new Map();
    this.patterns = new Map();
    this.preferences = new Map();
    this.codeExamples = new Map();
    this.learningData = {
      naming: new Map(),
      formatting: new Map(),
      architecture: new Map(),
      imports: new Map(),
      comments: new Map(),
      testing: new Map()
    };
  }

  async learnFromCodebase(rootPath = '.') {
    console.log(chalk.blue('🎨 Learning coding style from codebase...'));
    
    const files = await this.getCodeFiles(rootPath);
    const analysisResults = {
      filesAnalyzed: 0,
      patternsLearned: 0,
      confidence: 0
    };

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        await this.analyzeFileStyle(filePath, content);
        analysisResults.filesAnalyzed++;
      } catch (error) {
        console.log(chalk.yellow(`Warning: Could not analyze ${filePath}`));
      }
    }

    // Process and consolidate learned patterns
    this.consolidatePatterns();
    analysisResults.patternsLearned = this.countPatterns();
    analysisResults.confidence = this.calculateConfidence();

    console.log(chalk.green(`✅ Style learning complete: ${analysisResults.filesAnalyzed} files, ${analysisResults.patternsLearned} patterns`));

    return {
      success: true,
      ...analysisResults,
      styleProfile: this.generateStyleSummary()
    };
  }

  async analyzeFileStyle(filePath, content) {
    const ext = path.extname(filePath);
    
    // Learn naming conventions
    this.learnNamingConventions(content, ext);
    
    // Learn formatting style
    this.learnFormattingStyle(content, ext);
    
    // Learn architectural patterns
    this.learnArchitecturalPatterns(filePath, content, ext);
    
    // Learn import/export style
    this.learnImportStyle(content, ext);
    
    // Learn commenting style
    this.learnCommentingStyle(content, ext);
    
    // Learn testing patterns
    this.learnTestingPatterns(filePath, content, ext);
  }

  learnNamingConventions(content, ext) {
    if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return;

    // Function names
    const functionMatches = content.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:\s*(?:async\s+)?(?:function|\())/g);
    for (const match of functionMatches) {
      const name = match[1] || match[2] || match[3];
      if (name) this.recordNamingPattern('function', name);
    }

    // Variable names
    const varMatches = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g);
    for (const match of varMatches) {
      this.recordNamingPattern('variable', match[1]);
    }

    // Class names
    const classMatches = content.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      this.recordNamingPattern('class', match[1]);
    }

    // Component names (React)
    const componentMatches = content.matchAll(/(?:const|export\s+(?:default\s+)?(?:function\s+)?(\w+)\s*=.*?(?:jsx|tsx)|function\s+(\w+).*?return\s*\(.*?<)/gs);
    for (const match of componentMatches) {
      const name = match[1] || match[2];
      if (name && /^[A-Z]/.test(name)) {
        this.recordNamingPattern('component', name);
      }
    }
  }

  recordNamingPattern(type, name) {
    if (!this.learningData.naming.has(type)) {
      this.learningData.naming.set(type, {
        camelCase: 0,
        PascalCase: 0,
        snake_case: 0,
        'kebab-case': 0,
        CONSTANT_CASE: 0,
        examples: []
      });
    }

    const patterns = this.learningData.naming.get(type);
    
    // Detect naming convention
    if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      patterns.camelCase++;
    } else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      patterns.PascalCase++;
    } else if (/^[a-z][a-z0-9_]*$/.test(name)) {
      patterns.snake_case++;
    } else if (/^[a-z][a-z0-9-]*$/.test(name)) {
      patterns['kebab-case']++;
    } else if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
      patterns.CONSTANT_CASE++;
    }

    // Store examples
    if (patterns.examples.length < 10) {
      patterns.examples.push(name);
    }
  }

  learnFormattingStyle(content, ext) {
    if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return;

    const lines = content.split('\n');
    
    // Indentation style
    let tabCount = 0, spaceCount = 0;
    let twoSpaceCount = 0, fourSpaceCount = 0;

    for (const line of lines) {
      if (line.startsWith('\t')) tabCount++;
      else if (line.startsWith('  ')) {
        if (line.startsWith('    ')) fourSpaceCount++;
        else twoSpaceCount++;
        spaceCount++;
      }
    }

    if (!this.learningData.formatting.has('indentation')) {
      this.learningData.formatting.set('indentation', { tabs: 0, spaces: 0, twoSpace: 0, fourSpace: 0 });
    }

    const indentation = this.learningData.formatting.get('indentation');
    indentation.tabs += tabCount;
    indentation.spaces += spaceCount;
    indentation.twoSpace += twoSpaceCount;
    indentation.fourSpace += fourSpaceCount;

    // Semicolon usage
    const semiMatches = content.match(/;(\s*\n|\s*$)/g);
    const noSemiMatches = content.match(/[^\s;](\s*\n|\s*$)/g);
    
    if (!this.learningData.formatting.has('semicolons')) {
      this.learningData.formatting.set('semicolons', { used: 0, omitted: 0 });
    }

    const semicolons = this.learningData.formatting.get('semicolons');
    semicolons.used += semiMatches ? semiMatches.length : 0;
    semicolons.omitted += noSemiMatches ? Math.max(0, noSemiMatches.length - (semiMatches?.length || 0)) : 0;

    // Quote style
    const singleQuotes = (content.match(/'/g) || []).length;
    const doubleQuotes = (content.match(/"/g) || []).length;
    const backticks = (content.match(/`/g) || []).length;

    if (!this.learningData.formatting.has('quotes')) {
      this.learningData.formatting.set('quotes', { single: 0, double: 0, backtick: 0 });
    }

    const quotes = this.learningData.formatting.get('quotes');
    quotes.single += singleQuotes;
    quotes.double += doubleQuotes;
    quotes.backtick += backticks;
  }

  learnArchitecturalPatterns(filePath, content, ext) {
    const dir = path.dirname(filePath);

    // Directory structure patterns
    if (!this.learningData.architecture.has('directories')) {
      this.learningData.architecture.set('directories', new Map());
    }

    const dirs = this.learningData.architecture.get('directories');
    const dirParts = dir.split(path.sep).filter(Boolean);
    for (const part of dirParts) {
      dirs.set(part, (dirs.get(part) || 0) + 1);
    }

    // File naming patterns
    if (!this.learningData.architecture.has('fileNaming')) {
      this.learningData.architecture.set('fileNaming', {
        extensions: new Map(),
        patterns: new Map()
      });
    }

    const fileNaming = this.learningData.architecture.get('fileNaming');
    fileNaming.extensions.set(ext, (fileNaming.extensions.get(ext) || 0) + 1);

    // Component patterns (React)
    if (content.includes('jsx') || content.includes('tsx') || content.includes('React')) {
      if (!this.learningData.architecture.has('react')) {
        this.learningData.architecture.set('react', {
          hooks: new Set(),
          patterns: new Map()
        });
      }

      const react = this.learningData.architecture.get('react');
      
      // Learn hook usage
      const hookMatches = content.matchAll(/use[A-Z]\w+/g);
      for (const match of hookMatches) {
        react.hooks.add(match[0]);
      }

      // Learn component patterns
      if (content.includes('useState')) react.patterns.set('useState', (react.patterns.get('useState') || 0) + 1);
      if (content.includes('useEffect')) react.patterns.set('useEffect', (react.patterns.get('useEffect') || 0) + 1);
      if (content.includes('useContext')) react.patterns.set('useContext', (react.patterns.get('useContext') || 0) + 1);
    }

    // Express/API patterns
    if (content.includes('express') || content.includes('app.') || content.includes('router.')) {
      if (!this.learningData.architecture.has('api')) {
        this.learningData.architecture.set('api', new Map());
      }

      const api = this.learningData.architecture.get('api');
      if (content.includes('app.get')) api.set('restful', (api.get('restful') || 0) + 1);
      if (content.includes('middleware')) api.set('middleware', (api.get('middleware') || 0) + 1);
      if (content.includes('async')) api.set('async', (api.get('async') || 0) + 1);
    }
  }

  learnImportStyle(content, ext) {
    if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return;

    if (!this.learningData.imports.has('style')) {
      this.learningData.imports.set('style', {
        named: 0,
        default: 0,
        namespace: 0,
        destructured: 0,
        relative: 0,
        absolute: 0
      });
    }

    const imports = this.learningData.imports.get('style');

    // Import patterns
    const importMatches = content.matchAll(/import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const importPart = match[1];
      const path = match[2];

      if (importPart.includes('{')) imports.destructured++;
      if (importPart.includes('*')) imports.namespace++;
      if (!importPart.includes('{') && !importPart.includes('*')) imports.default++;
      if (path.startsWith('./') || path.startsWith('../')) imports.relative++;
      else imports.absolute++;
    }
  }

  learnCommentingStyle(content, ext) {
    const lines = content.split('\n');
    
    if (!this.learningData.comments.has('style')) {
      this.learningData.comments.set('style', {
        singleLine: 0,
        multiLine: 0,
        jsdoc: 0,
        inline: 0,
        ratio: 0
      });
    }

    const comments = this.learningData.comments.get('style');
    let commentLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) {
        comments.singleLine++;
        commentLines++;
      } else if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.includes('*/')) {
        comments.multiLine++;
        commentLines++;
      } else if (trimmed.startsWith('/**')) {
        comments.jsdoc++;
        commentLines++;
      } else if (trimmed.includes('//')) {
        comments.inline++;
      }
    }

    comments.ratio = commentLines / lines.length;
  }

  learnTestingPatterns(filePath, content, ext) {
    if (!filePath.includes('test') && !filePath.includes('spec')) return;

    if (!this.learningData.testing.has('patterns')) {
      this.learningData.testing.set('patterns', {
        jest: 0,
        mocha: 0,
        describe: 0,
        test: 0,
        it: 0,
        beforeEach: 0,
        afterEach: 0
      });
    }

    const testing = this.learningData.testing.get('patterns');

    if (content.includes('describe(')) testing.describe++;
    if (content.includes('test(')) testing.test++;
    if (content.includes('it(')) testing.it++;
    if (content.includes('beforeEach')) testing.beforeEach++;
    if (content.includes('afterEach')) testing.afterEach++;
    if (content.includes('jest')) testing.jest++;
    if (content.includes('mocha')) testing.mocha++;
  }

  consolidatePatterns() {
    // Determine preferred naming conventions
    for (const [type, patterns] of this.learningData.naming) {
      const preferred = this.getPreferredPattern(patterns);
      this.preferences.set(`naming_${type}`, preferred);
    }

    // Determine formatting preferences
    const indentation = this.learningData.formatting.get('indentation');
    if (indentation) {
      let indentStyle = 'spaces';
      if (indentation.tabs > indentation.spaces) indentStyle = 'tabs';
      
      let indentSize = 2;
      if (indentation.fourSpace > indentation.twoSpace) indentSize = 4;
      
      this.preferences.set('formatting_indent', { style: indentStyle, size: indentSize });
    }

    const semicolons = this.learningData.formatting.get('semicolons');
    if (semicolons) {
      const useSemicolons = semicolons.used > semicolons.omitted;
      this.preferences.set('formatting_semicolons', useSemicolons);
    }

    const quotes = this.learningData.formatting.get('quotes');
    if (quotes) {
      let quoteStyle = 'single';
      if (quotes.double > quotes.single) quoteStyle = 'double';
      if (quotes.backtick > Math.max(quotes.single, quotes.double)) quoteStyle = 'backtick';
      this.preferences.set('formatting_quotes', quoteStyle);
    }
  }

  getPreferredPattern(patterns) {
    const entries = Object.entries(patterns)
      .filter(([key, value]) => key !== 'examples' && typeof value === 'number')
      .sort((a, b) => b[1] - a[1]);
    
    return entries[0] ? entries[0][0] : 'camelCase';
  }

  async applyStyleToCode(code, fileType = 'js') {
    console.log(chalk.cyan('🎨 Applying learned style to code...'));

    let styledCode = code;

    // Apply naming conventions
    styledCode = this.applyNamingStyle(styledCode, fileType);
    
    // Apply formatting style
    styledCode = this.applyFormattingStyle(styledCode, fileType);
    
    // Apply architectural patterns
    styledCode = this.applyArchitecturalStyle(styledCode, fileType);

    return styledCode;
  }

  applyNamingStyle(code, fileType) {
    let styled = code;

    // Apply function naming
    const functionNaming = this.preferences.get('naming_function');
    if (functionNaming) {
      styled = this.convertNaming(styled, /function\s+(\w+)/g, functionNaming);
      styled = this.convertNaming(styled, /const\s+(\w+)\s*=/g, functionNaming);
    }

    // Apply variable naming
    const variableNaming = this.preferences.get('naming_variable');
    if (variableNaming) {
      styled = this.convertNaming(styled, /(?:const|let|var)\s+(\w+)/g, variableNaming);
    }

    return styled;
  }

  convertNaming(code, regex, targetStyle) {
    return code.replace(regex, (match, name) => {
      const converted = this.convertToNamingStyle(name, targetStyle);
      return match.replace(name, converted);
    });
  }

  convertToNamingStyle(name, style) {
    switch (style) {
      case 'camelCase':
        return this.toCamelCase(name);
      case 'PascalCase':
        return this.toPascalCase(name);
      case 'snake_case':
        return this.toSnakeCase(name);
      case 'kebab-case':
        return this.toKebabCase(name);
      case 'CONSTANT_CASE':
        return this.toConstantCase(name);
      default:
        return name;
    }
  }

  toCamelCase(str) {
    return str.replace(/[_-]([a-z])/g, (_, letter) => letter.toUpperCase())
              .replace(/^[A-Z]/, letter => letter.toLowerCase());
  }

  toPascalCase(str) {
    return this.toCamelCase(str).replace(/^[a-z]/, letter => letter.toUpperCase());
  }

  toSnakeCase(str) {
    return str.replace(/([A-Z])/g, '_$1')
              .replace(/^_/, '')
              .toLowerCase()
              .replace(/[-\s]/g, '_');
  }

  toKebabCase(str) {
    return this.toSnakeCase(str).replace(/_/g, '-');
  }

  toConstantCase(str) {
    return this.toSnakeCase(str).toUpperCase();
  }

  applyFormattingStyle(code, fileType) {
    let styled = code;

    // Apply indentation
    const indent = this.preferences.get('formatting_indent');
    if (indent) {
      const indentString = indent.style === 'tabs' ? '\t' : ' '.repeat(indent.size);
      styled = this.normalizeIndentation(styled, indentString);
    }

    // Apply semicolon style
    const useSemicolons = this.preferences.get('formatting_semicolons');
    if (useSemicolons !== undefined) {
      if (useSemicolons) {
        styled = this.addSemicolons(styled);
      } else {
        styled = this.removeSemicolons(styled);
      }
    }

    // Apply quote style
    const quoteStyle = this.preferences.get('formatting_quotes');
    if (quoteStyle) {
      styled = this.normalizeQuotes(styled, quoteStyle);
    }

    return styled;
  }

  normalizeIndentation(code, indentString) {
    return code.replace(/^[ \t]+/gm, match => {
      const level = Math.floor(match.length / (match.includes('\t') ? 1 : 2));
      return indentString.repeat(level);
    });
  }

  addSemicolons(code) {
    return code.replace(/([^;\s])\s*$/gm, '$1;');
  }

  removeSemicolons(code) {
    return code.replace(/;(\s*$)/gm, '$1');
  }

  normalizeQuotes(code, style) {
    const quoteMap = {
      single: "'",
      double: '"',
      backtick: '`'
    };

    const targetQuote = quoteMap[style];
    if (!targetQuote) return code;

    // Simple quote normalization (would need more sophisticated handling for template literals)
    return code.replace(/(['"])((?:(?!\1)[^\\]|\\.)*)(\1)/g, 
      (match, quote, content, endQuote) => {
        if (!content.includes('${')) { // Don't change template literals
          return `${targetQuote}${content}${targetQuote}`;
        }
        return match;
      });
  }

  applyArchitecturalStyle(code, fileType) {
    // Apply import style preferences
    const importStyle = this.preferences.get('import_style');
    if (importStyle) {
      // Apply preferred import patterns
    }

    return code;
  }

  generateStyleGuide() {
    const guide = {
      naming: {},
      formatting: {},
      architecture: {},
      patterns: {},
      confidence: this.calculateConfidence()
    };

    // Generate naming guide
    for (const [key, value] of this.preferences) {
      if (key.startsWith('naming_')) {
        const type = key.replace('naming_', '');
        guide.naming[type] = value;
      } else if (key.startsWith('formatting_')) {
        const type = key.replace('formatting_', '');
        guide.formatting[type] = value;
      }
    }

    // Generate architectural patterns
    const react = this.learningData.architecture.get('react');
    if (react) {
      guide.patterns.react = {
        hooks: Array.from(react.hooks),
        commonPatterns: Array.from(react.patterns.entries()).slice(0, 5)
      };
    }

    return guide;
  }

  async getCodeFiles(rootPath) {
    const files = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx'];
    
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

  countPatterns() {
    let count = 0;
    for (const data of this.learningData.naming.values()) {
      count += Object.values(data).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
    }
    return count;
  }

  calculateConfidence() {
    const totalFiles = this.countPatterns();
    if (totalFiles < 5) return 'low';
    if (totalFiles < 20) return 'medium';
    return 'high';
  }

  generateStyleSummary() {
    return {
      naming: Object.fromEntries(
        Array.from(this.preferences.entries())
          .filter(([key]) => key.startsWith('naming_'))
          .map(([key, value]) => [key.replace('naming_', ''), value])
      ),
      formatting: Object.fromEntries(
        Array.from(this.preferences.entries())
          .filter(([key]) => key.startsWith('formatting_'))
          .map(([key, value]) => [key.replace('formatting_', ''), value])
      ),
      confidence: this.calculateConfidence()
    };
  }

  async saveStyleProfile(filePath) {
    const profile = {
      preferences: Object.fromEntries(this.preferences),
      learningData: this.serializeLearningData(),
      generated: new Date().toISOString()
    };

    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));
    return { success: true, saved: filePath };
  }

  async loadStyleProfile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const profile = JSON.parse(content);
      
      this.preferences = new Map(Object.entries(profile.preferences));
      this.deserializeLearningData(profile.learningData);
      
      return { success: true, loaded: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  serializeLearningData() {
    const serialized = {};
    for (const [key, value] of this.learningData) {
      if (value instanceof Map) {
        serialized[key] = Object.fromEntries(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  deserializeLearningData(data) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        this.learningData[key] = new Map(Object.entries(value));
      } else {
        this.learningData[key] = value;
      }
    }
  }
}
