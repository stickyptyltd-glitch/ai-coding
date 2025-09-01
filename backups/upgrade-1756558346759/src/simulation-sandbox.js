import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

export class SimulationSandbox {
  constructor(agent) {
    this.agent = agent;
    this.sandboxes = new Map();
    this.simulations = new Map();
    this.snapshots = new Map();
    this.baseSandboxPath = path.join(process.cwd(), '.sandbox');
  }

  async createSandbox(name, sourceFiles = []) {
    console.log(chalk.blue(`📦 Creating simulation sandbox: ${name}`));
    
    const sandboxId = this.generateSandboxId();
    const sandboxPath = path.join(this.baseSandboxPath, sandboxId);
    
    try {
      // Create sandbox directory
      await fs.mkdir(sandboxPath, { recursive: true });
      
      // Copy source files if provided
      const copiedFiles = [];
      for (const file of sourceFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const targetPath = path.join(sandboxPath, path.basename(file));
          await fs.writeFile(targetPath, content);
          copiedFiles.push(targetPath);
        } catch (error) {
          console.log(chalk.yellow(`Warning: Could not copy ${file}: ${error.message}`));
        }
      }
      
      // Copy package.json if it exists
      try {
        const packageJson = await fs.readFile('package.json', 'utf8');
        await fs.writeFile(path.join(sandboxPath, 'package.json'), packageJson);
      } catch {
        // Create minimal package.json
        const minimalPackage = {
          name: `sandbox-${name}`,
          version: '1.0.0',
          private: true,
          scripts: {
            test: 'echo "Sandbox test"',
            start: 'echo "Sandbox start"'
          }
        };
        await fs.writeFile(
          path.join(sandboxPath, 'package.json'), 
          JSON.stringify(minimalPackage, null, 2)
        );
      }
      
      const sandbox = {
        id: sandboxId,
        name,
        path: sandboxPath,
        created: new Date(),
        files: copiedFiles,
        status: 'ready',
        simulations: []
      };
      
      this.sandboxes.set(sandboxId, sandbox);
      
      return {
        success: true,
        sandboxId,
        path: sandboxPath,
        filesCount: copiedFiles.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async simulateCodeChange(sandboxId, changes, options = {}) {
    console.log(chalk.blue(`🧪 Simulating code changes in sandbox ${sandboxId}`));
    
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return { success: false, error: 'Sandbox not found' };
    }

    const simulationId = this.generateSimulationId();
    const simulation = {
      id: simulationId,
      sandboxId,
      changes,
      startTime: new Date(),
      status: 'running',
      results: {}
    };

    this.simulations.set(simulationId, simulation);

    try {
      // Create snapshot before changes
      const beforeSnapshot = await this.createSnapshot(sandbox, 'before');
      
      // Apply changes
      const appliedChanges = await this.applyChanges(sandbox, changes);
      
      // Run analysis
      const analysis = await this.runSimulationAnalysis(sandbox, options);
      
      // Run tests if available
      const testResults = await this.runSimulationTests(sandbox, options);
      
      // Performance analysis
      const performance = await this.analyzePerformance(sandbox, changes);
      
      // Create after snapshot
      const afterSnapshot = await this.createSnapshot(sandbox, 'after');
      
      simulation.results = {
        beforeSnapshot,
        afterSnapshot,
        appliedChanges,
        analysis,
        testResults,
        performance,
        impact: this.calculateImpact(beforeSnapshot, afterSnapshot, testResults)
      };
      
      simulation.status = 'completed';
      simulation.endTime = new Date();
      simulation.duration = simulation.endTime - simulation.startTime;
      
      sandbox.simulations.push(simulationId);
      
      return {
        success: true,
        simulationId,
        results: simulation.results,
        summary: this.generateSimulationSummary(simulation)
      };
      
    } catch (error) {
      simulation.status = 'failed';
      simulation.error = error.message;
      
      return {
        success: false,
        error: error.message,
        simulationId
      };
    }
  }

  async applyChanges(sandbox, changes) {
    const applied = [];
    
    for (const change of changes) {
      try {
        switch (change.type) {
          case 'file_edit':
            await this.applyFileEdit(sandbox, change);
            applied.push({ ...change, status: 'applied' });
            break;
            
          case 'file_create':
            await this.applyFileCreate(sandbox, change);
            applied.push({ ...change, status: 'applied' });
            break;
            
          case 'file_delete':
            await this.applyFileDelete(sandbox, change);
            applied.push({ ...change, status: 'applied' });
            break;
            
          case 'dependency_add':
            await this.applyDependencyAdd(sandbox, change);
            applied.push({ ...change, status: 'applied' });
            break;
            
          default:
            applied.push({ ...change, status: 'skipped', reason: 'Unknown change type' });
        }
      } catch (error) {
        applied.push({ 
          ...change, 
          status: 'failed', 
          error: error.message 
        });
      }
    }
    
    return applied;
  }

  async applyFileEdit(sandbox, change) {
    const filePath = path.join(sandbox.path, change.file);
    
    if (change.content) {
      // Replace entire file content
      await fs.writeFile(filePath, change.content);
    } else if (change.replacements) {
      // Apply specific replacements
      let content = await fs.readFile(filePath, 'utf8');
      
      for (const replacement of change.replacements) {
        content = content.replace(replacement.from, replacement.to);
      }
      
      await fs.writeFile(filePath, content);
    } else if (change.lines) {
      // Replace specific lines
      const lines = (await fs.readFile(filePath, 'utf8')).split('\n');
      
      for (const lineChange of change.lines) {
        if (lineChange.line <= lines.length) {
          lines[lineChange.line - 1] = lineChange.content;
        }
      }
      
      await fs.writeFile(filePath, lines.join('\n'));
    }
  }

  async applyFileCreate(sandbox, change) {
    const filePath = path.join(sandbox.path, change.file);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, change.content || '');
  }

