/**
 * Python Context Extractor
 * Extracts context from Python files
 */

import { BaseContextExtractor } from './base.js';
import {
  CodeContext,
  ContextExtractionOptions,
  FileContext,
  ImportInfo,
  ExportInfo as _ExportInfo,
  ClassInfo,
  FunctionInfo,
  MethodInfo as _MethodInfo,
  VariableInfo,
  ParameterInfo as _ParameterInfo
} from '../types.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('PythonExtractor');

export class PythonContextExtractor extends BaseContextExtractor {
  protected language = 'python';
  
  async extractContexts(
    filePath: string,
    content: string,
    options: ContextExtractionOptions
  ): Promise<CodeContext[]> {
    const contexts: CodeContext[] = [];
    const lines = content.split('\n');
    
    try {
      // Extract imports
      if (options.includeImports !== false) {
        contexts.push(...this.extractImportContexts(lines, filePath));
      }
      
      // Extract functions
      contexts.push(...this.extractFunctionContexts(lines, filePath, options));
      
      // Extract classes
      contexts.push(...this.extractClassContexts(lines, filePath, options));
      
      // Filter and sort
      const filtered = this.filterByRelevance(contexts, options.minRelevance);
      return this.sortByRelevance(filtered);
      
    } catch (error) {
      logger.error(`Failed to extract contexts from ${filePath}:`, error);
      return [{
        id: `${this.language}:full:${filePath}:1`,
        filePath,
        language: this.language,
        content,
        startLine: 1,
        endLine: lines.length,
        type: 'full',
        metadata: {}
      }];
    }
  }
  
  async extractFileContext(
    filePath: string,
    content: string
  ): Promise<FileContext> {
    const fileContext: FileContext = {
      filePath,
      language: this.language,
      imports: [],
      exports: [],
      classes: [],
      functions: [],
      variables: [],
      outline: {
        sections: [],
        totalLines: content.split('\n').length,
        hasTests: false,
        hasDocumentation: false
      }
    };
    
    const lines = content.split('\n');
    
    // Extract imports
    fileContext.imports = this.extractImports(lines);
    
    // Extract classes
    fileContext.classes = this.extractClasses(lines);
    
    // Extract functions
    fileContext.functions = this.extractFunctions(lines);
    
    // Extract module-level variables
    fileContext.variables = this.extractVariables(lines);
    
    // Build outline
    fileContext.outline = this.buildOutline(fileContext, lines);
    
    // Check for tests and docs
    fileContext.outline.hasTests = content.includes('def test_') || 
                                   content.includes('class Test') ||
                                   content.includes('unittest.') ||
                                   content.includes('pytest.');
    fileContext.outline.hasDocumentation = content.includes('"""') || content.includes("'''");
    
    return fileContext;
  }
  
  private extractImportContexts(lines: string[], filePath: string): CodeContext[] {
    const contexts: CodeContext[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const importMatch = line.match(/^\s*(from\s+\S+\s+)?import\s+.+/);
      
      if (importMatch) {
        const startLine = i + 1;
        let endLine = startLine;
        
        // Handle multi-line imports
        if (line.includes('(') && !line.includes(')')) {
          while (endLine < lines.length && !lines[endLine - 1].includes(')')) {
            endLine++;
          }
        }
        
        contexts.push({
          id: `${this.language}:import:${startLine}`,
          filePath,
          language: this.language,
          content: lines.slice(startLine - 1, endLine).join('\n'),
          startLine,
          endLine,
          type: 'import',
          metadata: {
            imports: this.parseImportStatement(lines.slice(startLine - 1, endLine).join(' '))
          },
          relevanceScore: 0.3
        });
      }
    }
    
    return contexts;
  }
  
