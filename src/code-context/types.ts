/**
 * Code Context Analysis Types
 * Inspired by code-context-provider for intelligent code context extraction
 */

export interface CodeContext {
  id: string;
  filePath: string;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'function' | 'class' | 'method' | 'block' | 'import' | 'full';
  metadata: CodeContextMetadata;
  relevanceScore?: number;
}

export interface CodeContextMetadata {
  name?: string;
  signature?: string;
  docstring?: string;
  complexity?: number;
  dependencies?: string[];
  callers?: string[];
  callees?: string[];
  variables?: string[];
  imports?: string[];
  exports?: string[];
  parameters?: ParameterInfo[];
  extends?: string;
  truncated?: boolean;
  targetLine?: number;
  [key: string]: any; // Allow additional properties
}

export interface ContextWindow {
  contexts: CodeContext[];
  totalTokens: number;
  maxTokens: number;
  files: Set<string>;
  summary?: string;
}

export interface ContextExtractionOptions {
  maxTokens?: number;
  includeImports?: boolean;
  includeExports?: boolean;
  includeDocstrings?: boolean;
  includeComments?: boolean;
  contextLines?: number;
  minRelevance?: number;
  languages?: string[];
}

export interface FileContext {
  filePath: string;
  language: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
  variables: VariableInfo[];
  outline: CodeOutline;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  line: number;
  type: 'default' | 'named' | 'namespace' | 'side-effect';
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'all';
  line: number;
  source?: string; // for re-exports
}

export interface ClassInfo {
  name: string;
  startLine: number;
  endLine: number;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  extends?: string;
  implements?: string[];
  docstring?: string;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: ParameterInfo[];
  returnType?: string;
  async: boolean;
  generator: boolean;
  docstring?: string;
  complexity: number;
}

export interface MethodInfo extends FunctionInfo {
  visibility: 'public' | 'private' | 'protected';
  static: boolean;
  abstract: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  optional: boolean;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  static: boolean;
  readonly: boolean;
  line: number;
}

export interface VariableInfo {
  name: string;
  type?: string;
  scope: 'global' | 'module' | 'local';
  line: number;
  constant: boolean;
}

export interface CodeOutline {
  sections: OutlineSection[];
  totalLines: number;
  hasTests: boolean;
  hasDocumentation: boolean;
}

export interface OutlineSection {
  type: 'imports' | 'constants' | 'types' | 'classes' | 'functions' | 'exports' | 'tests';
  startLine: number;
  endLine: number;
  items: string[];
}

export interface ContextStrategy {
  name: string;
  description: string;
  extract(filePath: string, content: string, options: ContextExtractionOptions): Promise<CodeContext[]>;
  score(context: CodeContext, query: string): number;
}

export interface CodeNavigator {
  goToDefinition(symbol: string, fromFile: string): Promise<CodeContext | null>;
  findReferences(symbol: string, inFiles?: string[]): Promise<CodeContext[]>;
  getCallHierarchy(functionName: string, direction: 'callers' | 'callees'): Promise<CallHierarchyItem[]>;
  getTypeHierarchy(typeName: string): Promise<TypeHierarchyItem[]>;
}

export interface CallHierarchyItem {
  name: string;
  filePath: string;
  line: number;
  kind: 'function' | 'method' | 'constructor';
  children?: CallHierarchyItem[];
}

export interface TypeHierarchyItem {
  name: string;
  filePath: string;
  line: number;
  kind: 'class' | 'interface' | 'type';
  extends?: string[];
  implements?: string[];
  children?: TypeHierarchyItem[];
}

export interface ContextCache {
  get(key: string): CodeContext[] | null;
  set(key: string, contexts: CodeContext[]): void;
  clear(): void;
  size(): number;
}