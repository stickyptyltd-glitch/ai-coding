import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

export class ErrorHealingSystem {
  constructor(agent) {
    this.agent = agent;
    this.maxRetries = 3;
    this.healingHistory = new Map();
    this.errorPatterns = new Map();
    this.initializeErrorPatterns();
  }

  initializeErrorPatterns() {
    // Common error patterns and their solutions
    this.errorPatterns.set(/Cannot find module ['"](.+)['"]/, {
      type: 'missing_module',
      solution: 'Install missing dependency',
      action: async (match) => {
        const module = match[1];
        return await this.installDependency(module);
      }
    });

    this.errorPatterns.set(/ReferenceError: (.+) is not defined/, {
      type: 'undefined_variable',
      solution: 'Add missing import or declaration',
      action: async (match, filePath) => {
        return await this.fixUndefinedVariable(match[1], filePath);
      }
    });

    this.errorPatterns.set(/SyntaxError: (.+)/, {
      type: 'syntax_error',
      solution: 'Fix syntax issues',
      action: async (match, filePath) => {
        return await this.fixSyntaxError(match[1], filePath);
      }
    });

    this.errorPatterns.set(/TypeError: (.+)/, {
      type: 'type_error',
      solution: 'Fix type-related issues',
      action: async (match, filePath) => {
        return await this.fixTypeError(match[1], filePath);
      }
    });
  }

  async runCodeWithHealing(command, filePath = null, maxRetries = this.maxRetries) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        console.log(chalk.blue(`🔧 Attempt ${attempt + 1}: Running ${command}`));
        const result = await execAsync(command);
        
        if (attempt > 0) {
          console.log(chalk.green(`✅ Healed after ${attempt} attempts!`));
        }
        
