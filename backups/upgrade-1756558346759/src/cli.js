#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CodingAgent } from './agent.js';
import { FileSystem } from './filesystem.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { ensureLicenseOrExit } from './license.js';

dotenv.config();
// Enforce license before actions (skips in tests)
ensureLicenseOrExit();

const program = new Command();

program
  .name('ai-agent')
  .description('AI-powered coding agent for code analysis, modification, and generation')
  .version('1.0.0');

program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .option('-m, --model <model>', 'AI model to use')
  .option('-t, --temperature <temperature>', 'Temperature for AI responses', '0.1')
  .action(async (options) => {
    await startInteractiveMode(options);
  });

program
  .command('analyze <file>')
  .description('Analyze a code file')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .option('-m, --model <model>', 'AI model to use')
  .action(async (file, options) => {
    const agent = createAgent(options);
    const result = await agent.analyzeCode(file);
    displayResult(result);
  });

program
  .command('modify <file> <instructions>')
  .description('Modify a code file with AI instructions')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .option('-m, --model <model>', 'AI model to use')
  .option('--backup', 'Create backup before modification', true)
  .action(async (file, instructions, options) => {
    const agent = createAgent(options);
    
    if (options.backup) {
      await createBackup(file);
    }
    
    const result = await agent.modifyCode(file, instructions);
    displayResult(result);
  });

program
  .command('create <file> <requirements>')
  .description('Create a new file with AI-generated code')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .option('-m, --model <model>', 'AI model to use')
  .action(async (file, requirements, options) => {
    const agent = createAgent(options);
    const result = await agent.createFile(file, requirements);
    displayResult(result);
  });

program
  .command('search <query>')
  .description('Search for code patterns in the project')
  .option('-e, --extensions <extensions>', 'File extensions to search (comma-separated)', 'js,ts,jsx,tsx,py,java')
  .option('--exclude <patterns>', 'Patterns to exclude (comma-separated)', 'node_modules,.git,dist,build')
  .action(async (query, options) => {
    const filesystem = new FileSystem();
    const extensions = options.extensions.split(',').map(ext => `.${ext.replace('.', '')}`);
    const exclude = options.exclude.split(',');
    
    const results = await filesystem.searchFiles(query, { extensions, exclude });
    displaySearchResults(results);
  });

program
  .command('explain <file>')
  .description('Get an AI explanation of a code file')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .option('-m, --model <model>', 'AI model to use')
  .action(async (file, options) => {
    const agent = createAgent(options);
    const result = await agent.explainCode(file);
    displayResult(result);
  });

program
  .command('setup')
  .description('Set up API keys and configuration')
  .action(async () => {
    await setupConfiguration();
  });

program
  .command('test-connection')
  .description('Test AI provider connection')
  .option('-p, --provider <provider>', 'AI provider to test (openai|anthropic)', 'openai')
  .action(async (options) => {
    await testConnection(options);
  });

program
  .command('scrape <url>')
  .description('Scrape content from a URL')
  .option('-o, --output <file>', 'Save results to file')
  .option('-f, --format <format>', 'Output format (json|csv|txt)', 'json')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .action(async (url, options) => {
    const agent = createAgent(options);
    const outputFile = options.output ? `${options.output}.${options.format}` : null;
    const result = await agent.scrapeUrl(url, outputFile);
    displayWebResult(result);
  });

program
  .command('extract <selector> <url>')
  .description('Extract specific content using CSS selectors')
  .option('-o, --output <file>', 'Save results to file')
  .option('-f, --format <format>', 'Output format (json|csv|txt)', 'json')
  .action(async (selector, url, options) => {
    const agent = createAgent(options);
    const outputFile = options.output ? `${options.output}.${options.format}` : null;
    const result = await agent.extractFromUrl(selector, url, outputFile);
    displayWebResult(result);
  });

program
  .command('crawl <url>')
  .description('Crawl a website following links')
  .option('-d, --depth <depth>', 'Maximum crawl depth', '2')
  .option('-o, --output <file>', 'Save results to file')
  .option('-f, --format <format>', 'Output format (json|csv|txt)', 'json')
  .action(async (url, options) => {
    const agent = createAgent(options);
    const depth = parseInt(options.depth);
    const outputFile = options.output ? `${options.output}.${options.format}` : null;
    const result = await agent.crawlWebsite(url, depth, outputFile);
    displayWebResult(result);
  });

