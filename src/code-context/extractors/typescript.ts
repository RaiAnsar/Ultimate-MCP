/**
 * TypeScript/JavaScript Context Extractor
 * Extracts context from TypeScript and JavaScript files
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { BaseContextExtractor } from './base.js';
import {
  CodeContext,
  ContextExtractionOptions,
  FileContext,
  ImportInfo,
  ExportInfo,
  ClassInfo,
  FunctionInfo,
  MethodInfo,
  VariableInfo,
  ParameterInfo,
  PropertyInfo
} from '../types.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('TypeScriptExtractor');

export class TypeScriptContextExtractor extends BaseContextExtractor {
  protected language = 'typescript';
  
  async extractContexts(
    filePath: string,
    content: string,
    options: ContextExtractionOptions
  ): Promise<CodeContext[]> {
    const contexts: CodeContext[] = [];
    
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        sourceFilename: filePath
      });
      
      // Extract different types of contexts
      if (options.includeImports !== false) {
        contexts.push(...this.extractImportContexts(ast, content, filePath));
      }
      
      contexts.push(...this.extractFunctionContexts(ast, content, filePath, options));
      contexts.push(...this.extractClassContexts(ast, content, filePath, options));
      
      if (options.includeExports !== false) {
        contexts.push(...this.extractExportContexts(ast, content, filePath));
      }
      
      // Filter and sort by relevance
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
        endLine: content.split('\n').length,
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
    
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        sourceFilename: filePath
      });
      
      traverse(ast, {
        ImportDeclaration: (path) => {
          const node = path.node;
          const importInfo = this.extractImportInfo(node);
          fileContext.imports.push(importInfo);
        },
        
        ExportNamedDeclaration: (path) => {
          const node = path.node;
          const exportInfo = this.extractExportInfo(node);
          if (exportInfo) fileContext.exports.push(exportInfo);
        },
        
        ExportDefaultDeclaration: (path) => {
          fileContext.exports.push({
            name: 'default',
            type: 'default',
            line: path.node.loc?.start.line || 0
          });
        },
        
        ClassDeclaration: (path) => {
          const classInfo = this.extractClassInfo(path.node, content);
          if (classInfo) fileContext.classes.push(classInfo);
        },
        
        FunctionDeclaration: (path) => {
          if (!this.isInsideClass(path)) {
            const funcInfo = this.extractFunctionInfo(path.node, content);
            if (funcInfo) fileContext.functions.push(funcInfo);
          }
        },
        
        VariableDeclaration: (path) => {
          if (!this.isInsideFunction(path) && !this.isInsideClass(path)) {
            const varInfos = this.extractVariableInfo(path.node);
            fileContext.variables.push(...varInfos);
          }
        }
      });
      
      // Build outline
      fileContext.outline = this.buildOutline(fileContext, content);
      
      // Check for tests and docs
      fileContext.outline.hasTests = content.includes('test(') || 
                                     content.includes('describe(') ||
                                     content.includes('it(');
      fileContext.outline.hasDocumentation = content.includes('/**');
      
    } catch (error) {
      logger.error(`Failed to extract file context from ${filePath}:`, error);
    }
    
    return fileContext;
  }
  
  private extractImportContexts(ast: any, content: string, filePath: string): CodeContext[] {
    const contexts: CodeContext[] = [];
    const lines = content.split('\n');
    
    traverse(ast, {
      ImportDeclaration: (path) => {
        const node = path.node;
        const startLine = node.loc?.start.line || 1;
        const endLine = node.loc?.end.line || startLine;
        
        contexts.push({
          id: `${this.language}:import:${node.source.value}:${startLine}`,
          filePath,
          language: this.language,
          content: lines.slice(startLine - 1, endLine).join('\n'),
          startLine,
          endLine,
          type: 'import',
          metadata: {
            name: node.source.value,
            imports: node.specifiers.map((spec: any) => spec.local.name)
          },
          relevanceScore: 0.3 // Imports have lower relevance
        });
      }
    });
    
    return contexts;
  }
  
  private extractFunctionContexts(
    ast: any,
    content: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext[] {
    const contexts: CodeContext[] = [];
    
    traverse(ast, {
      FunctionDeclaration: (path) => {
        if (!this.isInsideClass(path)) {
          const node = path.node;
          if (node.id) {
            const context = this.createFunctionContext(node, content, filePath, options);
            contexts.push(context);
          }
        }
      },
      
      ArrowFunctionExpression: (path) => {
        if (!this.isInsideClass(path) && t.isVariableDeclarator(path.parent)) {
          const parent = path.parent;
          if (t.isIdentifier(parent.id)) {
            const node = path.node;
            const context = this.createArrowFunctionContext(
              parent.id.name,
              node,
              parent,
              content,
              filePath,
              options
            );
            contexts.push(context);
          }
        }
      }
    });
    
    return contexts;
  }
  
  private extractClassContexts(
    ast: any,
    content: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext[] {
    const contexts: CodeContext[] = [];
    
    traverse(ast, {
      ClassDeclaration: (path) => {
        const node = path.node;
        if (node.id) {
          const context = this.createClassContext(node, content, filePath, options);
          contexts.push(context);
          
          // Also extract method contexts if not too large
          const methodContexts = this.extractMethodContexts(node, content, filePath, options);
          contexts.push(...methodContexts);
        }
      }
    });
    
    return contexts;
  }
  
  private extractExportContexts(ast: any, content: string, filePath: string): CodeContext[] {
    const contexts: CodeContext[] = [];
    const lines = content.split('\n');
    
    traverse(ast, {
      ExportNamedDeclaration: (path) => {
        const node = path.node;
        if (node.loc) {
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          
          contexts.push({
            id: `${this.language}:export:${startLine}`,
            filePath,
            language: this.language,
            content: lines.slice(startLine - 1, endLine).join('\n'),
            startLine,
            endLine,
            type: 'block',
            metadata: {
              exports: node.specifiers?.map((spec: any) => spec.exported.name) || []
            },
            relevanceScore: 0.4
          });
        }
      }
    });
    
    return contexts;
  }
  
  private createFunctionContext(
    node: any,
    content: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext {
    const startLine = node.loc?.start.line || 1;
    const endLine = node.loc?.end.line || startLine;
    const lines = content.split('\n');
    
    let functionContent = lines.slice(startLine - 1, endLine).join('\n');
    
    // Include docstring if requested
    const docstring = options.includeDocstrings !== false
      ? this.extractDocstring(content, startLine)
      : undefined;
    
    if (docstring) {
      const docLines = docstring.split('\n');
      functionContent = docLines.join('\n') + '\n' + functionContent;
    }
    
    return {
      id: `${this.language}:function:${node.id.name}:${startLine}`,
      filePath,
      language: this.language,
      content: functionContent,
      startLine: docstring ? startLine - docstring.split('\n').length : startLine,
      endLine,
      type: 'function',
      metadata: {
        name: node.id.name,
        signature: this.buildFunctionSignature(node),
        docstring,
        complexity: this.calculateComplexity(functionContent),
        parameters: node.params.map((p: any) => this.getParamName(p))
      },
      relevanceScore: 0.8
    };
  }
  
  private createArrowFunctionContext(
    name: string,
    node: any,
    parent: any,
    content: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext {
    const startLine = parent.loc?.start.line || 1;
    const endLine = node.loc?.end.line || startLine;
    const lines = content.split('\n');
    
    const functionContent = lines.slice(startLine - 1, endLine).join('\n');
    
    return {
      id: `${this.language}:function:${name}:${startLine}`,
      filePath,
      language: this.language,
      content: functionContent,
      startLine,
      endLine,
      type: 'function',
      metadata: {
        name,
        signature: `const ${name} = ${this.buildArrowSignature(node)}`,
        complexity: this.calculateComplexity(functionContent),
        parameters: node.params.map((p: any) => this.getParamName(p))
      },
      relevanceScore: 0.8
    };
  }
  
  private createClassContext(
    node: any,
    content: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext {
    const startLine = node.loc?.start.line || 1;
    const endLine = node.loc?.end.line || startLine;
    const lines = content.split('\n');
    
    let classContent = lines.slice(startLine - 1, endLine).join('\n');
    
    // Include docstring
    const docstring = options.includeDocstrings !== false
      ? this.extractDocstring(content, startLine)
      : undefined;
    
    if (docstring) {
      const docLines = docstring.split('\n');
      classContent = docLines.join('\n') + '\n' + classContent;
    }
    
    // Strip method bodies if too large
    if (options.maxTokens && this.estimateTokens(classContent) > options.maxTokens * 0.7) {
      classContent = this.stripMethodBodies(classContent);
    }
    
    return {
      id: `${this.language}:class:${node.id.name}:${startLine}`,
      filePath,
      language: this.language,
      content: classContent,
      startLine: docstring ? startLine - docstring.split('\n').length : startLine,
      endLine,
      type: 'class',
      metadata: {
        name: node.id.name,
        docstring,
        extends: node.superClass ? this.getNodeName(node.superClass) : undefined,
        methods: node.body.body
          .filter((member: any) => t.isClassMethod(member))
          .map((method: any) => method.key.name)
      },
      relevanceScore: 0.9
    };
  }
  
  private extractMethodContexts(
    classNode: any,
    content: string,
    filePath: string,
    options: ContextExtractionOptions
  ): CodeContext[] {
    const contexts: CodeContext[] = [];
    const className = classNode.id.name;
    
    for (const member of classNode.body.body) {
      if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
        const methodName = member.key.name;
        const startLine = member.loc?.start.line || 1;
        const endLine = member.loc?.end.line || startLine;
        const lines = content.split('\n');
        
        const methodContent = lines.slice(startLine - 1, endLine).join('\n');
        
        contexts.push({
          id: `${this.language}:method:${className}.${methodName}:${startLine}`,
          filePath,
          language: this.language,
          content: methodContent,
          startLine,
          endLine,
          type: 'method',
          metadata: {
            name: `${className}.${methodName}`,
            signature: this.buildMethodSignature(member),
            complexity: this.calculateComplexity(methodContent)
          },
          relevanceScore: 0.7
        });
      }
    }
    
    return contexts;
  }
  
  private extractImportInfo(node: any): ImportInfo {
    const specifiers = node.specifiers.map((spec: any) => {
      if (t.isImportDefaultSpecifier(spec)) {
        return spec.local.name;
      } else if (t.isImportSpecifier(spec)) {
        return spec.imported.name;
      } else if (t.isImportNamespaceSpecifier(spec)) {
        return `* as ${spec.local.name}`;
      }
      return '';
    });
    
    return {
      source: node.source.value,
      specifiers,
      line: node.loc?.start.line || 0,
      type: node.specifiers.length === 0 ? 'side-effect' :
            node.specifiers[0].type === 'ImportDefaultSpecifier' ? 'default' :
            node.specifiers[0].type === 'ImportNamespaceSpecifier' ? 'namespace' : 'named'
    };
  }
  
  private extractExportInfo(node: any): ExportInfo | null {
    if (!node.declaration) return null;
    
    let name = 'unknown';
    if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
      name = node.declaration.id.name;
    } else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
      name = node.declaration.id.name;
    } else if (t.isVariableDeclaration(node.declaration)) {
      const decl = node.declaration.declarations[0];
      if (t.isIdentifier(decl.id)) {
        name = decl.id.name;
      }
    }
    
    return {
      name,
      type: 'named',
      line: node.loc?.start.line || 0
    };
  }
  
  private extractClassInfo(node: any, content: string): ClassInfo | null {
    if (!node.id) return null;
    
    const methods: MethodInfo[] = [];
    const properties: PropertyInfo[] = [];
    
    for (const member of node.body.body) {
      if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
        const methodInfo = this.extractMethodInfo(member, content);
        if (methodInfo) methods.push(methodInfo);
      } else if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
        properties.push({
          name: member.key.name,
          type: member.typeAnnotation ? 'typed' : undefined,
          visibility: member.accessibility || 'public',
          static: member.static || false,
          readonly: member.readonly || false,
          line: member.loc?.start.line || 0
        });
      }
    }
    
    return {
      name: node.id.name,
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      methods,
      properties,
      extends: node.superClass ? this.getNodeName(node.superClass) : undefined,
      docstring: this.extractDocstring(content, node.loc?.start.line || 0)
    };
  }
  
  private extractFunctionInfo(node: any, content: string): FunctionInfo | null {
    if (!node.id) return null;
    
    const parameters: ParameterInfo[] = node.params.map((param: any) => ({
      name: this.getParamName(param),
      type: param.typeAnnotation ? 'typed' : undefined,
      optional: param.optional || false,
      defaultValue: param.default ? 'has-default' : undefined
    }));
    
    return {
      name: node.id.name,
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      parameters,
      async: node.async || false,
      generator: node.generator || false,
      docstring: this.extractDocstring(content, node.loc?.start.line || 0),
      complexity: this.calculateComplexity(
        content.split('\n').slice(
          (node.loc?.start.line || 1) - 1,
          node.loc?.end.line || 1
        ).join('\n')
      )
    };
  }
  
  private extractMethodInfo(node: any, content: string): MethodInfo | null {
    if (!t.isIdentifier(node.key)) return null;
    
    const parameters: ParameterInfo[] = node.params.map((param: any) => ({
      name: this.getParamName(param),
      type: param.typeAnnotation ? 'typed' : undefined,
      optional: param.optional || false,
      defaultValue: param.default ? 'has-default' : undefined
    }));
    
    return {
      name: node.key.name,
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      parameters,
      async: node.async || false,
      generator: node.generator || false,
      visibility: node.accessibility || 'public',
      static: node.static || false,
      abstract: node.abstract || false,
      docstring: this.extractDocstring(content, node.loc?.start.line || 0),
      complexity: 1
    };
  }
  
  private extractVariableInfo(node: any): VariableInfo[] {
    return node.declarations.map((decl: any) => {
      if (t.isIdentifier(decl.id)) {
        return {
          name: decl.id.name,
          type: decl.id.typeAnnotation ? 'typed' : undefined,
          scope: 'module',
          line: decl.loc?.start.line || 0,
          constant: node.kind === 'const'
        };
      }
      return null;
    }).filter(Boolean) as VariableInfo[];
  }
  
  private buildOutline(fileContext: FileContext, content: string): any {
    const sections = [];
    
    if (fileContext.imports.length > 0) {
      const firstImport = fileContext.imports[0];
      const lastImport = fileContext.imports[fileContext.imports.length - 1];
      sections.push({
        type: 'imports',
        startLine: firstImport.line,
        endLine: lastImport.line,
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
    
    return {
      sections,
      totalLines: content.split('\n').length,
      hasTests: false,
      hasDocumentation: false
    };
  }
  
  private buildFunctionSignature(node: any): string {
    const params = node.params.map((p: any) => this.getParamName(p)).join(', ');
    const async = node.async ? 'async ' : '';
    const generator = node.generator ? '*' : '';
    return `${async}function${generator} ${node.id.name}(${params})`;
  }
  
  private buildArrowSignature(node: any): string {
    const params = node.params.map((p: any) => this.getParamName(p)).join(', ');
    const async = node.async ? 'async ' : '';
    return `${async}(${params}) => ...`;
  }
  
  private buildMethodSignature(node: any): string {
    const params = node.params.map((p: any) => this.getParamName(p)).join(', ');
    const async = node.async ? 'async ' : '';
    const static_ = node.static ? 'static ' : '';
    const visibility = node.accessibility ? `${node.accessibility} ` : '';
    return `${visibility}${static_}${async}${node.key.name}(${params})`;
  }
  
  private getParamName(param: any): string {
    if (t.isIdentifier(param)) {
      return param.name;
    } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
      return `...${param.argument.name}`;
    } else if (t.isObjectPattern(param)) {
      return '{...}';
    } else if (t.isArrayPattern(param)) {
      return '[...]';
    }
    return 'unknown';
  }
  
  private getNodeName(node: any): string {
    if (t.isIdentifier(node)) {
      return node.name;
    } else if (t.isMemberExpression(node)) {
      return `${this.getNodeName(node.object)}.${this.getNodeName(node.property)}`;
    }
    return 'unknown';
  }
  
  private isInsideClass(path: any): boolean {
    let current = path.parent;
    while (current) {
      if (t.isClassDeclaration(current) || t.isClassExpression(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
  
  private isInsideFunction(path: any): boolean {
    let current = path.parent;
    while (current) {
      if (t.isFunctionDeclaration(current) || 
          t.isFunctionExpression(current) ||
          t.isArrowFunctionExpression(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}