        return {
          success: true,
          output: result.stdout,
          attempts: attempt + 1,
          healed: attempt > 0
        };

      } catch (error) {
        attempt++;
        lastError = error;
        
        console.log(chalk.red(`❌ Error on attempt ${attempt}:`));
        console.log(error.stderr || error.message);

        if (attempt < maxRetries) {
          const healingResult = await this.healError(error, filePath);
          
          if (!healingResult.canHeal) {
            console.log(chalk.yellow('Cannot auto-heal this error, stopping attempts'));
            break;
          }
          
          console.log(chalk.cyan(`🩹 Applied healing: ${healingResult.solution}`));
          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        }
      }
    }

    return {
      success: false,
      error: lastError.stderr || lastError.message,
      attempts: attempt,
      maxRetries
    };
  }

  async healError(error, filePath = null) {
    const errorMessage = error.stderr || error.message;
    
    // Try to match known error patterns
    for (const [pattern, config] of this.errorPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        try {
          const result = await config.action(match, filePath);
          
          // Store healing history
          const healingKey = `${config.type}:${match[0]}`;
          this.healingHistory.set(healingKey, {
            timestamp: new Date(),
            solution: config.solution,
            success: result.success
          });

          return {
            canHeal: true,
            type: config.type,
            solution: config.solution,
            result: result
          };
        } catch (healingError) {
          console.log(chalk.red(`Failed to apply healing: ${healingError.message}`));
        }
      }
    }

    // Try AI-powered healing for unknown errors
    return await this.aiHealError(errorMessage, filePath);
  }

  async aiHealError(errorMessage, filePath) {
    try {
      const contextCode = filePath ? await fs.readFile(filePath, 'utf8') : '';
      
      const prompt = `You are an error healing system. Analyze this error and provide a solution:

Error: ${errorMessage}

${filePath ? `File: ${filePath}\nCode:\n${contextCode}` : ''}

Provide a JSON response with:
{
  "canHeal": boolean,
  "diagnosis": "what caused the error",
  "solution": "how to fix it",
  "code": "fixed code if applicable",
  "commands": ["shell commands to run if needed"]
}`;

      const aiResponse = await this.agent.aiProvider.query(prompt, {
        taskType: 'errorHealing',
        maxTokens: 1500,
        format: 'json'
      });

      const solution = JSON.parse(aiResponse);
      
      if (solution.canHeal) {
        // Apply AI-suggested fixes
        if (solution.code && filePath) {
          await fs.writeFile(filePath, solution.code);
          console.log(chalk.green(`Fixed code in ${filePath}`));
        }
        
        if (solution.commands && solution.commands.length > 0) {
          for (const cmd of solution.commands) {
            console.log(chalk.blue(`Running: ${cmd}`));
            await execAsync(cmd);
          }
        }
        
        return {
          canHeal: true,
          type: 'ai_healing',
          solution: solution.solution,
          diagnosis: solution.diagnosis
        };
      }
      
      return { canHeal: false, reason: solution.diagnosis };
      
    } catch (aiError) {
      console.log(chalk.yellow('AI healing failed:', aiError.message));
      return { canHeal: false, reason: 'AI healing unavailable' };
    }
  }

  async installDependency(moduleName) {
    try {
      // Try npm first
      await execAsync(`npm install ${moduleName}`);
      return { success: true, method: 'npm' };
    } catch {
      try {
        // Fallback to yarn
        await execAsync(`yarn add ${moduleName}`);
        return { success: true, method: 'yarn' };
      } catch {
        return { success: false, error: 'Failed to install dependency' };
      }
    }
  }

  async fixUndefinedVariable(variableName, filePath) {
    if (!filePath) return { success: false };
    
    try {
      const code = await fs.readFile(filePath, 'utf8');
      
      // Try to find where this variable should be imported from
      const searchResult = await this.agent.filesystem.searchFiles(variableName);
      
      if (searchResult.length > 0) {
        const sourceFile = searchResult[0].file;
        const relativePath = path.relative(path.dirname(filePath), sourceFile);
        const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
        
        // Add import statement
        const importStatement = `import { ${variableName} } from '${importPath.replace('.js', '')}';\n`;
        const fixedCode = importStatement + code;
        
        await fs.writeFile(filePath, fixedCode);
        return { success: true, action: 'added_import' };
      }
      
      return { success: false, reason: 'Could not locate variable definition' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fixSyntaxError(syntaxError, filePath) {
    if (!filePath) return { success: false };
    
    try {
      const code = await fs.readFile(filePath, 'utf8');
      
      const prompt = `Fix this syntax error in the code:

Error: ${syntaxError}

Code:
${code}

Respond with only the corrected code, no explanations.`;

      const fixedCode = await this.agent.aiProvider.query(prompt, {
        taskType: 'syntaxFix',
        maxTokens: 2000
      });
      
      await fs.writeFile(filePath, fixedCode);
      return { success: true, action: 'syntax_fixed' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fixTypeError(typeError, filePath) {
    if (!filePath) return { success: false };
    
    try {
      const code = await fs.readFile(filePath, 'utf8');
      
      const prompt = `Fix this type error in the code:

Error: ${typeError}

Code:
${code}

Provide the corrected code with proper type handling. Respond with only the corrected code.`;

      const fixedCode = await this.agent.aiProvider.query(prompt, {
        taskType: 'typeFix',
        maxTokens: 2000
      });
      
      await fs.writeFile(filePath, fixedCode);
      return { success: true, action: 'type_fixed' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getHealingStats() {
    const stats = {
      totalHealings: this.healingHistory.size,
      successfulHealings: 0,
      healingsByType: {},
      recentHealings: []
    };

    for (const [key, healing] of this.healingHistory) {
      if (healing.success) stats.successfulHealings++;
      
      const type = key.split(':')[0];
      stats.healingsByType[type] = (stats.healingsByType[type] || 0) + 1;
      
      stats.recentHealings.push({
        type,
        timestamp: healing.timestamp,
        solution: healing.solution
      });
    }

    stats.recentHealings.sort((a, b) => b.timestamp - a.timestamp);
    stats.recentHealings = stats.recentHealings.slice(0, 10);

    return stats;
  }
}