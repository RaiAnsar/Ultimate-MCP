import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = new Logger('UniversalSearchTools');

// Search result types
interface SearchResult {
  type: 'file' | 'directory' | 'content' | 'process' | 'system';
  path?: string;
  name: string;
  match?: string;
  lineNumber?: number;
  context?: string;
  metadata?: Record<string, any>;
  score?: number;
}

// Search providers
abstract class SearchProvider {
  abstract name: string;
  abstract search(query: string, options: any): Promise<SearchResult[]>;
}

// File system search provider
class FileSystemSearchProvider extends SearchProvider {
  name = 'filesystem';
  
  async search(query: string, options: any): Promise<SearchResult[]> {
    const {
      searchPath = process.cwd(),
      includeHidden = false,
      maxResults = 100,
      fileTypes = [],
      excludePatterns = ['node_modules', '.git', 'dist', 'build']
    } = options;
    
    const results: SearchResult[] = [];
    
    try {
      // Search for files matching the query using fs.readdir recursively
      const files = await this.findFiles(searchPath, includeHidden, excludePatterns);
      
      // Filter and score results
      for (const file of files) {
        const basename = path.basename(file);
        const relativePath = path.relative(searchPath, file);
        
        // Check if file matches query
        const score = this.calculateScore(basename, query);
        if (score > 0) {
          // Check file type filter
          if (fileTypes.length > 0) {
            const ext = path.extname(file).toLowerCase();
            if (!fileTypes.includes(ext)) continue;
          }
          
          const stats = await fs.stat(file);
          results.push({
            type: stats.isDirectory() ? 'directory' : 'file',
            path: file,
            name: basename,
            metadata: {
              relativePath,
              size: stats.size,
              modified: stats.mtime,
              extension: path.extname(file)
            },
            score
          });
          
          if (results.length >= maxResults) break;
        }
      }
      
      // Sort by score
      results.sort((a, b) => (b.score || 0) - (a.score || 0));
      
    } catch (error) {
      logger.error('File system search error:', error);
    }
    
    return results;
  }
  
  private calculateScore(filename: string, query: string): number {
    const lowerFile = filename.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match
    if (lowerFile === lowerQuery) return 100;
    
    // Starts with query
    if (lowerFile.startsWith(lowerQuery)) return 80;
    
    // Contains query
    if (lowerFile.includes(lowerQuery)) return 60;
    
    // Fuzzy match
    const fuzzyScore = this.fuzzyMatch(lowerFile, lowerQuery);
    if (fuzzyScore > 0.5) return fuzzyScore * 50;
    
    return 0;
  }
  
  private fuzzyMatch(str: string, pattern: string): number {
    let patternIdx = 0;
    let score = 0;
    let consecutive = 0;
    
    for (let i = 0; i < str.length && patternIdx < pattern.length; i++) {
      if (str[i] === pattern[patternIdx]) {
        score += 1 + consecutive;
        consecutive++;
        patternIdx++;
      } else {
        consecutive = 0;
      }
    }
    
    return patternIdx === pattern.length ? score / pattern.length : 0;
  }
  
  private async findFiles(
    dir: string,
    includeHidden: boolean,
    excludePatterns: string[]
  ): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(currentDir: string) {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const relativePath = path.relative(dir, fullPath);
          
          // Skip excluded patterns
          if (excludePatterns.some(pattern => relativePath.includes(pattern))) {
            continue;
          }
          
          // Skip hidden files if not included
          if (!includeHidden && entry.name.startsWith('.')) {
            continue;
          }
          
          files.push(fullPath);
          
          if (entry.isDirectory()) {
            await walk(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await walk(dir);
    return files;
  }
}

// Content search provider (grep-like)
class ContentSearchProvider extends SearchProvider {
  name = 'content';
  
  async search(query: string, options: any): Promise<SearchResult[]> {
    const {
      searchPath = process.cwd(),
      fileTypes = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.md', '.txt'],
      caseSensitive = false,
      regex = false,
      maxResults = 100,
      contextLines = 2,
      excludePatterns = ['node_modules', '.git', 'dist', 'build']
    } = options;
    
    const results: SearchResult[] = [];
    
    try {
      // Build grep command
      const grepFlags = [
        caseSensitive ? '' : '-i',
        regex ? '-E' : '-F',
        '-n', // line numbers
        '-r', // recursive
        `--include=*{${fileTypes.join(',')}}`,
        ...excludePatterns.map((p: any) => `--exclude-dir=${p}`)
      ].filter(Boolean).join(' ');
      
      const command = `grep ${grepFlags} "${query.replace(/"/g, '\\"')}" "${searchPath}"`;
      
      try {
        const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
        const lines = stdout.trim().split('\n').filter(line => line);
        
        for (const line of lines.slice(0, maxResults)) {
          const match = line.match(/^(.+?):(\d+):(.*)$/);
          if (match) {
            const [, filePath, lineNum, content] = match;
            
            results.push({
              type: 'content',
              path: filePath,
              name: path.basename(filePath),
              match: content.trim(),
              lineNumber: parseInt(lineNum),
              context: await this.getContext(filePath, parseInt(lineNum), contextLines),
              metadata: {
                query,
                relativePath: path.relative(searchPath, filePath)
              }
            });
          }
        }
      } catch (error: any) {
        // Grep returns non-zero exit code when no matches found
        if (error.code !== 1) {
          logger.error('Grep error:', error);
        }
      }
      
    } catch (error) {
      logger.error('Content search error:', error);
    }
    
    return results;
  }
  
  private async getContext(filePath: string, lineNumber: number, contextLines: number): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const startLine = Math.max(0, lineNumber - contextLines - 1);
      const endLine = Math.min(lines.length, lineNumber + contextLines);
      
      return lines.slice(startLine, endLine)
        .map((line, idx) => {
          const currentLine = startLine + idx + 1;
          const prefix = currentLine === lineNumber ? '>>> ' : '    ';
          return `${currentLine}: ${prefix}${line}`;
        })
        .join('\n');
    } catch (error) {
      return '';
    }
  }
}

