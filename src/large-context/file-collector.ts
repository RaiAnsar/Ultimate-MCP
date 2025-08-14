/**
 * File Collector for Large Context Analysis
 * Recursively collects files matching patterns for analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  LargeContextOptions,
  CollectedFile,
  FileCollection,
  DirectoryTree
} from './types.js';
import { joinPath, normalizePath } from '../utils/platform-utils.js';

export class FileCollector {
  private readonly defaultExcludes = [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    '.cache',
    '__pycache__',
    '*.pyc',
    '*.pyo',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
  ];
  
  /**
   * Collect files matching the specified pattern
   */
  async collect(options: LargeContextOptions): Promise<FileCollection> {
    const startTime = Date.now();
    const files: CollectedFile[] = [];
    const visitedDirs = new Set<string>();
    
    // Compile regex pattern
    const regex = new RegExp(options.pattern);
    
    // Prepare exclude patterns
    const excludePatterns = [
      ...this.defaultExcludes,
      ...(options.exclude || [])
    ].map(pattern => this.compilePattern(pattern));
    
    // Collect files recursively
    await this.collectRecursive(
      options.rootDir,
      options.rootDir,
      regex,
      excludePatterns,
      files,
      visitedDirs,
      options,
      0
    );
    
    // Sort files if requested
    if (options.sortBy) {
      this.sortFiles(files, options.sortBy);
    }
    
    // Calculate metadata
    const metadata = this.calculateMetadata(files);
    
    return {
      rootDir: options.rootDir,
      pattern: options.pattern,
      files,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      totalFiles: files.length,
      totalTokens: files.reduce((sum, f) => sum + (f.metadata?.tokens || 0), 0),
      collectedAt: new Date(),
      metadata
    };
  }
  
  /**
   * Generate directory tree structure
   */
  async generateDirectoryTree(
    rootDir: string,
    options?: {
      maxDepth?: number;
      includeFiles?: boolean;
      pattern?: string;
    }
  ): Promise<DirectoryTree> {
    const stats = await fs.stat(rootDir);
    if (!stats.isDirectory()) {
      throw new Error('Root path must be a directory');
    }
    
    return this.buildDirectoryTree(
      rootDir,
      path.basename(rootDir),
      options?.maxDepth || 5,
      0,
      options?.includeFiles ?? true,
      options?.pattern ? new RegExp(options.pattern) : undefined
    );
  }
  
  /**
   * Collect files recursively
   */
  private async collectRecursive(
    currentPath: string,
    rootDir: string,
    pattern: RegExp,
    excludePatterns: RegExp[],
    files: CollectedFile[],
    visitedDirs: Set<string>,
    options: LargeContextOptions,
    depth: number
  ): Promise<void> {
    // Check max depth
    if (options.maxDepth !== undefined && options.maxDepth !== -1 && depth > options.maxDepth) {
      return;
    }
    
    // Skip if already visited (symlink protection)
    const realPath = await fs.realpath(currentPath);
    if (visitedDirs.has(realPath)) {
      return;
    }
    visitedDirs.add(realPath);
    
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootDir, fullPath);
        
        // Check excludes
        if (this.shouldExclude(relativePath, excludePatterns)) {
          continue;
        }
        
        // Skip hidden files/dirs if not included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.collectRecursive(
            fullPath,
            rootDir,
            pattern,
            excludePatterns,
            files,
            visitedDirs,
            options,
            depth + 1
          );
        } else if (entry.isFile() && pattern.test(fullPath)) {
          const file = await this.collectFile(fullPath, relativePath, options);
          if (file) {
            files.push(file);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }
  }
  
  /**
   * Collect a single file
   */
  private async collectFile(
    fullPath: string,
    relativePath: string,
    options: LargeContextOptions
  ): Promise<CollectedFile | null> {
    try {
      const stats = await fs.stat(fullPath);
      
      // Check file size limit
      const sizeMB = stats.size / (1024 * 1024);
      if (options.maxFileSize && sizeMB > options.maxFileSize) {
        return null;
      }
      
      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // Detect language
      const language = this.detectLanguage(fullPath);
      
      // Calculate metadata
      const lines = content.split('\n').length;
      const tokens = this.estimateTokens(content);
      const hash = createHash('md5').update(content).digest('hex');
      
      return {
        path: fullPath,
        relativePath,
        content,
        size: stats.size,
        modified: stats.mtime,
        language,
        encoding: 'utf-8',
        metadata: options.includeMetadata ? {
          lines,
          tokens,
          hash
        } : undefined
      };
    } catch (error) {
      console.error(`Error reading file ${fullPath}:`, error);
      return null;
    }
  }
  
  /**
   * Build directory tree recursively
   */
  private async buildDirectoryTree(
    currentPath: string,
    name: string,
    maxDepth: number,
    currentDepth: number,
    includeFiles: boolean,
    pattern?: RegExp
  ): Promise<DirectoryTree> {
    const stats = await fs.stat(currentPath);
    
    if (!stats.isDirectory()) {
      return {
        name,
        path: currentPath,
        type: 'file',
        size: stats.size,
        extension: path.extname(name),
        language: this.detectLanguage(currentPath)
      };
    }
    
    const tree: DirectoryTree = {
      name,
      path: currentPath,
      type: 'directory',
      children: []
    };
    
    if (currentDepth >= maxDepth) {
      return tree;
    }
    
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        // Skip hidden entries
        if (entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          const subTree = await this.buildDirectoryTree(
            fullPath,
            entry.name,
            maxDepth,
            currentDepth + 1,
            includeFiles,
            pattern
          );
          tree.children!.push(subTree);
        } else if (includeFiles && (!pattern || pattern.test(fullPath))) {
          const stats = await fs.stat(fullPath);
          tree.children!.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
            size: stats.size,
            extension: path.extname(entry.name),
            language: this.detectLanguage(fullPath)
          });
        }
      }
      
      // Sort children
      tree.children!.sort((a: DirectoryTree, b: DirectoryTree) => {
        // Directories first
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }
    
    return tree;
  }
  
  /**
   * Compile pattern to regex
   */
  private compilePattern(pattern: string): RegExp {
    // If already a regex pattern
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      return new RegExp(pattern.slice(1, -1));
    }
    
    // Convert glob to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`(^|/)${escaped}($|/)`);
  }
  
  /**
   * Check if path should be excluded
   */
  private shouldExclude(path: string, excludePatterns: RegExp[]): boolean {
    return excludePatterns.some(pattern => pattern.test(path));
  }
  
  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string | undefined {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.m': 'matlab',
      '.lua': 'lua',
      '.pl': 'perl',
      '.sh': 'bash',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.xml': 'xml',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.tex': 'latex',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };
    
    return languageMap[ext];
  }
  
  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(content: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }
  
  /**
   * Sort files by specified criteria
   */
  private sortFiles(files: CollectedFile[], sortBy: string): void {
    files.sort((a, b) => {
      switch (sortBy) {
        case 'path':
          return a.relativePath.localeCompare(b.relativePath);
        case 'size':
          return b.size - a.size;
        case 'modified':
          return b.modified.getTime() - a.modified.getTime();
        case 'name':
          return path.basename(a.path).localeCompare(path.basename(b.path));
        default:
          return 0;
      }
    });
  }
  
  /**
   * Calculate collection metadata
   */
  private calculateMetadata(files: CollectedFile[]): FileCollection['metadata'] {
    const languages: Record<string, number> = {};
    const directories = new Set<string>();
    let largestFile: CollectedFile | undefined;
    let oldestFile: CollectedFile | undefined;
    let newestFile: CollectedFile | undefined;
    
    for (const file of files) {
      // Count languages
      if (file.language) {
        languages[file.language] = (languages[file.language] || 0) + 1;
      }
      
      // Collect directories
      directories.add(path.dirname(file.relativePath));
      
      // Track extremes
      if (!largestFile || file.size > largestFile.size) {
        largestFile = file;
      }
      if (!oldestFile || file.modified < oldestFile.modified) {
        oldestFile = file;
      }
      if (!newestFile || file.modified > newestFile.modified) {
        newestFile = file;
      }
    }
    
    return {
      languages,
      directories: Array.from(directories).sort(),
      largestFile: largestFile?.relativePath,
      oldestFile: oldestFile?.relativePath,
      newestFile: newestFile?.relativePath
    };
  }
  
  /**
   * Format collection as context
   */
  formatAsContext(
    collection: FileCollection,
    format: 'plain' | 'structured' | 'xml' | 'json' = 'structured'
  ): string {
    switch (format) {
      case 'plain':
        return this.formatPlain(collection);
      case 'xml':
        return this.formatXML(collection);
      case 'json':
        return JSON.stringify(collection, null, 2);
      default:
        return this.formatStructured(collection);
    }
  }
  
  private formatPlain(collection: FileCollection): string {
    let context = `# File Collection from ${collection.rootDir}\n\n`;
    context += `Pattern: ${collection.pattern}\n`;
    context += `Total Files: ${collection.totalFiles}\n`;
    context += `Total Size: ${(collection.totalSize / 1024 / 1024).toFixed(2)} MB\n\n`;
    
    for (const file of collection.files) {
      context += `\n${'='.repeat(80)}\n`;
      context += `File: ${file.relativePath}\n`;
      context += `${'='.repeat(80)}\n\n`;
      context += file.content;
      context += '\n';
    }
    
    return context;
  }
  
  private formatStructured(collection: FileCollection): string {
    let context = `<file_collection root="${collection.rootDir}" pattern="${collection.pattern}">\n`;
    context += `<summary files="${collection.totalFiles}" size="${collection.totalSize}" />\n\n`;
    
    for (const file of collection.files) {
      context += `<file path="${file.relativePath}" size="${file.size}" language="${file.language || 'unknown'}">\n`;
      context += `<content>\n${this.escapeXML(file.content)}\n</content>\n`;
      context += `</file>\n\n`;
    }
    
    context += `</file_collection>`;
    return context;
  }
  
  private formatXML(collection: FileCollection): string {
    return this.formatStructured(collection);
  }
  
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}