program
  .command('analyze-web <url>')
  .description('Analyze web content with AI')
  .option('-p, --provider <provider>', 'AI provider (openai|anthropic)', 'openai')
  .option('-m, --model <model>', 'AI model to use')
  .action(async (url, options) => {
    const agent = createAgent(options);
    const result = await agent.analyzeWebContent(url);
    displayWebAnalysisResult(result);
  });

async function startInteractiveMode(options) {
  console.log(chalk.blue.bold('🤖 AI Coding Agent - Interactive Mode'));
  console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));

  const agent = createAgent(options);
  
  // Test connection first
  const connected = await agent.aiProvider.testConnection();
  if (!connected) {
    console.log(chalk.red('❌ Failed to connect to AI provider. Please check your API keys.'));
    console.log(chalk.gray('Run "ai-agent setup" to configure API keys.'));
    return;
  }

  console.log(chalk.green('✅ Connected to AI provider successfully\n'));

  while (true) {
    try {
      const { input } = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: chalk.cyan('ai-agent>'),
          prefix: ''
        }
      ]);

      if (!input.trim()) continue;

      const lowerInput = input.toLowerCase().trim();
      if (lowerInput === 'exit' || lowerInput === 'quit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        break;
      }

      if (lowerInput === 'clear') {
        console.clear();
        continue;
      }

      const result = await agent.processCommand(input);
      displayResult(result);

    } catch (error) {
      if (error.message.includes('User force closed')) {
        console.log(chalk.yellow('\nGoodbye! 👋'));
        break;
      }
      console.error(chalk.red('Error:'), error.message);
    }
  }
}

function createAgent(options) {
  const config = {
    aiProvider: options.provider || 'openai',
    model: options.model,
    temperature: parseFloat(options.temperature || '0.1')
  };

  return new CodingAgent(config);
}

function displayResult(result) {
  if (!result) {
    console.log(chalk.red('No result returned'));
    return;
  }

  if (!result.success) {
    console.log(chalk.red('❌ Error:'), result.error);
    return;
  }

  switch (result.type || 'default') {
    case 'analysis':
      displayAnalysisResult(result);
      break;
    case 'search':
      displaySearchResults(result.results);
      break;
    default:
      displayGenericResult(result);
  }
}

function displayAnalysisResult(result) {
  console.log(chalk.blue.bold(`\n📊 Analysis: ${result.filePath}`));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (result.analysis) {
    console.log(chalk.yellow('Code Analysis:'));
    console.log(result.analysis);
  }
  
  if (result.insights) {
    console.log(chalk.green('\nAI Insights:'));
    console.log(result.insights);
  }
}

function displaySearchResults(results) {
  if (!results || results.length === 0) {
    console.log(chalk.yellow('No matches found'));
    return;
  }

  console.log(chalk.blue.bold(`\n🔍 Found ${results.length} files with matches:`));
  console.log(chalk.gray('─'.repeat(50)));

  results.forEach(result => {
    console.log(chalk.cyan(`\n📁 ${result.file} (${result.matchCount} matches)`));
    
    result.matches.slice(0, 3).forEach(match => {
      console.log(chalk.gray(`  Line ${match.line}:`), match.content);
    });
    
    if (result.matches.length > 3) {
      console.log(chalk.gray(`  ... and ${result.matches.length - 3} more matches`));
    }
  });
}

function displayGenericResult(result) {
  if (result.message) {
    console.log(chalk.green('✅'), result.message);
  }
  
  if (result.response) {
    console.log('\n' + result.response);
  }
  
  if (result.explanation) {
    console.log('\n' + result.explanation);
  }
  
  if (result.insights) {
    console.log(chalk.blue('\nInsights:'));
    console.log(result.insights);
  }
}

function displayWebResult(result) {
  if (!result.success) {
    console.log(chalk.red('❌ Web scraping failed:'), result.error);
    return;
  }

  console.log(chalk.green('✅ Web scraping completed'));
  
  if (result.url) {
    console.log(chalk.blue('URL:'), result.url);
  }
  
  if (result.selector) {
    console.log(chalk.yellow('Selector:'), result.selector);
  }
  
  if (result.data) {
    if (result.data.title) {
      console.log(chalk.cyan('Title:'), result.data.title);
    }
    
    if (result.data.description) {
      console.log(chalk.gray('Description:'), result.data.description);
    }
    
    if (typeof result.count !== 'undefined') {
      console.log(chalk.magenta('Results found:'), result.count);
    }
    
    if (result.pagesFound) {
      console.log(chalk.magenta('Pages crawled:'), result.pagesFound);
    }
    
    if (result.data.wordCount) {
      console.log(chalk.gray('Word count:'), result.data.wordCount);
    }
    
    if (result.data.linkCount) {
      console.log(chalk.gray('Links:'), result.data.linkCount);
    }
    
    if (result.data.imageCount) {
      console.log(chalk.gray('Images:'), result.data.imageCount);
    }
  }
  
  if (result.savedTo) {
    console.log(chalk.green('💾 Saved to:'), result.savedTo);
  }
  
  if (result.size) {
    console.log(chalk.gray('Size:'), `${(result.size / 1024).toFixed(2)} KB`);
  }
}

