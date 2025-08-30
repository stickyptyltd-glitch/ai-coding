#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Comprehensive Error Checking Script
class ComprehensiveErrorChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
    this.checkedFiles = 0;
    this.totalFiles = 0;
    
    this.config = {
      excludePatterns: [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        '.nyc_output',
        'logs',
        'temp',
        'tmp'
      ],
      fileExtensions: ['.js', '.mjs', '.json', '.md'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      enableSyntaxCheck: true,
      enableImportCheck: true,
      enableConfigCheck: true,
      enableSecurityCheck: true,
      enablePerformanceCheck: true
    };
  }

  async run() {
    try {
      console.log(chalk.blue.bold('🔍 Starting Comprehensive Error Check...'));
      console.log(chalk.gray(`Checking directory: ${rootDir}`));
      
      const startTime = Date.now();
      
      // Phase 1: File System Analysis
      await this.analyzeFileSystem();
      
      // Phase 2: Syntax and Import Validation
      await this.validateSyntaxAndImports();
      
      // Phase 3: Configuration Validation
      await this.validateConfigurations();
      
      // Phase 4: Security Analysis
      await this.performSecurityAnalysis();
      
      // Phase 5: Performance Analysis
      await this.performPerformanceAnalysis();
      
      // Phase 6: Dependency Analysis
      await this.analyzeDependencies();
      
      // Phase 7: Code Quality Analysis
      await this.analyzeCodeQuality();
      
      const duration = Date.now() - startTime;
      
      // Generate comprehensive report
      await this.generateReport(duration);
      
      // Display summary
      this.displaySummary(duration);
      
      // Exit with appropriate code
      const hasErrors = this.errors.length > 0;
      process.exit(hasErrors ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Error checker failed:'), error);
      process.exit(1);
    }
  }

  async analyzeFileSystem() {
    console.log(chalk.blue('\n📁 Phase 1: File System Analysis'));
    
    try {
      const files = await this.getAllFiles(rootDir);
      this.totalFiles = files.length;
      
      console.log(chalk.cyan(`Found ${files.length} files to analyze`));
      
      // Check for common issues
      await this.checkFilePermissions(files);
      await this.checkFileNaming(files);
      await this.checkDirectoryStructure();
      
    } catch (error) {
      this.addError('filesystem', 'File system analysis failed', error.message);
    }
  }

  async validateSyntaxAndImports() {
    console.log(chalk.blue('\n🔧 Phase 2: Syntax and Import Validation'));
    
    if (!this.config.enableSyntaxCheck) {
      console.log(chalk.gray('Syntax checking disabled'));
      return;
    }
    
    try {
      const jsFiles = await this.getJavaScriptFiles();
      
      for (const file of jsFiles) {
        await this.validateJavaScriptFile(file);
        this.checkedFiles++;
        
        if (this.checkedFiles % 10 === 0) {
          console.log(chalk.gray(`Checked ${this.checkedFiles}/${jsFiles.length} files`));
        }
      }
      
    } catch (error) {
      this.addError('syntax', 'Syntax validation failed', error.message);
    }
  }

  async validateConfigurations() {
    console.log(chalk.blue('\n⚙️ Phase 3: Configuration Validation'));
    
    if (!this.config.enableConfigCheck) {
      console.log(chalk.gray('Configuration checking disabled'));
      return;
    }
    
    try {
      // Check package.json
      await this.validatePackageJson();
      
      // Check environment files
      await this.validateEnvironmentFiles();
      
      // Check configuration files
      await this.validateConfigFiles();
      
      // Check Docker files
      await this.validateDockerFiles();
      
    } catch (error) {
      this.addError('config', 'Configuration validation failed', error.message);
    }
  }

  async performSecurityAnalysis() {
    console.log(chalk.blue('\n🔒 Phase 4: Security Analysis'));
    
    if (!this.config.enableSecurityCheck) {
      console.log(chalk.gray('Security checking disabled'));
      return;
    }
    
    try {
      // Check for hardcoded secrets
      await this.checkForHardcodedSecrets();
      
      // Check for vulnerable dependencies
      await this.checkVulnerableDependencies();
      
      // Check file permissions
      await this.checkSecurityPermissions();
      
      // Check for security best practices
      await this.checkSecurityBestPractices();
      
    } catch (error) {
      this.addError('security', 'Security analysis failed', error.message);
    }
  }

  async performPerformanceAnalysis() {
    console.log(chalk.blue('\n⚡ Phase 5: Performance Analysis'));
    
    if (!this.config.enablePerformanceCheck) {
      console.log(chalk.gray('Performance checking disabled'));
      return;
    }
    
    try {
      // Check for large files
      await this.checkLargeFiles();
      
      // Check for performance anti-patterns
      await this.checkPerformanceAntiPatterns();
      
      // Check for unused code
      await this.checkUnusedCode();
      
    } catch (error) {
      this.addError('performance', 'Performance analysis failed', error.message);
    }
  }

  async analyzeDependencies() {
    console.log(chalk.blue('\n📦 Phase 6: Dependency Analysis'));
    
    try {
      // Check for missing dependencies
      await this.checkMissingDependencies();
      
      // Check for unused dependencies
      await this.checkUnusedDependencies();
      
      // Check for outdated dependencies
      await this.checkOutdatedDependencies();
      
      // Check for circular dependencies
      await this.checkCircularDependencies();
      
    } catch (error) {
      this.addError('dependencies', 'Dependency analysis failed', error.message);
    }
  }

  async analyzeCodeQuality() {
    console.log(chalk.blue('\n📊 Phase 7: Code Quality Analysis'));
    
    try {
      // Check code complexity
      await this.checkCodeComplexity();
      
      // Check for code duplication
      await this.checkCodeDuplication();
      
      // Check for best practices
      await this.checkBestPractices();
      
      // Check documentation
      await this.checkDocumentation();
      
    } catch (error) {
      this.addError('quality', 'Code quality analysis failed', error.message);
    }
  }

  async getAllFiles(dir) {
    const files = [];
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip excluded patterns
      if (this.config.excludePatterns.some(pattern => entry.name.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.config.fileExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  async getJavaScriptFiles() {
    const allFiles = await this.getAllFiles(rootDir);
    return allFiles.filter(file => 
      file.endsWith('.js') || file.endsWith('.mjs')
    );
  }

  async validateJavaScriptFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Basic syntax validation - skip for ES6 modules and use safer approach
      if (!content.includes('import ') && !content.includes('export ')) {
        try {
          // Use a safer approach than eval - check for basic syntax patterns
          this.performBasicSyntaxCheck(content, filePath);
        } catch (syntaxError) {
          // Only report if it's not an ES6 module syntax issue
          if (!syntaxError.message.includes('Unexpected token')) {
            this.addError('syntax', `Syntax error in ${filePath}`, syntaxError.message);
            return;
          }
        }
      }
      
      // Check imports
      if (this.config.enableImportCheck) {
        await this.validateImports(filePath, content);
      }
      
      // Check for common issues
      this.checkCommonIssues(filePath, content);
      
    } catch (error) {
      this.addError('file', `Failed to validate ${filePath}`, error.message);
    }
  }

  async validateImports(filePath, content) {
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    
    let match;
    
    // Check ES6 imports
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      await this.validateImportPath(filePath, importPath);
    }
    
    // Check CommonJS requires
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      await this.validateImportPath(filePath, requirePath);
    }
  }

  async validateImportPath(filePath, importPath) {
    // Skip built-in modules
    if (this.isBuiltinModule(importPath)) {
      return;
    }
    
    // Skip node_modules (they should be in package.json)
    if (!importPath.startsWith('.')) {
      return;
    }
    
    // Resolve relative path
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    
    // Check if file exists
    const possibleExtensions = ['', '.js', '.mjs', '.json'];
    let exists = false;
    
    for (const ext of possibleExtensions) {
      try {
        await fs.access(resolvedPath + ext);
        exists = true;
        break;
      } catch {
        // Continue checking
      }
    }
    
    if (!exists) {
      this.addError('import', `Missing import in ${filePath}`, `Cannot resolve: ${importPath}`);
    }
  }

  performBasicSyntaxCheck(content, filePath) {
    // Basic syntax checks without using eval
    const lines = content.split('\n');
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (line.startsWith('//') || line.startsWith('/*') || line === '') {
        continue;
      }

      // Count brackets
      for (const char of line) {
        switch (char) {
          case '{': braceCount++; break;
          case '}': braceCount--; break;
          case '(': parenCount++; break;
          case ')': parenCount--; break;
          case '[': bracketCount++; break;
          case ']': bracketCount--; break;
        }
      }

      // Check for negative counts (closing before opening)
      if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
        throw new Error(`Mismatched brackets at line ${i + 1}`);
      }
    }

    // Check final counts
    if (braceCount !== 0) {
      throw new Error(`Mismatched braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'} braces`);
    }
    if (parenCount !== 0) {
      throw new Error(`Mismatched parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'} parentheses`);
    }
    if (bracketCount !== 0) {
      throw new Error(`Mismatched brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'} brackets`);
    }
  }

  checkCommonIssues(filePath, content) {
    // Check for console.log in production files
    if (content.includes('console.log') && !filePath.includes('test') && !filePath.includes('script')) {
      this.addWarning('quality', `Console.log found in ${filePath}`, 'Remove debug statements');
    }

    // Check for TODO comments
    if (content.includes('TODO') || content.includes('FIXME')) {
      this.addWarning('quality', `TODO/FIXME found in ${filePath}`, 'Address pending items');
    }

    // Check for long lines
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 120) {
        this.addWarning('style', `Long line in ${filePath}:${index + 1}`, 'Consider breaking long lines');
      }
    });
  }

  async validatePackageJson() {
    try {
      const packagePath = path.join(rootDir, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const pkg = JSON.parse(content);
      
      // Check required fields
      const required = ['name', 'version', 'description'];
      for (const field of required) {
        if (!pkg[field]) {
          this.addError('config', 'package.json missing field', `Missing: ${field}`);
        }
      }
      
      // Check scripts
      if (!pkg.scripts || !pkg.scripts.start) {
        this.addWarning('config', 'package.json missing start script', 'Add start script');
      }
      
      // Check engines
      if (!pkg.engines || !pkg.engines.node) {
        this.addWarning('config', 'package.json missing node engine', 'Specify Node.js version');
      }
      
    } catch (error) {
      this.addError('config', 'package.json validation failed', error.message);
    }
  }

  async validateEnvironmentFiles() {
    const envFiles = ['.env.example', '.env'];
    
    for (const envFile of envFiles) {
      try {
        const envPath = path.join(rootDir, envFile);
        await fs.access(envPath);
        
        const content = await fs.readFile(envPath, 'utf8');
        
        // Check for common environment variables
        const commonVars = ['NODE_ENV', 'PORT'];
        for (const varName of commonVars) {
          if (!content.includes(varName)) {
            this.addWarning('config', `${envFile} missing variable`, `Consider adding: ${varName}`);
          }
        }
        
      } catch (error) {
        if (envFile === '.env.example') {
          this.addWarning('config', 'Missing .env.example', 'Create example environment file');
        }
      }
    }
  }

  async validateConfigFiles() {
    const configFiles = [
      'config/default.json',
      'config/production.json',
      'config/development.json'
    ];
    
    for (const configFile of configFiles) {
      try {
        const configPath = path.join(rootDir, configFile);
        await fs.access(configPath);
        
        const content = await fs.readFile(configPath, 'utf8');
        JSON.parse(content); // Validate JSON
        
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.addError('config', `Invalid config file: ${configFile}`, error.message);
        }
      }
    }
  }

  async validateDockerFiles() {
    const dockerFiles = ['Dockerfile', 'docker-compose.yml', '.dockerignore'];
    
    for (const dockerFile of dockerFiles) {
      try {
        const dockerPath = path.join(rootDir, dockerFile);
        await fs.access(dockerPath);
        
        const content = await fs.readFile(dockerPath, 'utf8');
        
        if (dockerFile === 'Dockerfile') {
          if (!content.includes('FROM')) {
            this.addError('config', 'Invalid Dockerfile', 'Missing FROM instruction');
          }
        }
        
      } catch (error) {
        // Docker files are optional
      }
    }
  }

  async checkForHardcodedSecrets() {
    const jsFiles = await this.getJavaScriptFiles();
    const secretPatterns = [
      /password\s*[:=]\s*['"`][^'"`]+['"`]/i,
      /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/i,
      /secret\s*[:=]\s*['"`][^'"`]+['"`]/i,
      /token\s*[:=]\s*['"`][^'"`]+['"`]/i
    ];
    
    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            this.addError('security', `Potential hardcoded secret in ${file}`, 'Use environment variables');
          }
        }
        
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  async checkVulnerableDependencies() {
    try {
      const packagePath = path.join(rootDir, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const pkg = JSON.parse(content);
      
      // This is a simplified check - in production, use npm audit or similar
      const knownVulnerable = ['lodash@4.17.20', 'moment@2.29.1'];
      
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      for (const [name, version] of Object.entries(allDeps || {})) {
        const depString = `${name}@${version}`;
        if (knownVulnerable.includes(depString)) {
          this.addError('security', 'Vulnerable dependency', `Update: ${depString}`);
        }
      }
      
    } catch (error) {
      this.addError('security', 'Dependency vulnerability check failed', error.message);
    }
  }

  async checkSecurityPermissions() {
    // Check file permissions (Unix-like systems)
    if (process.platform !== 'win32') {
      try {
        const sensitiveFiles = ['package.json', '.env'];
        
        for (const file of sensitiveFiles) {
          try {
            const filePath = path.join(rootDir, file);
            const stats = await fs.stat(filePath);
            const mode = stats.mode & parseInt('777', 8);
            
            if (mode & parseInt('077', 8)) {
              this.addWarning('security', `Insecure permissions on ${file}`, 'Restrict file permissions');
            }
          } catch (error) {
            // File doesn't exist
          }
        }
        
      } catch (error) {
        // Permission check failed
      }
    }
  }

  async checkSecurityBestPractices() {
    const jsFiles = await this.getJavaScriptFiles();
    
    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for eval usage
        if (content.includes('eval(')) {
          this.addError('security', `eval() usage in ${file}`, 'Avoid eval() for security');
        }
        
        // Check for innerHTML usage
        if (content.includes('innerHTML')) {
          this.addWarning('security', `innerHTML usage in ${file}`, 'Consider safer alternatives');
        }
        
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  async checkLargeFiles() {
    const allFiles = await this.getAllFiles(rootDir);
    
    for (const file of allFiles) {
      try {
        const stats = await fs.stat(file);
        
        if (stats.size > this.config.maxFileSize) {
          this.addWarning('performance', `Large file: ${file}`, `Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        }
        
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
  }

  async checkPerformanceAntiPatterns() {
    const jsFiles = await this.getJavaScriptFiles();
    
    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for synchronous file operations
        if (content.includes('readFileSync') || content.includes('writeFileSync')) {
          this.addWarning('performance', `Sync file operations in ${file}`, 'Use async alternatives');
        }
        
        // Check for blocking operations
        if (content.includes('while(true)') || content.includes('for(;;)')) {
          this.addWarning('performance', `Potential blocking loop in ${file}`, 'Review loop conditions');
        }
        
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  async checkUnusedCode() {
    // This is a simplified check - in production, use proper dead code detection
    const jsFiles = await this.getJavaScriptFiles();
    
    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        // Check for commented code blocks
        let commentedCodeLines = 0;
        for (const line of lines) {
          if (line.trim().startsWith('//') && line.includes('function') || line.includes('const') || line.includes('let')) {
            commentedCodeLines++;
          }
        }
        
        if (commentedCodeLines > 5) {
          this.addWarning('quality', `Commented code in ${file}`, 'Remove unused commented code');
        }
        
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  async checkMissingDependencies() {
    // This would require more sophisticated analysis
    this.addSuggestion('dependencies', 'Dependency analysis', 'Run npm audit for detailed dependency analysis');
  }

  async checkUnusedDependencies() {
    // This would require import analysis
    this.addSuggestion('dependencies', 'Unused dependencies', 'Use tools like depcheck to find unused dependencies');
  }

  async checkOutdatedDependencies() {
    // This would require npm registry checks
    this.addSuggestion('dependencies', 'Outdated dependencies', 'Run npm outdated to check for updates');
  }

  async checkCircularDependencies() {
    // This would require dependency graph analysis
    this.addSuggestion('dependencies', 'Circular dependencies', 'Use tools like madge to detect circular dependencies');
  }

  async checkCodeComplexity() {
    // This would require AST analysis
    this.addSuggestion('quality', 'Code complexity', 'Use tools like complexity-report for detailed analysis');
  }

  async checkCodeDuplication() {
    // This would require code similarity analysis
    this.addSuggestion('quality', 'Code duplication', 'Use tools like jscpd to detect code duplication');
  }

  async checkBestPractices() {
    // This would require comprehensive linting
    this.addSuggestion('quality', 'Best practices', 'Use ESLint with recommended rules');
  }

  async checkDocumentation() {
    try {
      const readmePath = path.join(rootDir, 'README.md');
      await fs.access(readmePath);
      
      const content = await fs.readFile(readmePath, 'utf8');
      
      if (content.length < 100) {
        this.addWarning('documentation', 'README.md too short', 'Provide comprehensive documentation');
      }
      
    } catch (error) {
      this.addError('documentation', 'Missing README.md', 'Create project documentation');
    }
  }

  async checkFilePermissions(files) {
    // Check for executable files that shouldn't be
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        
        if (process.platform !== 'win32') {
          const mode = stats.mode & parseInt('777', 8);
          
          if (path.extname(file) === '.js' && (mode & parseInt('111', 8))) {
            this.addWarning('filesystem', `Executable JS file: ${file}`, 'Remove execute permissions');
          }
        }
        
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
  }

  async checkFileNaming(files) {
    for (const file of files) {
      const basename = path.basename(file);
      
      // Check for spaces in filenames
      if (basename.includes(' ')) {
        this.addWarning('filesystem', `Filename with spaces: ${file}`, 'Use hyphens or underscores');
      }
      
      // Check for uppercase in JS files
      if (file.endsWith('.js') && /[A-Z]/.test(basename) && !basename.includes('README')) {
        this.addWarning('filesystem', `Uppercase in filename: ${file}`, 'Use lowercase with hyphens');
      }
    }
  }

  async checkDirectoryStructure() {
    const expectedDirs = ['src', 'test', 'docs'];
    
    for (const dir of expectedDirs) {
      try {
        const dirPath = path.join(rootDir, dir);
        await fs.access(dirPath);
      } catch (error) {
        if (dir === 'test') {
          this.addWarning('structure', `Missing ${dir} directory`, 'Create test directory');
        }
      }
    }
  }

  isBuiltinModule(moduleName) {
    const builtins = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util',
      'events', 'stream', 'buffer', 'child_process', 'cluster',
      'dns', 'net', 'tls', 'zlib', 'readline', 'repl'
    ];
    
    return builtins.includes(moduleName);
  }

  addError(category, title, message) {
    this.errors.push({ category, title, message, type: 'error' });
  }

  addWarning(category, title, message) {
    this.warnings.push({ category, title, message, type: 'warning' });
  }

  addSuggestion(category, title, message) {
    this.suggestions.push({ category, title, message, type: 'suggestion' });
  }

  async generateReport(duration) {
    const report = {
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        totalFiles: this.totalFiles,
        checkedFiles: this.checkedFiles,
        errors: this.errors.length,
        warnings: this.warnings.length,
        suggestions: this.suggestions.length
      },
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions
    };
    
    try {
      const reportPath = path.join(rootDir, 'error-check-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(chalk.blue(`\n📄 Report saved: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Failed to save report:'), error);
    }
  }

  displaySummary(duration) {
    console.log(chalk.blue.bold('\n📊 Error Check Summary'));
    console.log(chalk.gray(`Duration: ${duration}ms`));
    console.log(chalk.gray(`Files checked: ${this.checkedFiles}/${this.totalFiles}`));
    
    if (this.errors.length > 0) {
      console.log(chalk.red.bold(`\n❌ Errors: ${this.errors.length}`));
      this.errors.slice(0, 10).forEach(error => {
        console.log(chalk.red(`  • [${error.category}] ${error.title}: ${error.message}`));
      });
      if (this.errors.length > 10) {
        console.log(chalk.red(`  ... and ${this.errors.length - 10} more errors`));
      }
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow.bold(`\n⚠️ Warnings: ${this.warnings.length}`));
      this.warnings.slice(0, 10).forEach(warning => {
        console.log(chalk.yellow(`  • [${warning.category}] ${warning.title}: ${warning.message}`));
      });
      if (this.warnings.length > 10) {
        console.log(chalk.yellow(`  ... and ${this.warnings.length - 10} more warnings`));
      }
    }
    
    if (this.suggestions.length > 0) {
      console.log(chalk.cyan.bold(`\n💡 Suggestions: ${this.suggestions.length}`));
      this.suggestions.slice(0, 5).forEach(suggestion => {
        console.log(chalk.cyan(`  • [${suggestion.category}] ${suggestion.title}: ${suggestion.message}`));
      });
      if (this.suggestions.length > 5) {
        console.log(chalk.cyan(`  ... and ${this.suggestions.length - 5} more suggestions`));
      }
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green.bold('\n✅ No critical issues found!'));
    }
    
    console.log(chalk.blue('\n🔍 Error check completed'));
  }
}

// Run the error checker
const checker = new ComprehensiveErrorChecker();
checker.run().catch(error => {
  console.error(chalk.red.bold('Fatal error:'), error);
  process.exit(1);
});
