#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import os from 'os';

// Comprehensive Performance Benchmarking System
class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.metrics = {
      memory: [],
      cpu: [],
      io: [],
      network: []
    };
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.blue('⚡ Starting Performance Benchmark Suite...'));
    
    try {
      // System Information
      await this.collectSystemInfo();
      
      // Core Performance Tests
      await this.runCorePerformanceTests();
      
      // AI Processing Tests
      await this.runAIProcessingTests();
      
      // Memory Tests
      await this.runMemoryTests();
      
      // I/O Performance Tests
      await this.runIOTests();
      
      // Concurrency Tests
      await this.runConcurrencyTests();
      
      // Generate Report
      await this.generateBenchmarkReport();
      
      console.log(chalk.green('✅ Performance benchmark completed!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Benchmark failed:'), error);
      throw error;
    }
  }

  async collectSystemInfo() {
    console.log(chalk.cyan('📊 Collecting system information...'));
    
    const systemInfo = {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      uptime: Math.round(os.uptime() / 3600) + 'h'
    };
    
    this.systemInfo = systemInfo;
    console.log(chalk.gray('  System Info:'), systemInfo);
  }

  async runCorePerformanceTests() {
    console.log(chalk.cyan('🔧 Running core performance tests...'));
    
    // String processing test
    const stringTest = await this.measurePerformance('String Processing', async () => {
      let result = '';
      for (let i = 0; i < 100000; i++) {
        result += `test string ${i} `;
      }
      return result.length;
    });
    
    // Array processing test
    const arrayTest = await this.measurePerformance('Array Processing', async () => {
      const arr = Array.from({ length: 100000 }, (_, i) => i);
      return arr.map(x => x * 2).filter(x => x % 3 === 0).reduce((a, b) => a + b, 0);
    });
    
    // Object manipulation test
    const objectTest = await this.measurePerformance('Object Manipulation', async () => {
      const objects = [];
      for (let i = 0; i < 50000; i++) {
        objects.push({
          id: i,
          name: `Object ${i}`,
          data: { value: i * 2, active: i % 2 === 0 }
        });
      }
      return objects.filter(obj => obj.data.active).length;
    });
    
    // JSON processing test
    const jsonTest = await this.measurePerformance('JSON Processing', async () => {
      const data = { items: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: Math.random() })) };
      const json = JSON.stringify(data);
      const parsed = JSON.parse(json);
      return parsed.items.length;
    });
    
    this.results.push({
      category: 'Core Performance',
      tests: [stringTest, arrayTest, objectTest, jsonTest]
    });
  }

  async runAIProcessingTests() {
    console.log(chalk.cyan('🤖 Running AI processing tests...'));
    
    try {
      // Import AI components
      const { CodingAgent } = await import('../src/agent.js');
      const { AdvancedAIOrchestration } = await import('../src/advanced-ai-orchestration.js');
      
      // Agent initialization test
      const agentInitTest = await this.measurePerformance('Agent Initialization', async () => {
        const agent = new CodingAgent();
        return agent ? 1 : 0;
      });
      
      // AI Orchestration initialization test
      const orchestrationInitTest = await this.measurePerformance('AI Orchestration Init', async () => {
        const orchestration = new AdvancedAIOrchestration();
        await orchestration.initialize();
        return orchestration.agents.size;
      });
      
      // Code analysis simulation
      const codeAnalysisTest = await this.measurePerformance('Code Analysis Simulation', async () => {
        const testCode = `
          function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n - 1) + fibonacci(n - 2);
          }
          
          for (let i = 0; i < 20; i++) {
            console.log(fibonacci(i));
          }
        `;
        
        // Simulate code analysis
        const lines = testCode.split('\n').length;
        const complexity = (testCode.match(/if|for|while/g) || []).length;
        return lines + complexity;
      });
      
      this.results.push({
        category: 'AI Processing',
        tests: [agentInitTest, orchestrationInitTest, codeAnalysisTest]
      });
      
    } catch (error) {
      console.warn(chalk.yellow('⚠️ AI processing tests skipped:'), error.message);
      this.results.push({
        category: 'AI Processing',
        tests: [{ name: 'AI Tests', status: 'skipped', error: error.message }]
      });
    }
  }

  async runMemoryTests() {
    console.log(chalk.cyan('💾 Running memory tests...'));
    
    const initialMemory = process.memoryUsage();
    
    // Memory allocation test
    const memoryAllocTest = await this.measurePerformance('Memory Allocation', async () => {
      const arrays = [];
      for (let i = 0; i < 1000; i++) {
        arrays.push(new Array(1000).fill(i));
      }
      return arrays.length;
    });
    
    // Memory cleanup test
    const memoryCleanupTest = await this.measurePerformance('Memory Cleanup', async () => {
      let data = new Array(100000).fill(0).map((_, i) => ({ id: i, data: new Array(100).fill(i) }));
      data = null;
      if (global.gc) global.gc();
      return 1;
    });
    
    const finalMemory = process.memoryUsage();
    
    this.metrics.memory.push({
      initial: initialMemory,
      final: finalMemory,
      difference: {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      }
    });
    
    this.results.push({
      category: 'Memory Performance',
      tests: [memoryAllocTest, memoryCleanupTest]
    });
  }

  async runIOTests() {
    console.log(chalk.cyan('📁 Running I/O performance tests...'));
    
    const testDir = 'temp-benchmark';
    await fs.mkdir(testDir, { recursive: true });
    
    try {
      // File write test
      const fileWriteTest = await this.measurePerformance('File Write', async () => {
        const data = 'x'.repeat(10000);
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(fs.writeFile(path.join(testDir, `test-${i}.txt`), data));
        }
        await Promise.all(promises);
        return promises.length;
      });
      
      // File read test
      const fileReadTest = await this.measurePerformance('File Read', async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(fs.readFile(path.join(testDir, `test-${i}.txt`), 'utf8'));
        }
        const results = await Promise.all(promises);
        return results.length;
      });
      
      // Directory operations test
      const dirOpsTest = await this.measurePerformance('Directory Operations', async () => {
        const files = await fs.readdir(testDir);
        const stats = await Promise.all(
          files.map(file => fs.stat(path.join(testDir, file)))
        );
        return stats.length;
      });
      
      this.results.push({
        category: 'I/O Performance',
        tests: [fileWriteTest, fileReadTest, dirOpsTest]
      });
      
    } finally {
      // Cleanup
      try {
        const files = await fs.readdir(testDir);
        await Promise.all(files.map(file => fs.unlink(path.join(testDir, file))));
        await fs.rmdir(testDir);
      } catch (error) {
        console.warn(chalk.yellow('⚠️ Cleanup warning:'), error.message);
      }
    }
  }

  async runConcurrencyTests() {
    console.log(chalk.cyan('🔄 Running concurrency tests...'));
    
    // Parallel processing test
    const parallelTest = await this.measurePerformance('Parallel Processing', async () => {
      const tasks = Array.from({ length: 50 }, (_, i) => 
        this.simulateAsyncTask(100 + Math.random() * 200, i)
      );
      const results = await Promise.all(tasks);
      return results.length;
    });
    
    // Sequential processing test
    const sequentialTest = await this.measurePerformance('Sequential Processing', async () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        const result = await this.simulateAsyncTask(100 + Math.random() * 200, i);
        results.push(result);
      }
      return results.length;
    });
    
    // Race condition test
    const raceTest = await this.measurePerformance('Race Condition Handling', async () => {
      let counter = 0;
      const increment = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            counter++;
            resolve(counter);
          }, Math.random() * 10);
        });
      };
      
      const promises = Array.from({ length: 100 }, () => increment());
      await Promise.all(promises);
      return counter;
    });
    
    this.results.push({
      category: 'Concurrency',
      tests: [parallelTest, sequentialTest, raceTest]
    });
  }

  async simulateAsyncTask(delay, id) {
    return new Promise(resolve => {
      setTimeout(() => {
        // Simulate some work
        const result = Math.sqrt(id * 1000) + Math.random();
        resolve(result);
      }, delay);
    });
  }

  async measurePerformance(name, fn) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const test = {
        name,
        status: 'passed',
        duration: Math.round((endTime - startTime) * 100) / 100,
        result,
        memory: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        }
      };
      
      console.log(chalk.gray(`  ✓ ${name}: ${test.duration}ms`));
      return test;
      
    } catch (error) {
      const endTime = performance.now();
      
      const test = {
        name,
        status: 'failed',
        duration: Math.round((endTime - startTime) * 100) / 100,
        error: error.message
      };
      
      console.log(chalk.red(`  ❌ ${name}: ${test.duration}ms - ${error.message}`));
      return test;
    }
  }

  async generateBenchmarkReport() {
    console.log(chalk.cyan('📄 Generating benchmark report...'));
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      system: this.systemInfo,
      results: this.results,
      metrics: this.metrics,
      summary: this.generateSummary()
    };
    
    await fs.writeFile('benchmark-report.json', JSON.stringify(report, null, 2));
    
    // Console summary
    console.log(chalk.blue('\n📊 Benchmark Summary:'));
    console.log(chalk.green(`  ✅ Total tests: ${report.summary.totalTests}`));
    console.log(chalk.green(`  ✅ Passed: ${report.summary.passed}`));
    console.log(chalk.red(`  ❌ Failed: ${report.summary.failed}`));
    console.log(chalk.yellow(`  ⏭️  Skipped: ${report.summary.skipped}`));
    console.log(chalk.gray(`  ⏱️  Total duration: ${report.duration}ms`));
    console.log(chalk.gray(`  📊 Average test time: ${report.summary.averageTime}ms`));
    
    if (report.summary.slowestTest) {
      console.log(chalk.yellow(`  🐌 Slowest test: ${report.summary.slowestTest.name} (${report.summary.slowestTest.duration}ms)`));
    }
    
    if (report.summary.fastestTest) {
      console.log(chalk.green(`  🚀 Fastest test: ${report.summary.fastestTest.name} (${report.summary.fastestTest.duration}ms)`));
    }
  }

  generateSummary() {
    const allTests = this.results.flatMap(category => category.tests);
    const passed = allTests.filter(test => test.status === 'passed');
    const failed = allTests.filter(test => test.status === 'failed');
    const skipped = allTests.filter(test => test.status === 'skipped');
    
    const durations = passed.map(test => test.duration);
    const averageTime = durations.length > 0 
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100
      : 0;
    
    const slowestTest = passed.reduce((slowest, test) => 
      !slowest || test.duration > slowest.duration ? test : slowest, null);
    
    const fastestTest = passed.reduce((fastest, test) => 
      !fastest || test.duration < fastest.duration ? test : fastest, null);
    
    return {
      totalTests: allTests.length,
      passed: passed.length,
      failed: failed.length,
      skipped: skipped.length,
      averageTime,
      slowestTest,
      fastestTest
    };
  }
}

// Run the benchmark
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run().catch(console.error);
}