  private extractFunctionContexts(
    lines: string[],
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext[] {
    const contexts: CodeContext[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/^(\s*)def\s+(\w+)\s*\(/);
      
      if (funcMatch && funcMatch[1].length === 0) { // Top-level function
        const indent = funcMatch[1];
        const funcName = funcMatch[2];
        const startLine = i + 1;
        
        // Find end of function
        let endLine = startLine;
        let inDocstring = false;
        let docstringDelimiter = '';
        
        for (let j = i + 1; j < lines.length; j++) {
          const currentLine = lines[j];
          const currentIndent = currentLine.match(/^(\s*)/)?.[1] || '';
          
          // Handle docstrings
          if (currentLine.trim().startsWith('"""') || currentLine.trim().startsWith("'''")) {
            if (!inDocstring) {
              inDocstring = true;
              docstringDelimiter = currentLine.trim().substring(0, 3);
            } else if (currentLine.trim().endsWith(docstringDelimiter)) {
              inDocstring = false;
            }
          }
          
          // Check if we've left the function
          if (!inDocstring && currentIndent.length <= indent.length && currentLine.trim().length > 0) {
            break;
          }
          
          endLine = j + 1;
        }
        
        // Extract docstring
        const docstring = options.includeDocstrings !== false
          ? this.extractPythonDocstring(lines, i + 1)
          : undefined;
        
        const functionContent = lines.slice(startLine - 1, endLine).join('\n');
        
        contexts.push({
          id: `${this.language}:function:${funcName}:${startLine}`,
          filePath,
          language: this.language,
          content: functionContent,
          startLine,
          endLine,
          type: 'function',
          metadata: {
            name: funcName,
            signature: line.trim(),
            docstring,
            complexity: this.calculateComplexity(functionContent),
            parameters: this.extractParameters(line).map(name => ({ 
              name, 
              type: undefined, 
              optional: false 
            }))
          },
          relevanceScore: 0.8
        });
      }
    }
    
    return contexts;
  }
  
  private extractClassContexts(
    lines: string[],
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext[] {
    const contexts: CodeContext[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classMatch = line.match(/^(\s*)class\s+(\w+)(?:\s*\(([^)]*)\))?\s*:/);
      
      if (classMatch && classMatch[1].length === 0) { // Top-level class
        const indent = classMatch[1];
        const className = classMatch[2];
        const baseClasses = classMatch[3];
        const startLine = i + 1;
        
        // Find end of class
        let endLine = startLine;
        for (let j = i + 1; j < lines.length; j++) {
          const currentLine = lines[j];
          const currentIndent = currentLine.match(/^(\s*)/)?.[1] || '';
          
          if (currentIndent.length <= indent.length && currentLine.trim().length > 0) {
            break;
          }
          endLine = j + 1;
        }
        
        // Extract docstring
        const docstring = options.includeDocstrings !== false
          ? this.extractPythonDocstring(lines, i + 1)
          : undefined;
        
        let classContent = lines.slice(startLine - 1, endLine).join('\n');
        
        // Strip method bodies if too large
        if (options.maxTokens && this.estimateTokens(classContent) > options.maxTokens * 0.7) {
          classContent = this.stripPythonMethodBodies(classContent);
        }
        
        contexts.push({
          id: `${this.language}:class:${className}:${startLine}`,
          filePath,
          language: this.language,
          content: classContent,
          startLine,
          endLine,
          type: 'class',
          metadata: {
            name: className,
            docstring,
            extends: baseClasses || undefined,
            methods: this.extractClassMethods(lines.slice(startLine - 1, endLine))
          },
          relevanceScore: 0.9
        });
        
        // Also extract method contexts
        if (!options.maxTokens || this.estimateTokens(classContent) < options.maxTokens * 0.5) {
          const methodContexts = this.extractMethodContexts(
            lines,
            startLine,
            endLine,
            className,
            filePath,
            options
          );
          contexts.push(...methodContexts);
        }
      }
    }
    
    return contexts;
  }
  
  private extractMethodContexts(
    lines: string[],
    classStart: number,
    classEnd: number,
    className: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext[] {
    const contexts: CodeContext[] = [];
    const classLines = lines.slice(classStart - 1, classEnd);
    
    for (let i = 0; i < classLines.length; i++) {
      const line = classLines[i];
      const methodMatch = line.match(/^(\s+)def\s+(\w+)\s*\(/);
      
      if (methodMatch) {
        const methodName = methodMatch[2];
        const actualLine = classStart + i;
        
        // Find method end
        let methodEnd = actualLine;
        const methodIndent = methodMatch[1];
        
        for (let j = i + 1; j < classLines.length; j++) {
          const currentLine = classLines[j];
          const currentIndent = currentLine.match(/^(\s*)/)?.[1] || '';
          
          if (currentIndent.length <= methodIndent.length && currentLine.trim().length > 0) {
            break;
          }
          methodEnd = classStart + j;
        }
        
        const methodContent = lines.slice(actualLine - 1, methodEnd).join('\n');
        
        contexts.push({
          id: `${this.language}:method:${className}.${methodName}:${actualLine}`,
          filePath,
          language: this.language,
          content: methodContent,
          startLine: actualLine,
          endLine: methodEnd,
          type: 'method',
          metadata: {
            name: `${className}.${methodName}`,
            signature: line.trim(),
            complexity: this.calculateComplexity(methodContent)
          },
          relevanceScore: 0.7
        });
      }
    }
    
    return contexts;
  }
  
  private extractImports(lines: string[]): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Standard import
      const importMatch = line.match(/^\s*import\s+(.+)/);
      if (importMatch) {
        const modules = importMatch[1].split(',').map(s => s.trim());
        for (const module of modules) {
          const parts = module.split(' as ');
          imports.push({
            source: parts[0],
            specifiers: [parts[1] || parts[0]],
            line: i + 1,
            type: 'default'
          });
        }
      }
      
      // From import
      const fromMatch = line.match(/^\s*from\s+(\S+)\s+import\s+(.+)/);
      if (fromMatch) {
        const source = fromMatch[1];
        const importsList = fromMatch[2];
        
        // Handle multi-line imports
        let fullImports = importsList;
        if (importsList.includes('(') && !importsList.includes(')')) {
          let j = i + 1;
          while (j < lines.length && !lines[j].includes(')')) {
            fullImports += ' ' + lines[j].trim();
            j++;
          }
          if (j < lines.length) {
            fullImports += ' ' + lines[j].trim();
          }
        }
        
        const specifiers = fullImports
          .replace(/[()]/g, '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        imports.push({
          source,
          specifiers,
          line: i + 1,
          type: 'named'
        });
      }
    }
    
    return imports;
  }
  
