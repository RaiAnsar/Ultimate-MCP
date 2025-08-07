/**
 * Base Context Extractor
 * Common functionality for all language-specific extractors
 */

import { CodeContext, ContextExtractionOptions, FileContext } from '../types.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ContextExtractor');

export abstract class BaseContextExtractor {
  protected abstract language: string;
  
  /**
   * Extract contexts from code
   */
  abstract extractContexts(
    filePath: string,
    content: string,
    options: ContextExtractionOptions
  ): Promise<CodeContext[]>;
  
  /**
   * Extract file-level context information
   */
  abstract extractFileContext(
    filePath: string,
    content: string
  ): Promise<FileContext>;
  
  /**
   * Estimate token count for content
   */
  protected estimateTokens(content: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }
  
  /**
   * Extract context around a specific line
   */
  protected extractAroundLine(
    content: string,
    targetLine: number,
    contextLines: number = 5
  ): { content: string; startLine: number; endLine: number } {
    const lines = content.split('\n');
    const startLine = Math.max(1, targetLine - contextLines);
    const endLine = Math.min(lines.length, targetLine + contextLines);
    
    const contextContent = lines
      .slice(startLine - 1, endLine)
      .join('\n');
    
    return { content: contextContent, startLine, endLine };
  }
  
  /**
   * Extract function/method context
   */
  protected extractFunctionContext(
    content: string,
    functionName: string,
    startLine: number,
    endLine: number
  ): CodeContext {
    const lines = content.split('\n');
    const functionContent = lines.slice(startLine - 1, endLine).join('\n');
    
    return {
      id: `${this.language}:function:${functionName}:${startLine}`,
      filePath: '',
      language: this.language,
      content: functionContent,
      startLine,
      endLine,
      type: 'function',
      metadata: {
        name: functionName,
        complexity: this.calculateComplexity(functionContent)
      }
    };
  }
  
  /**
   * Extract class context
   */
  protected extractClassContext(
    content: string,
    className: string,
    startLine: number,
    endLine: number,
    options: ContextExtractionOptions
  ): CodeContext {
    const lines = content.split('\n');
    let classContent = lines.slice(startLine - 1, endLine).join('\n');
    
    // Optionally strip method implementations to save tokens
    if (options.maxTokens && this.estimateTokens(classContent) > options.maxTokens * 0.5) {
      classContent = this.stripMethodBodies(classContent);
    }
    
    return {
      id: `${this.language}:class:${className}:${startLine}`,
      filePath: '',
      language: this.language,
      content: classContent,
      startLine,
      endLine,
      type: 'class',
      metadata: {
        name: className
      }
    };
  }
  
  /**
   * Calculate cyclomatic complexity
   */
  protected calculateComplexity(code: string): number {
    let complexity = 1;
    
    // Common control flow keywords
    const controlFlowPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*[^:]+\s*:/g, // ternary operator
      /\&\&/g,
      /\|\|/g
    ];
    
    for (const pattern of controlFlowPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }
  
  /**
   * Strip method bodies to reduce token count
   */
  protected stripMethodBodies(classContent: string): string {
    // This is a simplified version - real implementation would use AST
    const lines = classContent.split('\n');
    const result: string[] = [];
    let inMethod = false;
    let braceCount = 0;
    
    for (const line of lines) {
      if (inMethod) {
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;
        
        if (braceCount === 0) {
          inMethod = false;
          result.push('    // ... implementation');
          result.push(line);
        }
      } else {
        result.push(line);
        
        // Simple method detection
        if (line.match(/^\s*(public|private|protected|static|async)?\s*\w+\s*\([^)]*\)\s*{/) ||
            line.match(/^\s*\w+\s*\([^)]*\)\s*{/)) {
          inMethod = true;
          braceCount = 1;
        }
      }
    }
    
    return result.join('\n');
  }
  
  /**
   * Extract docstring/comments
   */
  protected extractDocstring(content: string, startLine: number): string | undefined {
    const lines = content.split('\n');
    const commentLines: string[] = [];
    
    // Look backwards from startLine for comments
    for (let i = startLine - 2; i >= 0; i--) {
      const line = lines[i].trim();
      
      if (line.startsWith('/**') || line.startsWith('/*') || 
          line.startsWith('*') || line.startsWith('//') ||
          line.startsWith('#')) {
        commentLines.unshift(line);
      } else if (line.length > 0) {
        break;
      }
    }
    
    return commentLines.length > 0 ? commentLines.join('\n') : undefined;
  }
  
  /**
   * Filter contexts based on relevance
   */
  protected filterByRelevance(
    contexts: CodeContext[],
    minRelevance: number = 0.5
  ): CodeContext[] {
    return contexts.filter(ctx => (ctx.relevanceScore || 1) >= minRelevance);
  }
  
  /**
   * Sort contexts by relevance
   */
  protected sortByRelevance(contexts: CodeContext[]): CodeContext[] {
    return contexts.sort((a, b) => 
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
  }
}