  async applyFileDelete(sandbox, change) {
    const filePath = path.join(sandbox.path, change.file);
    await fs.unlink(filePath);
  }

  async applyDependencyAdd(sandbox, change) {
    const packageJsonPath = path.join(sandbox.path, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    if (!packageJson.dependencies) packageJson.dependencies = {};
    packageJson.dependencies[change.package] = change.version || 'latest';
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  async createSnapshot(sandbox, label) {
    console.log(chalk.cyan(`📸 Creating snapshot: ${label}`));
    
    const snapshot = {
      id: this.generateSnapshotId(),
      label,
      timestamp: new Date(),
      files: [],
      structure: {},
      metrics: {}
    };

    // Capture file contents and structure
    await this.captureFileStructure(sandbox.path, snapshot);
    
    // Capture metrics
    snapshot.metrics = await this.captureMetrics(sandbox);
    
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot.id;
  }

  async captureFileStructure(dirPath, snapshot, relativePath = '') {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          snapshot.structure[relPath] = { type: 'directory' };
          await this.captureFileStructure(fullPath, snapshot, relPath);
        } else {
          const content = await fs.readFile(fullPath, 'utf8').catch(() => '[binary]');
          const stats = await fs.stat(fullPath);
          
          snapshot.files.push({
            path: relPath,
            content,
            size: stats.size,
            modified: stats.mtime
          });
          
          snapshot.structure[relPath] = {
            type: 'file',
            size: stats.size,
            modified: stats.mtime
          };
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`Warning capturing ${dirPath}: ${error.message}`));
    }
  }

  async captureMetrics(sandbox) {
    const metrics = {
      fileCount: 0,
      totalSize: 0,
      codeLines: 0,
      complexity: 0
    };

    try {
      const entries = await fs.readdir(sandbox.path, { withFileTypes: true, recursive: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(sandbox.path, entry.name);
          const stats = await fs.stat(fullPath);
          
          metrics.fileCount++;
          metrics.totalSize += stats.size;
          
          if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            metrics.codeLines += lines.length;
            metrics.complexity += this.calculateComplexity(content);
          }
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`Metrics capture failed: ${error.message}`));
    }

    return metrics;
  }

  calculateComplexity(code) {
    // Simple complexity calculation
    const complexityPatterns = [
      /if\s*\(/g, /for\s*\(/g, /while\s*\(/g, 
      /catch\s*\(/g, /switch\s*\(/g, /case\s+/g
    ];
    
    return complexityPatterns.reduce((complexity, pattern) => {
      const matches = code.match(pattern);
      return complexity + (matches ? matches.length : 0);
    }, 1); // Base complexity
  }

  async runSimulationAnalysis(sandbox, options) {
    console.log(chalk.cyan('🔍 Running simulation analysis...'));
    
    const analysis = {
      staticAnalysis: {},
      linting: {},
      typeChecking: {},
      security: {}
    };

    try {
      // Static analysis
      analysis.staticAnalysis = await this.runStaticAnalysis(sandbox);
      
      // Linting if requested
      if (options.lint !== false) {
        analysis.linting = await this.runLinting(sandbox);
      }
      
      // Type checking if TypeScript
      if (options.typeCheck !== false) {
        analysis.typeChecking = await this.runTypeChecking(sandbox);
      }
      
      // Security analysis if requested
      if (options.security) {
        analysis.security = await this.runSecurityAnalysis(sandbox);
      }
      
    } catch (error) {
      analysis.error = error.message;
    }

    return analysis;
  }

  async runStaticAnalysis(sandbox) {
    // Analyze code structure and patterns
    const jsFiles = await this.findFiles(sandbox.path, ['.js', '.ts']);
    const analysis = {
      fileCount: jsFiles.length,
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0
    };

    for (const file of jsFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      analysis.functions += (content.match(/function\s+\w+|=>\s*{|\w+\s*:/g) || []).length;
      analysis.classes += (content.match(/class\s+\w+/g) || []).length;
      analysis.imports += (content.match(/import\s+.*from/g) || []).length;
      analysis.exports += (content.match(/export\s+/g) || []).length;
    }

    return analysis;
  }

  async runLinting(sandbox) {
    try {
      const { stdout } = await execAsync('npx eslint . --format json', {
        cwd: sandbox.path,
        timeout: 30000
      });
      
      return JSON.parse(stdout);
    } catch (error) {
      return { 
        available: false, 
        reason: 'ESLint not available or failed',
        error: error.message 
      };
    }
  }

  async runTypeChecking(sandbox) {
    try {
      // Check if TypeScript config exists
      await fs.access(path.join(sandbox.path, 'tsconfig.json'));
      
      const { stdout, stderr } = await execAsync('npx tsc --noEmit --pretty false', {
        cwd: sandbox.path,
        timeout: 30000
      });
      
      return {
        success: true,
        output: stdout,
        errors: stderr
      };
    } catch (error) {
      return {
        available: false,
        reason: 'TypeScript not configured or failed',
        error: error.message
      };
    }
  }

  async runSecurityAnalysis(sandbox) {
    // Basic security checks
    const issues = [];
    const jsFiles = await this.findFiles(sandbox.path, ['.js', '.ts']);
    
    for (const file of jsFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for common security issues
      if (content.includes('eval(')) {
        issues.push({ file, type: 'eval_usage', severity: 'high' });
      }
      
      if (content.match(/innerHTML\s*=/)) {
        issues.push({ file, type: 'innerHTML_usage', severity: 'medium' });
      }
      
      if (content.includes('document.write(')) {
        issues.push({ file, type: 'document_write', severity: 'high' });
      }
    }

    return {
      issues,
      score: Math.max(0, 100 - (issues.length * 10))
    };
  }

  async runSimulationTests(sandbox, options) {
    console.log(chalk.cyan('🧪 Running simulation tests...'));
    
    const results = {
      available: false,
      passed: 0,
      failed: 0,
      total: 0,
      coverage: null,
      output: ''
    };

    try {
      // Try to run tests
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: sandbox.path,
        timeout: 60000
      });
      
      results.available = true;
      results.output = stdout + stderr;
      
      // Parse test results (simplified)
      const passMatches = stdout.match(/(\d+)\s+passing/);
      const failMatches = stdout.match(/(\d+)\s+failing/);
      
      if (passMatches) results.passed = parseInt(passMatches[1]);
      if (failMatches) results.failed = parseInt(failMatches[1]);
      results.total = results.passed + results.failed;
      
    } catch (error) {
      results.error = error.message;
      
      // Still try to extract some info from error output
      if (error.stdout) {
        results.output = error.stdout;
        const passMatches = error.stdout.match(/(\d+)\s+passing/);
        const failMatches = error.stdout.match(/(\d+)\s+failing/);
        
        if (passMatches) results.passed = parseInt(passMatches[1]);
        if (failMatches) results.failed = parseInt(failMatches[1]);
        results.total = results.passed + results.failed;
      }
    }

    return results;
  }

  async analyzePerformance(sandbox, changes) {
    console.log(chalk.cyan('⚡ Analyzing performance impact...'));
    
    const analysis = {
      bundleSize: null,
      complexity: 0,
      dependencies: 0,
      estimatedImpact: 'unknown'
    };

    try {
      // Analyze bundle size if build script exists
      const packageJson = JSON.parse(
        await fs.readFile(path.join(sandbox.path, 'package.json'), 'utf8')
      );
      
      if (packageJson.scripts?.build) {
        // Estimate bundle size impact
        analysis.bundleSize = await this.estimateBundleSize(sandbox, changes);
      }
      
      // Count dependencies
      analysis.dependencies = Object.keys(packageJson.dependencies || {}).length;
      
      // Calculate complexity
      const jsFiles = await this.findFiles(sandbox.path, ['.js', '.ts']);
      for (const file of jsFiles) {
        const content = await fs.readFile(file, 'utf8');
        analysis.complexity += this.calculateComplexity(content);
      }
      
      // Estimate overall impact
      analysis.estimatedImpact = this.estimatePerformanceImpact(changes, analysis);
      
    } catch (error) {
      analysis.error = error.message;
    }

    return analysis;
  }

  async estimateBundleSize(sandbox, changes) {
    // Simplified bundle size estimation
    const estimate = {
      before: 0,
      after: 0,
      delta: 0
    };

    try {
      const jsFiles = await this.findFiles(sandbox.path, ['.js', '.ts', '.jsx', '.tsx']);
      
      for (const file of jsFiles) {
        const stats = await fs.stat(file);
        estimate.after += stats.size;
      }
      
      // Estimate before size by removing added files
      estimate.before = estimate.after;
      for (const change of changes) {
        if (change.type === 'file_create') {
          estimate.before -= (change.content?.length || 0);
        }
      }
      
      estimate.delta = estimate.after - estimate.before;
      
    } catch (error) {
      estimate.error = error.message;
    }

    return estimate;
  }

  estimatePerformanceImpact(changes, analysis) {
    let impact = 'minimal';
    
    // Analyze changes for performance impact
    for (const change of changes) {
      if (change.type === 'dependency_add') {
        impact = 'moderate';
      }
      
      if (change.content && change.content.includes('for') && change.content.includes('for')) {
        impact = 'significant'; // Nested loops
      }
      
      if (change.content && (change.content.includes('recursive') || change.content.includes('while'))) {
        impact = 'high';
      }
    }
    
    if (analysis.complexity > 50) {
      impact = impact === 'minimal' ? 'moderate' : 'high';
    }

    return impact;
  }

  calculateImpact(beforeId, afterId, testResults) {
    const before = this.snapshots.get(beforeId);
    const after = this.snapshots.get(afterId);
    
    if (!before || !after) {
      return { error: 'Snapshots not found' };
    }

    const impact = {
      fileChanges: after.files.length - before.files.length,
      sizeChange: after.metrics.totalSize - before.metrics.totalSize,
      complexityChange: after.metrics.complexity - before.metrics.complexity,
      linesChange: after.metrics.codeLines - before.metrics.codeLines,
      testImpact: testResults.available ? {
        passed: testResults.passed,
        failed: testResults.failed,
        success: testResults.failed === 0
      } : null,
      riskLevel: this.calculateRiskLevel(before, after, testResults)
    };

    return impact;
  }

  calculateRiskLevel(before, after, testResults) {
    let risk = 'low';
    
    const complexityIncrease = after.metrics.complexity - before.metrics.complexity;
    const sizeIncrease = after.metrics.totalSize - before.metrics.totalSize;
    
    if (complexityIncrease > 10) risk = 'medium';
    if (complexityIncrease > 25) risk = 'high';
    
    if (sizeIncrease > 10000) risk = 'medium'; // 10KB
    if (sizeIncrease > 100000) risk = 'high'; // 100KB
    
    if (testResults.available && testResults.failed > 0) {
      risk = testResults.failed > 5 ? 'high' : 'medium';
    }

    return risk;
  }

  generateSimulationSummary(simulation) {
    const impact = simulation.results.impact;
    
    return {
      id: simulation.id,
      duration: Math.round(simulation.duration / 1000) + 's',
      status: simulation.status,
      changesApplied: simulation.results.appliedChanges?.filter(c => c.status === 'applied').length || 0,
      impact: {
        files: impact.fileChanges,
        size: `${impact.sizeChange > 0 ? '+' : ''}${Math.round(impact.sizeChange / 1000)}KB`,
        complexity: `${impact.complexityChange > 0 ? '+' : ''}${impact.complexityChange}`,
        risk: impact.riskLevel
      },
      tests: simulation.results.testResults.available ? {
        passed: simulation.results.testResults.passed,
        failed: simulation.results.testResults.failed,
        success: simulation.results.testResults.failed === 0
      } : null,
      recommendation: this.generateRecommendation(impact)
    };
  }

  generateRecommendation(impact) {
    if (impact.riskLevel === 'high') {
      return 'High risk changes detected. Consider breaking into smaller changes or adding more tests.';
    }
    
    if (impact.riskLevel === 'medium') {
      return 'Moderate impact. Review carefully before applying to production.';
    }
    
    if (impact.testImpact && !impact.testImpact.success) {
      return 'Tests are failing. Fix issues before proceeding.';
    }
    
    return 'Changes look safe to apply.';
  }

  async findFiles(dir, extensions, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.findFiles(fullPath, extensions, files);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async cleanupSandbox(sandboxId) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return false;

    try {
      await fs.rm(sandbox.path, { recursive: true });
      this.sandboxes.delete(sandboxId);
      
      // Clean up related simulations
      for (const simId of sandbox.simulations) {
        this.simulations.delete(simId);
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red(`Failed to cleanup sandbox: ${error.message}`));
      return false;
    }
  }

  listSandboxes() {
    return Array.from(this.sandboxes.values()).map(s => ({
      id: s.id,
      name: s.name,
      created: s.created,
      fileCount: s.files.length,
      simulations: s.simulations.length
    }));
  }

  getSimulation(simulationId) {
    return this.simulations.get(simulationId);
  }

  generateSandboxId() {
    return `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSimulationId() {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSnapshotId() {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