function displayWebAnalysisResult(result) {
  if (!result.success) {
    console.log(chalk.red('❌ Web analysis failed:'), result.error);
    return;
  }

  console.log(chalk.blue.bold(`\n🔍 Web Content Analysis: ${result.url}`));
  console.log(chalk.gray('─'.repeat(60)));
  
  if (result.analysis.basic) {
    const basic = result.analysis.basic;
    console.log(chalk.yellow('\n📊 Basic Metrics:'));
    console.log(`  Title: ${basic.title || 'No title'}`);
    console.log(`  Description: ${basic.description || 'No description'}`);
    console.log(`  Words: ${basic.wordCount}`);
    console.log(`  Headings: ${basic.headingCount}`);
    console.log(`  Links: ${basic.linkCount}`);
    console.log(`  Images: ${basic.imageCount}`);
    console.log(`  Forms: ${basic.formCount}`);
    console.log(`  Tables: ${basic.tableCount}`);
  }
  
  if (result.analysis.structure && result.analysis.structure.length > 0) {
    console.log(chalk.cyan('\n📑 Page Structure:'));
    result.analysis.structure.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1);
      console.log(`${indent}H${heading.level}: ${heading.text}`);
    });
  }
  
  if (result.analysis.aiInsights) {
    console.log(chalk.green('\n🤖 AI Analysis:'));
    console.log(result.analysis.aiInsights);
  }
}

async function setupConfiguration() {
  console.log(chalk.blue.bold('🔧 AI Coding Agent Setup'));
  console.log(chalk.gray('Configure your API keys for AI providers\n'));

  const questions = [
    {
      type: 'confirm',
      name: 'setupOpenAI',
      message: 'Do you want to configure OpenAI API key?',
      default: true
    },
    {
      type: 'password',
      name: 'openaiKey',
      message: 'Enter your OpenAI API key:',
      when: (answers) => answers.setupOpenAI
    },
    {
      type: 'confirm',
      name: 'setupAnthropic',
      message: 'Do you want to configure Anthropic API key?',
      default: false
    },
    {
      type: 'password',
      name: 'anthropicKey',
      message: 'Enter your Anthropic API key:',
      when: (answers) => answers.setupAnthropic
    }
  ];

  const answers = await inquirer.prompt(questions);

  let envContent = '';
  if (fs.existsSync('.env')) {
    envContent = fs.readFileSync('.env', 'utf-8');
  }

  if (answers.openaiKey) {
    envContent = updateEnvVar(envContent, 'OPENAI_API_KEY', answers.openaiKey);
  }

  if (answers.anthropicKey) {
    envContent = updateEnvVar(envContent, 'ANTHROPIC_API_KEY', answers.anthropicKey);
  }

  fs.writeFileSync('.env', envContent);
  console.log(chalk.green('✅ Configuration saved to .env file'));
  console.log(chalk.gray('Make sure to add .env to your .gitignore file'));
}

function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  
  if (regex.test(content)) {
    return content.replace(regex, newLine);
  } else {
    return content + (content.endsWith('\n') ? '' : '\n') + newLine + '\n';
  }
}

async function testConnection(options) {
  console.log(chalk.blue('Testing connection to AI provider...'));
  
  try {
    const agent = createAgent(options);
    const connected = await agent.aiProvider.testConnection();
    
    if (connected) {
      console.log(chalk.green('✅ Connection successful!'));
    } else {
      console.log(chalk.red('❌ Connection failed. Please check your API key.'));
    }
  } catch (error) {
    console.log(chalk.red('❌ Connection failed:'), error.message);
  }
}

async function createBackup(filePath) {
  try {
    const filesystem = new FileSystem();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    
    await filesystem.copyFile(filePath, backupPath);
    console.log(chalk.gray(`📋 Backup created: ${backupPath}`));
  } catch (error) {
    console.log(chalk.yellow(`Warning: Could not create backup - ${error.message}`));
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Unexpected error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled rejection:'), reason);
  process.exit(1);
});

program.parse();
