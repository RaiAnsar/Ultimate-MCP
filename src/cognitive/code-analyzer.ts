/**
 * Code Analysis for Cognitive Memory
 * Analyzes code to extract symbols, dependencies, and patterns
 */

import { parse } from '@babel/parser';
import { default as traverse } from '@babel/traverse';
import * as t from '@babel/types';
import { CodeAnalysisResult, CodeSymbol, CodeDependency, CodePattern } from './types.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('CodeAnalyzer');

export class CodeAnalyzer {
  /**
   * Analyze JavaScript/TypeScript code
   */
  async analyzeJavaScript(
    code: string,
    filePath: string
  ): Promise<CodeAnalysisResult> {
    const symbols: CodeSymbol[] = [];
    const dependencies: CodeDependency[] = [];
    const patterns: Map<string, CodePattern> = new Map();
    
    try {
      // Parse code into AST
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        sourceFilename: filePath
      });
      
      // Traverse AST to extract information
      traverse(ast, {
        // Functions
        FunctionDeclaration(path: any) {
          const node = path.node;
          if (node.id) {
            symbols.push({
              name: node.id.name,
              type: 'function',
              location: {
                file: filePath,
                line: node.loc?.start.line || 0,
                column: node.loc?.start.column || 0
              },
              signature: code.substring(node.start!, node.end!).split('\n')[0]
            });
          }
        },
        
        // Arrow functions assigned to variables
        VariableDeclarator(path: any) {
          if (t.isArrowFunctionExpression(path.node.init) || 
              t.isFunctionExpression(path.node.init)) {
            if (t.isIdentifier(path.node.id)) {
              symbols.push({
                name: path.node.id.name,
                type: 'function',
                location: {
                  file: filePath,
                  line: path.node.loc?.start.line || 0,
                  column: path.node.loc?.start.column || 0
                }
              });
            }
          }
        },
        
        // Classes
        ClassDeclaration(path: any) {
          const node = path.node;
          if (node.id) {
            symbols.push({
              name: node.id.name,
              type: 'class',
              location: {
                file: filePath,
                line: node.loc?.start.line || 0,
                column: node.loc?.start.column || 0
              }
            });
            
            // Check for inheritance
            if (node.superClass && t.isIdentifier(node.superClass)) {
              dependencies.push({
                source: node.id.name,
                target: node.superClass.name,
                type: 'extends'
              });
            }
          }
        },
        
        // Interfaces (TypeScript)
        TSInterfaceDeclaration(path: any) {
          const node = path.node;
          symbols.push({
            name: node.id.name,
            type: 'interface',
            location: {
              file: filePath,
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0
            }
          });
        },
        
        // Imports
        ImportDeclaration(path: any) {
          const node = path.node;
          const source = node.source.value;
          
          node.specifiers.forEach(spec => {
            if (t.isImportDefaultSpecifier(spec) || 
                t.isImportSpecifier(spec) || 
                t.isImportNamespaceSpecifier(spec)) {
              const name = spec.local.name;
              symbols.push({
                name,
                type: 'import',
                location: {
                  file: filePath,
                  line: node.loc?.start.line || 0,
                  column: node.loc?.start.column || 0
                }
              });
              
              dependencies.push({
                source: filePath,
                target: source,
                type: 'import'
              });
            }
          });
        },
        
        // Exports
        ExportNamedDeclaration(path: any) {
          const node = path.node;
          if (node.declaration) {
            if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
              symbols.push({
                name: node.declaration.id.name,
                type: 'export',
                location: {
                  file: filePath,
                  line: node.loc?.start.line || 0,
                  column: node.loc?.start.column || 0
                }
              });
            }
          }
        },
        
        // Pattern detection: try-catch blocks
        TryStatement(path: any) {
          const patternType = 'error-handling';
          if (!patterns.has(patternType)) {
            patterns.set(patternType, {
              type: patternType,
              description: 'Try-catch error handling blocks',
              occurrences: 0,
              locations: []
            });
          }
          
          const pattern = patterns.get(patternType)!;
          pattern.occurrences++;
          pattern.locations.push({
            file: filePath,
            line: path.node.loc?.start.line || 0
          });
        },
        
        // Pattern detection: async/await
        AwaitExpression(path: any) {
          const patternType = 'async-await';
          if (!patterns.has(patternType)) {
            patterns.set(patternType, {
              type: patternType,
              description: 'Async/await usage',
              occurrences: 0,
              locations: []
            });
          }
          
          const pattern = patterns.get(patternType)!;
          pattern.occurrences++;
          pattern.locations.push({
            file: filePath,
            line: path.node.loc?.start.line || 0
          });
        },
        
        // Pattern detection: Promise usage
        NewExpression(path: any) {
          if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'Promise') {
            const patternType = 'promise';
            if (!patterns.has(patternType)) {
              patterns.set(patternType, {
                type: patternType,
                description: 'Promise usage',
                occurrences: 0,
                locations: []
              });
            }
            
            const pattern = patterns.get(patternType)!;
            pattern.occurrences++;
            pattern.locations.push({
              file: filePath,
              line: path.node.loc?.start.line || 0
            });
          }
        }
      });
      
      // Calculate complexity
      const complexity = this.calculateComplexity(ast);
      
      return {
        symbols,
        dependencies,
        complexity,
        patterns: Array.from(patterns.values())
      };
    } catch (error) {
      logger.error(`Failed to analyze JavaScript code: ${error}`);
      return {
        symbols: [],
        dependencies: [],
        complexity: 0,
        patterns: []
      };
    }
  }
  
  /**
   * Analyze Python code
   */
  async analyzePython(
    code: string,
    filePath: string
  ): Promise<CodeAnalysisResult> {
    const symbols: CodeSymbol[] = [];
    const dependencies: CodeDependency[] = [];
    const patterns: CodePattern[] = [];
    
    // Simple regex-based analysis for Python
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      // Function definitions
      const funcMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          type: 'function',
          location: {
            file: filePath,
            line: index + 1,
            column: line.indexOf('def')
          },
          signature: line.trim()
        });
      }
      
      // Class definitions
      const classMatch = line.match(/^\s*class\s+(\w+)(?:\s*\(([^)]+)\))?\s*:/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          location: {
            file: filePath,
            line: index + 1,
            column: line.indexOf('class')
          }
        });
        
        // Check for inheritance
        if (classMatch[2]) {
          const baseClasses = classMatch[2].split(',').map(s => s.trim());
          baseClasses.forEach(base => {
            dependencies.push({
              source: classMatch[1],
              target: base,
              type: 'extends'
            });
          });
        }
      }
      
      // Import statements
      const importMatch = line.match(/^\s*(?:from\s+(\S+)\s+)?import\s+(.+)/);
      if (importMatch) {
        const module = importMatch[1] || '';
        const imports = importMatch[2].split(',').map(s => s.trim());
        
        imports.forEach(imp => {
          const name = imp.split(' as ')[0].trim();
          symbols.push({
            name,
            type: 'import',
            location: {
              file: filePath,
              line: index + 1,
              column: 0
            }
          });
          
          if (module) {
            dependencies.push({
              source: filePath,
              target: module,
              type: 'import'
            });
          }
        });
      }
    });
    
    // Simple complexity calculation
    const complexity = this.calculatePythonComplexity(code);
    
    return {
      symbols,
      dependencies,
      complexity,
      patterns
    };
  }
  
  /**
   * Calculate cyclomatic complexity for JavaScript/TypeScript
   */
  private calculateComplexity(ast: any): number {
    let complexity = 1; // Base complexity
    
    traverse(ast, {
      // Each decision point increases complexity
      IfStatement() { complexity++; },
      ConditionalExpression() { complexity++; },
      SwitchCase() { complexity++; },
      WhileStatement() { complexity++; },
      ForStatement() { complexity++; },
      ForInStatement() { complexity++; },
      ForOfStatement() { complexity++; },
      DoWhileStatement() { complexity++; },
      CatchClause() { complexity++; },
      LogicalExpression(path: any) {
        if (path.node.operator === '&&' || path.node.operator === '||') {
          complexity++;
        }
      }
    });
    
    return complexity;
  }
  
  /**
   * Calculate cyclomatic complexity for Python
   */
  private calculatePythonComplexity(code: string): number {
    let complexity = 1;
    
    const decisionKeywords = [
      /\bif\b/,
      /\belif\b/,
      /\bwhile\b/,
      /\bfor\b/,
      /\bexcept\b/,
      /\band\b/,
      /\bor\b/
    ];
    
    const lines = code.split('\n');
    lines.forEach(line => {
      decisionKeywords.forEach(keyword => {
        if (keyword.test(line)) {
          complexity++;
        }
      });
    });
    
    return complexity;
  }
  
  /**
   * Analyze code based on file extension
   */
  async analyzeCode(
    code: string,
    filePath: string
  ): Promise<CodeAnalysisResult> {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return this.analyzeJavaScript(code, filePath);
      
      case 'py':
        return this.analyzePython(code, filePath);
      
      default:
        logger.warn(`Unsupported file type for analysis: ${extension}`);
        return {
          symbols: [],
          dependencies: [],
          complexity: 0,
          patterns: []
        };
    }
  }
}