// Process search provider
class ProcessSearchProvider extends SearchProvider {
  name = 'process';
  
  async search(query: string, options: any): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Use ps command to search processes
      const { stdout } = await execAsync('ps aux', { maxBuffer: 10 * 1024 * 1024 });
      const lines = stdout.trim().split('\n');
      const header = lines[0];
      const processes = lines.slice(1);
      
      for (const process of processes) {
        if (process.toLowerCase().includes(query.toLowerCase())) {
          const parts = process.split(/\s+/);
          const [user, pid, cpu, mem, vsz, rss, tty, stat, start, time, ...cmdParts] = parts;
          const command = cmdParts.join(' ');
          
          results.push({
            type: 'process',
            name: command.split(' ')[0],
            match: command,
            metadata: {
              pid,
              user,
              cpu: `${cpu}%`,
              memory: `${mem}%`,
              status: stat,
              startTime: start,
              cpuTime: time
            }
          });
        }
      }
    } catch (error) {
      logger.error('Process search error:', error);
    }
    
    return results;
  }
}

// Universal search manager
class UniversalSearchManager {
  private providers = new Map<string, SearchProvider>();
  
  constructor() {
    this.registerProvider(new FileSystemSearchProvider());
    this.registerProvider(new ContentSearchProvider());
    this.registerProvider(new ProcessSearchProvider());
  }
  
  registerProvider(provider: SearchProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  async search(
    query: string,
    providers: string[] = ['filesystem', 'content'],
    options: any = {}
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    
    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      if (provider) {
        const results = await provider.search(query, options);
        allResults.push(...results);
      }
    }
    
    return allResults;
  }
}

const searchManager = new UniversalSearchManager();

// Tool definitions

export const universalSearch: ToolDefinition = {
  name: 'universal_search',
  description: 'Search across files, content, and processes using multiple search providers',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    providers: z.array(z.enum(['filesystem', 'content', 'process']))
      .optional()
      .default(['filesystem', 'content'])
      .describe('Search providers to use'),
    searchPath: z.string().optional().describe('Base path for search'),
    options: z.object({
      includeHidden: z.boolean().optional().default(false),
      maxResults: z.number().optional().default(50),
      fileTypes: z.array(z.string()).optional(),
      caseSensitive: z.boolean().optional().default(false),
      regex: z.boolean().optional().default(false),
      contextLines: z.number().optional().default(2),
      excludePatterns: z.array(z.string()).optional()
    }).optional()
  }).strict() as any,
  handler: async (args) => {
    const { query, providers, searchPath, options = {} } = args;
    
    const searchOptions = {
      searchPath: searchPath || process.cwd(),
      ...options
    };
    
    const results = await searchManager.search(query, providers, searchOptions);
    
    // Group results by type
    const grouped = results.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);
    
    return {
      query,
      totalResults: results.length,
      results: grouped,
      summary: Object.entries(grouped).map(([type, items]) => ({
        type,
        count: items.length
      }))
    };
  }
};