  private extractClasses(lines: string[]): ClassInfo[] {
    const classes: ClassInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classMatch = line.match(/^class\s+(\w+)(?:\s*\(([^)]*)\))?\s*:/);
      
      if (classMatch) {
        const className = classMatch[1];
        const baseClasses = classMatch[2];
        const startLine = i + 1;
        
        // Find class end
        let endLine = startLine;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/^(class|def)\s+/) && !lines[j].startsWith('    ')) {
            break;
          }
          endLine = j + 1;
        }
        
        const methods = this.extractClassMethods(lines.slice(i, endLine));
        const docstring = this.extractPythonDocstring(lines, i + 1);
        
        classes.push({
          name: className,
          startLine,
          endLine,
          methods: methods.map(name => ({
            name,
            startLine: 0,
            endLine: 0,
            parameters: [],
            async: false,
            generator: false,
            visibility: 'public',
            static: false,
            abstract: false,
            complexity: 1
          })),
          properties: [], // Python doesn't have explicit properties like TS
          extends: baseClasses ? baseClasses.split(',')[0].trim() : undefined,
          implements: baseClasses ? baseClasses.split(',').slice(1).map(s => s.trim()) : undefined,
          docstring
        });
      }
    }
    
    return classes;
  }
  
  private extractFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/^def\s+(\w+)\s*\(/);
      
      if (funcMatch) {
        const funcName = funcMatch[1];
        const startLine = i + 1;
        
        // Find function end
        let endLine = startLine;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/^(class|def)\s+/)) {
            break;
          }
          endLine = j + 1;
        }
        
        const parameters = this.extractParameters(line);
        const docstring = this.extractPythonDocstring(lines, i + 1);
        const isAsync = lines[i].includes('async def');
        const isGenerator = lines.slice(i, endLine).some(l => l.includes('yield'));
        
        functions.push({
          name: funcName,
          startLine,
          endLine,
          parameters: parameters.map(name => ({
            name,
            optional: name.includes('='),
            type: undefined,
            defaultValue: undefined
          })),
          async: isAsync,
          generator: isGenerator,
          docstring,
          complexity: this.calculateComplexity(lines.slice(i, endLine).join('\n'))
        });
      }
    }
    
    return functions;
  }
  
  private extractVariables(lines: string[]): VariableInfo[] {
    const variables: VariableInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for module-level assignments
      const assignMatch = line.match(/^([A-Z_]+)\s*=\s*.+/);
      if (assignMatch) {
        variables.push({
          name: assignMatch[1],
          type: undefined,
          scope: 'module',
          line: i + 1,
          constant: assignMatch[1] === assignMatch[1].toUpperCase()
        });
      }
    }
    
    return variables;
  }
  
  private extractPythonDocstring(lines: string[], startLine: number): string | undefined {
    if (startLine >= lines.length) return undefined;
    
    const line = lines[startLine - 1].trim();
    if (line.startsWith('"""') || line.startsWith("'''")) {
      const delimiter = line.substring(0, 3);
      
      // Single line docstring
      if (line.endsWith(delimiter) && line.length > 6) {
        return line.substring(3, line.length - 3);
      }
      
      // Multi-line docstring
      const docLines = [line.substring(3)];
      for (let i = startLine; i < lines.length; i++) {
        const currentLine = lines[i];
        if (currentLine.trim().endsWith(delimiter)) {
          docLines.push(currentLine.substring(0, currentLine.lastIndexOf(delimiter)));
          break;
        }
        docLines.push(currentLine);
      }
      
      return docLines.join('\n').trim();
    }
    
    return undefined;
  }
  
  private parseImportStatement(statement: string): string[] {
    const imports: string[] = [];
    
    if (statement.includes('from')) {
      const match = statement.match(/from\s+\S+\s+import\s+(.+)/);
      if (match) {
        imports.push(...match[1].split(',').map(s => s.trim()));
      }
    } else {
      const match = statement.match(/import\s+(.+)/);
      if (match) {
        imports.push(...match[1].split(',').map(s => s.trim()));
      }
    }
    
    return imports;
  }
  
  private extractParameters(functionDef: string): string[] {
    const match = functionDef.match(/\(([^)]*)\)/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0 && p !== 'self' && p !== 'cls')
      .map(p => p.split(':')[0].split('=')[0].trim());
  }
  
  private extractClassMethods(lines: string[]): string[] {
    const methods: string[] = [];
    
    for (const line of lines) {
      const match = line.match(/^\s+def\s+(\w+)\s*\(/);
      if (match) {
        methods.push(match[1]);
      }
    }
    
    return methods;
  }
  
  private stripPythonMethodBodies(classContent: string): string {
    const lines = classContent.split('\n');
    const result: string[] = [];
    let inMethod = false;
    let methodIndent = '';
    
    for (const line of lines) {
      const methodMatch = line.match(/^(\s+)def\s+/);
      
      if (methodMatch) {
        inMethod = true;
        methodIndent = methodMatch[1];
        result.push(line);
        
        // Include the next line if it's a docstring
        const nextIndex = lines.indexOf(line) + 1;
        if (nextIndex < lines.length) {
          const nextLine = lines[nextIndex];
          if (nextLine.trim().startsWith('"""') || nextLine.trim().startsWith("'''")) {
            result.push(nextLine);
          }
        }
        
        result.push(methodIndent + '    ...');
      } else if (inMethod) {
        const currentIndent = line.match(/^(\s*)/)?.[1] || '';
        if (currentIndent.length <= methodIndent.length && line.trim().length > 0) {
          inMethod = false;
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }
    
    return result.join('\n');
  }
  
  private buildOutline(fileContext: FileContext, lines: string[]): any {
    const sections = [];
    
    if (fileContext.imports.length > 0) {
      sections.push({
        type: 'imports',
        startLine: fileContext.imports[0].line,
        endLine: fileContext.imports[fileContext.imports.length - 1].line,
        items: fileContext.imports.map(i => i.source)
      });
    }
    
    if (fileContext.variables.filter(v => v.constant).length > 0) {
      const constants = fileContext.variables.filter(v => v.constant);
      sections.push({
        type: 'constants',
        startLine: Math.min(...constants.map(c => c.line)),
        endLine: Math.max(...constants.map(c => c.line)),
        items: constants.map(c => c.name)
      });
    }
    
    if (fileContext.classes.length > 0) {
      sections.push({
        type: 'classes',
        startLine: Math.min(...fileContext.classes.map(c => c.startLine)),
        endLine: Math.max(...fileContext.classes.map(c => c.endLine)),
        items: fileContext.classes.map(c => c.name)
      });
    }
    
    if (fileContext.functions.length > 0) {
      sections.push({
        type: 'functions',
        startLine: Math.min(...fileContext.functions.map(f => f.startLine)),
        endLine: Math.max(...fileContext.functions.map(f => f.endLine)),
        items: fileContext.functions.map(f => f.name)
      });
    }
    
    // Check for test section
    const testFunctions = fileContext.functions.filter(f => f.name.startsWith('test_'));
    if (testFunctions.length > 0) {
      sections.push({
        type: 'tests',
        startLine: Math.min(...testFunctions.map(f => f.startLine)),
        endLine: Math.max(...testFunctions.map(f => f.endLine)),
        items: testFunctions.map(f => f.name)
      });
    }
    
    return {
      sections,
      totalLines: lines.length,
      hasTests: testFunctions.length > 0,
      hasDocumentation: fileContext.functions.some(f => f.docstring) || 
                       fileContext.classes.some(c => c.docstring)
    };
  }
}