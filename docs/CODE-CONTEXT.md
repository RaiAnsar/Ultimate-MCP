# Code Context Analysis System

## Overview

The code context analysis system in Ultimate MCP v2.0 provides intelligent code extraction and navigation capabilities inspired by code-context-provider. It enables smart context window management, language-specific parsing, and query-focused code exploration.

## Key Features

### 1. Intelligent Context Extraction
- **Language Support**: TypeScript, JavaScript, JSX, TSX, and Python
- **AST-based Parsing**: Accurate symbol extraction using Babel for JS/TS
- **Smart Filtering**: Relevance-based context selection
- **Token Management**: Automatic context window optimization

### 2. Context Types
- **Functions**: Standalone functions with signatures and complexity
- **Classes**: Class definitions with methods and properties
- **Methods**: Class methods with visibility and modifiers
- **Imports/Exports**: Module dependencies and exports
- **Blocks**: Generic code blocks and references

### 3. Extraction Strategies
- **Function-focused**: Prioritizes functions and methods
- **Class-focused**: Emphasizes class and type definitions
- **Import-focused**: Includes dependency information
- **Query-focused**: Tailored to specific search queries

### 4. Advanced Features
- **Symbol Navigation**: Find definitions and references
- **File Structure Analysis**: Complete file outline with stats
- **Context Window Building**: Smart token-limited context creation
- **Caching**: In-memory cache for performance

## MCP Tools

### `extract_code_context`
Extract intelligent code context from files with smart filtering.

**Parameters:**
- `filePaths`: Array of files to extract from
- `options`:
  - `maxTokens`: Maximum tokens for context window (default: 8000)
  - `includeImports`: Include import statements
  - `includeExports`: Include export statements
  - `includeDocstrings`: Include documentation
  - `minRelevance`: Minimum relevance score (0-1)
  - `strategy`: Extraction strategy

### `analyze_file_structure`
Analyze the complete structure of a code file.

**Parameters:**
- `filePath`: File to analyze

**Returns:**
- Imports, exports, classes, functions, variables
- File outline with sections
- Statistics (lines, complexity, etc.)

### `search_code_context`
Search for code context based on a query.

**Parameters:**
- `query`: Search query
- `searchPaths`: Paths to search in
- `options`:
  - `maxTokens`: Token limit
  - `minRelevance`: Relevance threshold
  - `includeReferences`: Find references too

### `find_symbol_definition`
Find the definition of a symbol (function, class, variable).

**Parameters:**
- `symbol`: Symbol name
- `searchPaths`: Where to search

### `find_symbol_references`
Find all references to a symbol.

**Parameters:**
- `symbol`: Symbol name
- `searchPaths`: Where to search
- `includeDefinition`: Include definition in results

### `build_smart_context`
Build an intelligent context window for a specific task.

**Parameters:**
- `task`: Task description
- `basePath`: Base search path
- `options`:
  - `maxTokens`: Token limit
  - `strategy`: 'comprehensive', 'focused', or 'minimal'
  - `fileTypes`: File extensions to include

### `clear_context_cache`
Clear the context extraction cache.

## Usage Examples

### Extracting Function Context
```javascript
await extract_code_context({
  filePaths: ['src/auth/login.ts', 'src/auth/jwt.ts'],
  options: {
    strategy: 'function-focused',
    maxTokens: 6000,
    includeDocstrings: true
  }
});
```

### Analyzing File Structure
```javascript
await analyze_file_structure({
  filePath: 'src/components/UserProfile.tsx'
});

// Returns:
{
  structure: {
    imports: [...],
    exports: [...],
    classes: [{
      name: 'UserProfile',
      methods: ['render', 'handleUpdate'],
      extends: 'React.Component'
    }],
    functions: [...]
  },
  stats: {
    totalLines: 245,
    hasTests: false,
    hasDocumentation: true,
    classCount: 1,
    functionCount: 3
  }
}
```

### Finding Symbol Definition
```javascript
await find_symbol_definition({
  symbol: 'authenticateUser',
  searchPaths: ['src/']
});

// Returns:
{
  found: true,
  definition: {
    filePath: 'src/auth/authentication.ts',
    type: 'function',
    startLine: 42,
    signature: 'async function authenticateUser(email: string, password: string): Promise<User>',
    docstring: 'Authenticates a user with email and password'
  }
}
```

### Building Task Context
```javascript
await build_smart_context({
  task: 'implement password reset functionality',
  basePath: 'src/',
  options: {
    strategy: 'focused',
    maxTokens: 10000
  }
});
```

## Architecture

### Components

1. **ContextManager**: Orchestrates extraction and caching
2. **Language Extractors**: 
   - TypeScriptContextExtractor (JS/TS/JSX/TSX)
   - PythonContextExtractor
3. **Context Strategies**: Different extraction approaches
4. **Cache**: In-memory caching with TTL

### Extraction Process

1. **File Reading**: Load source files
2. **Language Detection**: Select appropriate extractor
3. **AST Parsing**: Parse code into abstract syntax tree
4. **Context Extraction**: Extract relevant code segments
5. **Relevance Scoring**: Score based on query/strategy
6. **Window Building**: Fit contexts within token limit
7. **Caching**: Store results for reuse

### Context Scoring

Relevance scores are calculated based on:
- Name matching with query
- Content matching
- Context type (functions/classes scored higher)
- Strategy-specific boosts
- Complexity and importance

## Performance Considerations

### Token Estimation
- Rough estimate: 4 characters ≈ 1 token
- Context windows automatically truncated if needed
- Method bodies stripped from large classes

### Caching
- 5-minute TTL for extracted contexts
- Cache key includes file path and options
- Manual cache clearing available

### File System
- Automatic filtering of node_modules, .git, dist, build
- Configurable file type filters
- Recursive directory traversal

## Language-Specific Features

### TypeScript/JavaScript
- Full TypeScript support with type annotations
- JSX/TSX component parsing
- Decorator support
- ES6+ syntax support
- Async/await detection
- Complexity calculation

### Python
- Class and function extraction
- Docstring preservation
- Import analysis
- Async function detection
- Generator detection
- Module-level variable tracking

## Future Enhancements

- Support for more languages (Go, Rust, Java)
- Semantic code search using embeddings
- Cross-file relationship mapping
- Incremental parsing for large codebases
- IDE-like code navigation features
- Integration with Language Server Protocol