export const searchFiles: ToolDefinition = {
  name: 'search_files',
  description: 'Search for files and directories by name',
  inputSchema: z.object({
    pattern: z.string().describe('Search pattern (supports wildcards)'),
    searchPath: z.string().optional().describe('Base path for search'),
    includeHidden: z.boolean().optional().default(false),
    fileTypes: z.array(z.string()).optional()
      .describe('File extensions to include (e.g., [".js", ".ts"])'),
    excludePatterns: z.array(z.string()).optional()
      .describe('Patterns to exclude (e.g., ["node_modules", ".git"])'),
    maxResults: z.number().optional().default(100)
  }).strict() as any,
  handler: async (args) => {
    const results = await searchManager.search(args.pattern, ['filesystem'], {
      searchPath: args.searchPath,
      includeHidden: args.includeHidden,
      fileTypes: args.fileTypes,
      excludePatterns: args.excludePatterns,
      maxResults: args.maxResults
    });
    
    return {
      pattern: args.pattern,
      found: results.length,
      files: results.filter(r => r.type === 'file').map(r => ({
        path: r.path,
        name: r.name,
        size: r.metadata?.size,
        modified: r.metadata?.modified,
        relativePath: r.metadata?.relativePath
      })),
      directories: results.filter(r => r.type === 'directory').map(r => ({
        path: r.path,
        name: r.name,
        relativePath: r.metadata?.relativePath
      }))
    };
  }
};

export const searchContent: ToolDefinition = {
  name: 'search_content',
  description: 'Search for content within files (grep-like functionality)',
  inputSchema: z.object({
    query: z.string().describe('Text to search for'),
    searchPath: z.string().optional().describe('Base path for search'),
    fileTypes: z.array(z.string()).optional()
      .describe('File extensions to search in'),
    caseSensitive: z.boolean().optional().default(false),
    regex: z.boolean().optional().default(false)
      .describe('Treat query as regular expression'),
    contextLines: z.number().optional().default(2)
      .describe('Number of context lines to show'),
    maxResults: z.number().optional().default(50)
  }).strict() as any,
  handler: async (args) => {
    const results = await searchManager.search(args.query, ['content'], {
      searchPath: args.searchPath,
      fileTypes: args.fileTypes,
      caseSensitive: args.caseSensitive,
      regex: args.regex,
      contextLines: args.contextLines,
      maxResults: args.maxResults
    });
    
    return {
      query: args.query,
      totalMatches: results.length,
      matches: results.map(r => ({
        file: r.path,
        line: r.lineNumber,
        match: r.match,
        context: r.context
      }))
    };
  }
};

export const searchProcesses: ToolDefinition = {
  name: 'search_processes',
  description: 'Search for running processes',
  inputSchema: z.object({
    query: z.string().describe('Process name or command to search for')
  }).strict() as any,
  handler: async (args) => {
    const results = await searchManager.search(args.query, ['process'], {});
    
    return {
      query: args.query,
      found: results.length,
      processes: results.map(r => ({
        name: r.name,
        command: r.match,
        pid: r.metadata?.pid,
        user: r.metadata?.user,
        cpu: r.metadata?.cpu,
        memory: r.metadata?.memory,
        status: r.metadata?.status
      }))
    };
  }
};

export const searchEverything: ToolDefinition = {
  name: 'search_everything',
  description: 'Search across all available providers with a single query',
  inputSchema: z.object({
    query: z.string().describe('Universal search query'),
    options: z.object({
      includeFiles: z.boolean().optional().default(true),
      includeContent: z.boolean().optional().default(true),
      includeProcesses: z.boolean().optional().default(false),
      maxResultsPerType: z.number().optional().default(20)
    }).optional()
  }).strict() as any,
  handler: async (args) => {
    const { query, options = {} } = args;
    
    const providers = [];
    if (options.includeFiles) providers.push('filesystem');
    if (options.includeContent) providers.push('content');
    if (options.includeProcesses) providers.push('process');
    
    const results = await searchManager.search(query, providers, {
      maxResults: options.maxResultsPerType
    });
    
    return {
      query,
      totalResults: results.length,
      summary: {
        files: results.filter(r => r.type === 'file').length,
        directories: results.filter(r => r.type === 'directory').length,
        contentMatches: results.filter(r => r.type === 'content').length,
        processes: results.filter(r => r.type === 'process').length
      },
      topResults: results.slice(0, 10).map(r => ({
        type: r.type,
        name: r.name,
        path: r.path,
        match: r.match,
        score: r.score
      }))
    };
  }
};

// Export all universal search tools
export const universalSearchTools: ToolDefinition[] = [
  universalSearch,
  searchFiles,
  searchContent,
  searchProcesses,
  searchEverything
];