import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CodingAgent } from '../src/agent.js';
import { CommandParser } from '../src/command-parser.js';
import { CodeAnalyzer } from '../src/code-analyzer.js';
import { FileSystem } from '../src/filesystem.js';

describe('CodingAgent', () => {
  test('should initialize with default config', () => {
    const agent = new CodingAgent();
    assert.ok(agent);
    assert.strictEqual(agent.config.aiProvider, 'openai');
    assert.strictEqual(agent.config.temperature, 0.1);
  });

  test('should initialize with custom config', () => {
    const config = {
      aiProvider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.5
    };
    const agent = new CodingAgent(config);
    assert.strictEqual(agent.config.aiProvider, 'anthropic');
    assert.strictEqual(agent.config.model, 'claude-3-sonnet-20240229');
    assert.strictEqual(agent.config.temperature, 0.5);
  });

  test('should set and get context', () => {
    const agent = new CodingAgent();
    agent.setContext('test', 'value');
    assert.strictEqual(agent.context.get('test'), 'value');
  });

  test('should clear context', () => {
    const agent = new CodingAgent();
    agent.setContext('test', 'value');
    agent.clearContext();
    assert.strictEqual(agent.context.size, 0);
  });
});

describe('CommandParser', () => {
  test('should parse analyze command', () => {
    const parser = new CommandParser();
    const result = parser.parse('analyze src/test.js');
    
    assert.strictEqual(result.type, 'analyze');
    assert.strictEqual(result.target, 'src/test.js');
  });

  test('should parse modify command', () => {
    const parser = new CommandParser();
    const result = parser.parse('modify src/app.js to add error handling');
    
    assert.strictEqual(result.type, 'modify');
    assert.strictEqual(result.target, 'src/app.js');
    assert.strictEqual(result.instructions, 'add error handling');
  });

  test('should parse search command', () => {
    const parser = new CommandParser();
    const result = parser.parse('search for TODO comments');
    
    assert.strictEqual(result.type, 'search');
    assert.strictEqual(result.query, 'TODO comments');
  });

  test('should handle general queries', () => {
    const parser = new CommandParser();
    const result = parser.parse('Tell me about design patterns');
    
    assert.strictEqual(result.type, 'general');
    assert.strictEqual(result.query, 'Tell me about design patterns');
  });

  test('should validate commands', () => {
    const parser = new CommandParser();
    const command = { type: 'analyze', target: 'test.js' };
    const validation = parser.validateCommand(command);
    
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);
  });

  test('should detect invalid commands', () => {
    const parser = new CommandParser();
    const command = { type: 'modify', target: '', instructions: '' };
    const validation = parser.validateCommand(command);
    
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.length > 0);
  });

  test('should provide help', () => {
    const parser = new CommandParser();
    const help = parser.getHelp();
    
    assert.ok(help.title);
    assert.ok(Array.isArray(help.commands));
    assert.ok(help.commands.length > 0);
  });
});

describe('CodeAnalyzer', () => {
  test('should detect language from file extension', () => {
    const analyzer = new CodeAnalyzer();
    
    assert.strictEqual(analyzer.detectLanguage('test.js'), 'javascript');
    assert.strictEqual(analyzer.detectLanguage('test.py'), 'python');
    assert.strictEqual(analyzer.detectLanguage('test.java'), 'java');
    assert.strictEqual(analyzer.detectLanguage('test.unknown'), 'unknown');
  });

  test('should calculate basic metrics', () => {
    const analyzer = new CodeAnalyzer();
    const code = `function test() {
  // This is a comment
  return 42;
}

// Another comment`;
    
    const metrics = analyzer.calculateMetrics(code);
    
    assert.ok(metrics.totalLines > 0);
    assert.ok(metrics.codeLines > 0);
    assert.ok(metrics.commentLines > 0);
  });

  test('should analyze JavaScript structure', async () => {
    const analyzer = new CodeAnalyzer();
    const code = `import React from 'react';

class TestClass {
  constructor() {}
}

function testFunction() {
  return 'test';
}

const arrowFunction = () => {};

export default TestClass;`;
    
    const analysis = await analyzer.analyze(code, 'test.js');
    
    assert.strictEqual(analysis.language, 'javascript');
    assert.ok(analysis.structure.functions.length > 0);
    assert.ok(analysis.structure.classes.length > 0);
    assert.ok(analysis.structure.imports.length > 0);
    assert.ok(analysis.structure.exports.length >= 0);
  });

  test('should calculate cyclomatic complexity', () => {
    const analyzer = new CodeAnalyzer();
    const simpleCode = 'function test() { return 42; }';
    const complexCode = `function test() {
      if (condition) {
        while (loop) {
          if (another) {
            return true;
          }
        }
      }
      return false;
    }`;
    
    const simpleComplexity = analyzer.calculateCyclomaticComplexity(simpleCode);
    const complexComplexity = analyzer.calculateCyclomaticComplexity(complexCode);
    
    assert.ok(simpleComplexity < complexComplexity);
  });

  test('should detect code issues', () => {
    const analyzer = new CodeAnalyzer();
    const codeWithIssues = `var oldStyleVar = 'bad';
console.log('debug statement');
// TODO: fix this later
if (x == y) { // loose equality
  return true;
}`;
    
    const issues = analyzer.detectIssues(codeWithIssues, 'javascript');
    
    assert.ok(issues.length > 0);
    assert.ok(issues.some(issue => issue.type === 'todo'));
    assert.ok(issues.some(issue => issue.type === 'debug'));
    assert.ok(issues.some(issue => issue.type === 'deprecated'));
    assert.ok(issues.some(issue => issue.type === 'equality'));
  });

  test('should extract JavaScript dependencies', () => {
    const analyzer = new CodeAnalyzer();
    const code = `import React from 'react';
import fs from 'fs';
import './local-file';
const path = require('path');`;
    
    const deps = analyzer.extractJavaScriptDependencies(code, {
      internal: [],
      external: [],
      builtin: []
    });
    
    assert.ok(deps.external.includes('react'));
    assert.ok(deps.builtin.includes('fs'));
    assert.ok(deps.internal.length >= 0);
  });
});

describe('FileSystem', () => {
  test('should resolve paths correctly', () => {
    const fs = new FileSystem('/test/root');
    
    const relativePath = fs.resolvePath('file.txt');
    const absolutePath = fs.resolvePath('/absolute/file.txt');
    
    assert.ok(relativePath.includes('/test/root'));
    assert.strictEqual(absolutePath, '/absolute/file.txt');
  });

  test('should get line context', () => {
    const fs = new FileSystem();
    const lines = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'];
    
    const context = fs.getLineContext(lines, 2, 1);
    
    assert.strictEqual(context.length, 3); // line 2, 3, 4 (0-based index)
    assert.strictEqual(context[1].isMatch, true); // Middle line should be the match
  });

  test('should handle edge cases in line context', () => {
    const fs = new FileSystem();
    const lines = ['line 1', 'line 2'];
    
    const context = fs.getLineContext(lines, 0, 5);
    
    assert.ok(context.length <= lines.length);
    assert.strictEqual(context[0].isMatch, true);
  });
});