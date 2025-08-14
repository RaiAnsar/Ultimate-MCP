/**
 * Large Context Analysis MCP Tools (Inspired by Consult7)
 * 
 * These tools enable analysis of massive codebases and file collections
 * beyond typical context window limitations using large context models
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FileCollector } from '../large-context/file-collector.js';
import { LargeContextAnalyzer } from '../large-context/large-context-analyzer.js';
import { DirectoryTree, ProjectSummary } from '../large-context/types.js';

const fileCollector = new FileCollector();
const largeContextAnalyzer = new LargeContextAnalyzer();

/**
 * Analyze entire codebases with large context models
 */
export const analyze_large_codebase: Tool = {
  name: 'analyze_large_codebase',
  description: `Analyze entire codebases or large file collections beyond typical context limits using models with 1-2M token windows.

Perfect for:
- Understanding overall architecture
- Finding patterns across thousands of files
- Answering questions about entire projects
- Code reviews at scale
- Migration planning
- Technical debt assessment

Supports multiple strategies:
- single-shot: Fit everything in one context (best for <1M tokens)
- chunked: Split and analyze in chunks, then combine
- hierarchical: Analyze files → directories → project
- map-reduce: Process each file, then synthesize

Automatically selects the best model based on context size and cost.`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Root directory to analyze'
      },
      pattern: {
        type: 'string',
        description: 'Regex pattern to match files (e.g., ".*\\.ts$" for TypeScript)',
        default: '.*\\.(js|jsx|ts|tsx|py|java|go|rs|cpp|c|cs|rb|php|swift|kt|scala|r|m|lua|pl|sh)$'
      },
      query: {
        type: 'string',
        description: 'What to analyze or find in the codebase'
      },
      strategy: {
        type: 'string',
        enum: ['auto', 'single-shot', 'chunked', 'hierarchical', 'map-reduce'],
        description: 'Analysis strategy (auto selects based on size)',
        default: 'auto'
      },
      model: {
        type: 'string',
        description: 'Specific model to use (e.g., "google/gemini-2.5-flash")',
        enum: [
          'auto',
          'google/gemini-2.5-flash',
          'google/gemini-2.5-pro',
          'anthropic/claude-3-opus',
          'openai/gpt-4-128k',
          'qwen/qwen-2.5-72b-turbo'
        ],
        default: 'auto'
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum directory depth to traverse',
        default: -1
      },
      exclude: {
        type: 'array',
        description: 'Patterns to exclude',
        items: { type: 'string' },
        default: ['node_modules', '.git', 'dist', 'build']
      },
      outputFormat: {
        type: 'string',
        enum: ['text', 'json', 'markdown'],
        description: 'Output format',
        default: 'markdown'
      },
      includeReasoning: {
        type: 'boolean',
        description: 'Include AI reasoning process',
        default: false
      }
    },
    required: ['rootDir', 'query']
  },
  handler: async (args: any) => {
    try {
      const result = await largeContextAnalyzer.collectAndAnalyze(
        {
          rootDir: args.rootDir,
          pattern: args.pattern,
          maxDepth: args.maxDepth,
          exclude: args.exclude,
          includeMetadata: true,
          sortBy: 'path'
        },
        args.query,
        {
          strategy: args.strategy === 'auto' ? undefined : args.strategy,
          model: args.model === 'auto' ? undefined : args.model,
          outputFormat: args.outputFormat,
          includeReasoning: args.includeReasoning,
          temperature: 0.1
        }
      );
      
      return {
        content: [{
          type: 'text',
          text: typeof result.result === 'string' 
            ? result.result 
            : JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Generate a directory tree structure
 */
export const generate_directory_tree: Tool = {
  name: 'generate_directory_tree',
  description: `Generate a visual directory tree structure of a project.

Features:
- ASCII tree visualization
- File counts and sizes
- Language detection
- Configurable depth
- Pattern filtering
- Include/exclude hidden files

Perfect for:
- Project documentation
- README files
- Understanding project structure
- Onboarding new developers`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Root directory to generate tree from'
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth to traverse',
        default: 5
      },
      includeFiles: {
        type: 'boolean',
        description: 'Include files in tree (not just directories)',
        default: true
      },
      pattern: {
        type: 'string',
        description: 'Regex pattern to filter files'
      },
      format: {
        type: 'string',
        enum: ['ascii', 'markdown', 'json'],
        description: 'Output format',
        default: 'ascii'
      }
    },
    required: ['rootDir']
  },
  handler: async (args: any) => {
    try {
      const tree = await fileCollector.generateDirectoryTree(
        args.rootDir,
        {
          maxDepth: args.maxDepth,
          includeFiles: args.includeFiles,
          pattern: args.pattern
        }
      );
      
      let output: string;
      if (args.format === 'json') {
        output = JSON.stringify(tree, null, 2);
      } else if (args.format === 'markdown') {
        output = formatTreeAsMarkdown(tree);
      } else {
        output = formatTreeAsAscii(tree);
      }
      
      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Collect files matching patterns for manual analysis
 */
export const collect_code_context: Tool = {
  name: 'collect_code_context',
  description: `Collect files matching specific patterns into a single context.

Use cases:
- Preparing context for AI analysis
- Creating focused code reviews
- Extracting specific subsystems
- Building documentation contexts
- Sharing code snippets

Supports various output formats and smart filtering.`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Root directory to collect from'
      },
      pattern: {
        type: 'string',
        description: 'Regex pattern to match files (e.g., ".*Controller\\.java$")'
      },
      maxFileSize: {
        type: 'number',
        description: 'Maximum file size in MB to include',
        default: 10
      },
      exclude: {
        type: 'array',
        description: 'Patterns to exclude',
        items: { type: 'string' }
      },
      format: {
        type: 'string',
        enum: ['plain', 'structured', 'xml', 'json'],
        description: 'Output format',
        default: 'structured'
      },
      sortBy: {
        type: 'string',
        enum: ['path', 'size', 'modified', 'name'],
        description: 'How to sort files',
        default: 'path'
      },
      includeMetadata: {
        type: 'boolean',
        description: 'Include file metadata',
        default: true
      }
    },
    required: ['rootDir', 'pattern']
  },
  handler: async (args: any) => {
    try {
      const collection = await fileCollector.collect({
        rootDir: args.rootDir,
        pattern: args.pattern,
        maxFileSize: args.maxFileSize,
        exclude: args.exclude,
        format: args.format,
        sortBy: args.sortBy,
        includeMetadata: args.includeMetadata
      });
      
      const formatted = fileCollector.formatAsContext(collection, args.format);
      
      const summary = `Collected ${collection.totalFiles} files (${(collection.totalSize / 1024 / 1024).toFixed(2)} MB, ~${collection.totalTokens} tokens)

Languages: ${Object.entries(collection.metadata?.languages || {})
  .map(([lang, count]) => `${lang} (${count})`)
  .join(', ')}

Top directories: ${collection.metadata?.directories.slice(0, 5).join(', ')}`;

      return {
        content: [{
          type: 'text',
          text: `${summary}\n\n${formatted}`
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Analyze project architecture and structure
 */
export const analyze_project_structure: Tool = {
  name: 'analyze_project_structure',
  description: `Analyze overall project structure, architecture, and organization.

Discovers:
- Project type and framework
- Directory organization
- Main components and modules
- Dependencies and relationships
- Entry points
- Test coverage
- Configuration patterns

Provides actionable insights for architecture decisions.`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Project root directory'
      },
      deepAnalysis: {
        type: 'boolean',
        description: 'Perform deep analysis of file contents',
        default: true
      },
      includeTests: {
        type: 'boolean',
        description: 'Include test file analysis',
        default: true
      },
      includeDocs: {
        type: 'boolean',
        description: 'Include documentation analysis',
        default: true
      }
    },
    required: ['rootDir']
  },
  handler: async (args: any) => {
    try {
      // First, generate directory tree
      const tree = await fileCollector.generateDirectoryTree(
        args.rootDir,
        {
          maxDepth: 3,
          includeFiles: true
        }
      );
      
      // Collect key files for analysis
      const patterns = [
        'package\\.json$',
        'tsconfig\\.json$',
        'webpack\\.config\\.(js|ts)$',
        'vite\\.config\\.(js|ts)$',
        '(README|readme)\\.(md|txt)$',
        'Dockerfile$',
        'docker-compose\\.ya?ml$',
        '\\.(eslintrc|prettierrc)',
        'jest\\.config\\.(js|ts)$'
      ];
      
      const configFiles = await Promise.all(
        patterns.map(pattern => 
          fileCollector.collect({
            rootDir: args.rootDir,
            pattern,
            maxDepth: 2
          })
        )
      );
      
      // Analyze with AI if deep analysis requested
      let architectureAnalysis = null;
      if (args.deepAnalysis) {
        const mainFiles = await fileCollector.collect({
          rootDir: args.rootDir,
          pattern: '\\.(js|ts|jsx|tsx|py|java|go)$',
          maxDepth: 3,
          maxFileSize: 1,
          sortBy: 'size'
        });
        
        const query = `Analyze this project structure and provide:
1. Project type and main framework/technologies
2. Architecture pattern (MVC, microservices, etc.)
3. Key components and their relationships
4. Development workflow and tooling
5. Potential improvements or concerns`;

        architectureAnalysis = await largeContextAnalyzer.analyze({
          collection: mainFiles,
          query,
          strategy: mainFiles.totalTokens! > 100000 ? 'hierarchical' : 'single-shot',
          outputFormat: 'json'
        });
      }
      
      // Build project summary
      const summary: ProjectSummary = {
        structure: tree,
        statistics: calculateProjectStats(tree),
        analysis: architectureAnalysis?.result
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Find patterns across large codebases
 */
export const find_codebase_patterns: Tool = {
  name: 'find_codebase_patterns',
  description: `Find patterns, anti-patterns, or specific implementations across entire codebases.

Examples:
- "Find all API endpoints and their authentication methods"
- "Identify all database queries and check for SQL injection risks"
- "Find all error handling patterns"
- "Locate all hardcoded configurations"
- "Find duplicate code patterns"

Uses large context models to understand semantic patterns, not just text matching.`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Root directory to search'
      },
      searchQuery: {
        type: 'string',
        description: 'What pattern or implementation to find'
      },
      filePattern: {
        type: 'string',
        description: 'File pattern to search in',
        default: '.*\\.(js|jsx|ts|tsx|py|java|go|rs)$'
      },
      semanticSearch: {
        type: 'boolean',
        description: 'Use AI for semantic understanding (not just text matching)',
        default: true
      },
      includeContext: {
        type: 'boolean',
        description: 'Include surrounding code context',
        default: true
      },
      maxResults: {
        type: 'number',
        description: 'Maximum results to return',
        default: 50
      }
    },
    required: ['rootDir', 'searchQuery']
  },
  handler: async (args: any) => {
    try {
      // Collect relevant files
      const collection = await fileCollector.collect({
        rootDir: args.rootDir,
        pattern: args.filePattern,
        includeMetadata: true
      });
      
      let query = args.searchQuery;
      if (args.semanticSearch) {
        query = `Find all instances of: ${args.searchQuery}
        
For each match, provide:
1. File path and line numbers
2. The matching code
3. Brief explanation of what it does
4. Any potential issues or improvements

Return results as a JSON array.`;
      }
      
      const result = await largeContextAnalyzer.analyze({
        collection,
        query,
        strategy: collection.totalTokens! > 500000 ? 'map-reduce' : 'chunked',
        outputFormat: 'json',
        temperature: 0
      });
      
      return {
        content: [{
          type: 'text',
          text: typeof result.result === 'string' 
            ? result.result 
            : JSON.stringify(result.result, null, 2)
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Generate project documentation
 */
export const generate_project_docs: Tool = {
  name: 'generate_project_docs',
  description: `Automatically generate comprehensive project documentation by analyzing the entire codebase.

Generates:
- Project overview and architecture
- API documentation
- Component documentation
- Setup and installation guides
- Configuration documentation
- Contribution guidelines

Output in Markdown format ready for README or documentation sites.`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Project root directory'
      },
      sections: {
        type: 'array',
        description: 'Documentation sections to generate',
        items: {
          type: 'string',
          enum: ['overview', 'architecture', 'api', 'setup', 'configuration', 'contributing', 'components']
        },
        default: ['overview', 'architecture', 'setup']
      },
      style: {
        type: 'string',
        enum: ['concise', 'detailed', 'technical'],
        description: 'Documentation style',
        default: 'detailed'
      },
      includeExamples: {
        type: 'boolean',
        description: 'Include code examples',
        default: true
      }
    },
    required: ['rootDir']
  },
  handler: async (args: any) => {
    try {
      // Collect all relevant files
      const codeFiles = await fileCollector.collect({
        rootDir: args.rootDir,
        pattern: '.*\\.(js|jsx|ts|tsx|py|java|go|rs|md|json|ya?ml)$',
        exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
        includeMetadata: true
      });
      
      const sections = args.sections.join(', ');
      const query = `Generate comprehensive project documentation with the following sections: ${sections}

Style: ${args.style}
Include examples: ${args.includeExamples}

Analyze the codebase and create well-structured Markdown documentation that would help new developers understand and work with this project.

Focus on:
- Clear explanations
- Practical examples
- Architecture diagrams (as ASCII art or Mermaid)
- Step-by-step guides
- Best practices specific to this project`;

      const result = await largeContextAnalyzer.analyze({
        collection: codeFiles,
        query,
        strategy: 'hierarchical',
        outputFormat: 'markdown',
        temperature: 0.3
      });
      
      return {
        content: [{
          type: 'text',
          text: result.result
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Estimate large context analysis cost
 */
export const estimate_analysis_cost: Tool = {
  name: 'estimate_analysis_cost',
  description: `Estimate the cost of analyzing a codebase with large context models.

Provides:
- Token count estimation
- Recommended model based on size
- Cost breakdown by model
- Strategy recommendation
- Processing time estimate`,
  inputSchema: {
    type: 'object',
    properties: {
      rootDir: {
        type: 'string',
        description: 'Root directory to analyze'
      },
      pattern: {
        type: 'string',
        description: 'File pattern to include',
        default: '.*\\.(js|jsx|ts|tsx|py|java|go|rs)$'
      },
      models: {
        type: 'array',
        description: 'Models to compare costs',
        items: { type: 'string' },
        default: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'anthropic/claude-3-opus']
      }
    },
    required: ['rootDir']
  },
  handler: async (args: any) => {
    try {
      // Collect files to estimate
      const collection = await fileCollector.collect({
        rootDir: args.rootDir,
        pattern: args.pattern,
        includeMetadata: true,
        format: 'json'
      });
      
      const estimates = {
        fileCount: collection.totalFiles,
        totalSize: `${(collection.totalSize / 1024 / 1024).toFixed(2)} MB`,
        estimatedTokens: collection.totalTokens,
        languages: collection.metadata?.languages,
        recommendations: [] as any[],
        costEstimates: [] as any[]
      };
      
      // Get model costs
      const { LARGE_CONTEXT_MODELS } = await import('../large-context/types.js');
      
      for (const modelName of args.models) {
        const model = LARGE_CONTEXT_MODELS.find(m => m.name === modelName);
        if (model) {
          const inputCost = (collection.totalTokens! / 1000) * model.costPer1kTokens.input;
          const outputCost = (collection.totalTokens! * 0.1 / 1000) * model.costPer1kTokens.output;
          
          estimates.costEstimates.push({
            model: model.name,
            contextWindow: model.contextWindow,
            canProcessInOneShot: collection.totalTokens! < model.contextWindow * 0.8,
            estimatedCost: `$${(inputCost + outputCost).toFixed(2)}`,
            breakdown: {
              input: `$${inputCost.toFixed(2)}`,
              output: `$${outputCost.toFixed(2)}`
            }
          });
        }
      }
      
      // Add recommendations
      if (collection.totalTokens! < 500000) {
        estimates.recommendations.push('Use google/gemini-2.5-flash for cost-effective analysis');
      } else if (collection.totalTokens! < 1500000) {
        estimates.recommendations.push('Consider google/gemini-2.5-pro for comprehensive single-shot analysis');
      } else {
        estimates.recommendations.push('Use hierarchical or map-reduce strategy for this large codebase');
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(estimates, null, 2)
        }]
      };
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Helper functions
 */

function formatTreeAsAscii(tree: DirectoryTree, prefix = '', isLast = true): string {
  let result = '';
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';
  
  result += prefix + connector + tree.name;
  
  if (tree.type === 'file' && tree.size) {
    result += ` (${formatFileSize(tree.size)})`;
  }
  if (tree.language) {
    result += ` [${tree.language}]`;
  }
  result += '\n';
  
  if (tree.children) {
    const childCount = tree.children.length;
    tree.children.forEach((child, index) => {
      result += formatTreeAsAscii(
        child,
        prefix + extension,
        index === childCount - 1
      );
    });
  }
  
  return result;
}

function formatTreeAsMarkdown(tree: DirectoryTree, depth = 0): string {
  let result = '';
  const indent = '  '.repeat(depth);
  
  result += indent + '- ' + tree.name;
  
  if (tree.type === 'file' && tree.size) {
    result += ` *(${formatFileSize(tree.size)})*`;
  }
  if (tree.language) {
    result += ` \`${tree.language}\``;
  }
  result += '\n';
  
  if (tree.children) {
    tree.children.forEach(child => {
      result += formatTreeAsMarkdown(child, depth + 1);
    });
  }
  
  return result;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function calculateProjectStats(tree: DirectoryTree): ProjectSummary['statistics'] {
  const stats = {
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    fileTypes: {} as Record<string, number>,
    languages: {} as Record<string, number>
  };
  
  function traverse(node: DirectoryTree) {
    if (node.type === 'file') {
      stats.totalFiles++;
      stats.totalSize += node.size || 0;
      
      if (node.extension) {
        stats.fileTypes[node.extension] = (stats.fileTypes[node.extension] || 0) + 1;
      }
      
      if (node.language) {
        stats.languages[node.language] = (stats.languages[node.language] || 0) + 1;
      }
    } else {
      stats.totalDirectories++;
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(tree);
  return stats;
}

// Export all tools
export const largeContextTools = [
  analyze_large_codebase,
  generate_directory_tree,
  collect_code_context,
  analyze_project_structure,
  find_codebase_patterns,
  generate_project_docs,
  estimate_analysis_cost
];