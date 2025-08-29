import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export class FileSystem {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
  }

  async readFile(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async writeFile(filePath, content) {
    try {
      const fullPath = this.resolvePath(filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  async appendFile(filePath, content) {
    try {
      const fullPath = this.resolvePath(filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.appendFile(fullPath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`Failed to append to file ${filePath}: ${error.message}`);
    }
  }

  async deleteFile(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      await fs.remove(fullPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  async fileExists(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      return await fs.pathExists(fullPath);
    } catch (error) {
      return false;
    }
  }

  async listFiles(dirPath = '.', options = {}) {
    try {
      const fullPath = this.resolvePath(dirPath);
      const {
        recursive = false,
        extensions = [],
        exclude = ['node_modules', '.git', 'dist', 'build']
      } = options;

      let pattern = recursive ? '**/*' : '*';
      
      if (extensions.length > 0) {
        const extPattern = extensions.length === 1 
          ? extensions[0] 
          : `{${extensions.join(',')}}`;
        pattern = `${pattern}.${extPattern}`;
      }

      const files = await glob(pattern, {
        cwd: fullPath,
        ignore: exclude.map(e => `**/${e}/**`),
        nodir: true
      });

      return files.map(file => path.join(dirPath, file));
    } catch (error) {
      throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
    }
  }

  async searchFiles(query, options = {}) {
    try {
      const {
        extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h'],
        exclude = ['node_modules', '.git', 'dist', 'build'],
        caseSensitive = false
      } = options;

      const files = await this.listFiles('.', { 
        recursive: true, 
        extensions: extensions.map(ext => ext.replace('.', '')),
        exclude 
      });

      const results = [];
      const searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');

      for (const file of files) {
        try {
          const content = await this.readFile(file);
          const lines = content.split('\n');
          const matches = [];

          lines.forEach((line, index) => {
            if (searchRegex.test(line)) {
              matches.push({
                line: index + 1,
                content: line.trim(),
                context: this.getLineContext(lines, index, 2)
              });
            }
          });

          if (matches.length > 0) {
            results.push({
              file,
              matches,
              matchCount: matches.length
            });
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async findFiles(pattern, options = {}) {
    try {
      const {
        exclude = ['node_modules', '.git', 'dist', 'build']
      } = options;

      const files = await glob(pattern, {
        cwd: this.rootPath,
        ignore: exclude.map(e => `**/${e}/**`),
        nodir: true
      });

      return files;
    } catch (error) {
      throw new Error(`Failed to find files with pattern ${pattern}: ${error.message}`);
    }
  }

  async getFileStats(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      const stats = await fs.stat(fullPath);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      };
    } catch (error) {
      throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
    }
  }

  async createDirectory(dirPath) {
    try {
      const fullPath = this.resolvePath(dirPath);
      await fs.ensureDir(fullPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  // Alias for createDirectory
  async ensureDirectoryExists(dirPath) {
    return this.createDirectory(dirPath);
  }

  async copyFile(sourcePath, destPath) {
    try {
      const fullSourcePath = this.resolvePath(sourcePath);
      const fullDestPath = this.resolvePath(destPath);
      await fs.copy(fullSourcePath, fullDestPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to copy ${sourcePath} to ${destPath}: ${error.message}`);
    }
  }

  async moveFile(sourcePath, destPath) {
    try {
      const fullSourcePath = this.resolvePath(sourcePath);
      const fullDestPath = this.resolvePath(destPath);
      await fs.move(fullSourcePath, fullDestPath);
      return true;
    } catch (error) {
      throw new Error(`Failed to move ${sourcePath} to ${destPath}: ${error.message}`);
    }
  }

  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.rootPath, filePath);
  }

  getLineContext(lines, lineIndex, contextSize = 2) {
    const start = Math.max(0, lineIndex - contextSize);
    const end = Math.min(lines.length, lineIndex + contextSize + 1);
    
    return lines.slice(start, end).map((line, index) => ({
      line: start + index + 1,
      content: line,
      isMatch: start + index === lineIndex
    }));
  }

  async getProjectStructure(maxDepth = 3) {
    try {
      const structure = await this.buildDirectoryTree('.', maxDepth);
      return structure;
    } catch (error) {
      throw new Error(`Failed to get project structure: ${error.message}`);
    }
  }

  async buildDirectoryTree(dirPath, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return null;
    }

    const fullPath = this.resolvePath(dirPath);
    const stats = await fs.stat(fullPath);

    if (!stats.isDirectory()) {
      return {
        name: path.basename(dirPath),
        type: 'file',
        path: dirPath
      };
    }

    const items = await fs.readdir(fullPath);
    const children = [];

    for (const item of items) {
      if (item.startsWith('.') && !item.startsWith('.env')) {
        continue;
      }
      
      if (['node_modules', 'dist', 'build', '.git'].includes(item)) {
        continue;
      }

      const itemPath = path.join(dirPath, item);
      const child = await this.buildDirectoryTree(itemPath, maxDepth, currentDepth + 1);
      
      if (child) {
        children.push(child);
      }
    }

    return {
      name: path.basename(dirPath) || 'root',
      type: 'directory',
      path: dirPath,
      children
    };
  }
}