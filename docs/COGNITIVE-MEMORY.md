# Cognitive Memory System

## Overview

The cognitive memory system in Ultimate MCP v2.0 provides advanced knowledge graph capabilities inspired by cognee-mcp. It enables intelligent memory storage, semantic search, and code analysis with graph-based relationships.

## Key Features

### 1. Knowledge Graph
- **Nodes**: Concepts, entities, memories, code, documents, and relations
- **Edges**: Typed relationships (relates_to, contains, depends_on, similar_to, etc.)
- **Importance Scoring**: Automatic importance calculation based on connections and usage
- **Memory Pruning**: Automatic pruning of least important nodes when limits are reached

### 2. Semantic Search
- **Embedding-based Search**: Uses OpenAI or Cohere embeddings for semantic similarity
- **Graph Traversal**: Find related nodes through relationship traversal
- **Context Building**: Build comprehensive context from multiple queries
- **Relevance Scoring**: Combined scoring using embeddings, importance, and recency

### 3. Code Analysis
- **AST Parsing**: Analyzes JavaScript/TypeScript and Python code
- **Symbol Extraction**: Functions, classes, interfaces, imports, exports
- **Dependency Mapping**: Track code dependencies and relationships
- **Pattern Detection**: Identify common code patterns (async/await, error handling, etc.)
- **Complexity Analysis**: Calculate cyclomatic complexity

### 4. Memory Persistence
- **Auto-save**: Configurable automatic saving to disk
- **JSON Format**: Human-readable persistence format
- **Backup/Restore**: Support for memory backups

## MCP Tools

### `build_knowledge_graph`
Add concepts, entities, memories, or relationships to the knowledge graph.

**Operations:**
- `add_concept`: Add a conceptual node
- `add_entity`: Add an entity with type
- `add_memory`: Add a memory with context
- `add_relationship`: Create relationships between nodes

### `cognitive_search`
Search the cognitive memory using semantic similarity and graph traversal.

**Parameters:**
- `query`: Search query
- `type`: Filter by node type (optional)
- `limit`: Maximum results
- `includeRelated`: Include related nodes
- `depth`: Graph traversal depth

### `analyze_code_graph`
Analyze code files and build a code knowledge graph.

**Parameters:**
- `filePath`: Single file to analyze
- `directory`: Directory to analyze recursively
- `extensions`: File extensions to include

### `build_memory_context`
Build comprehensive context from multiple queries.

**Parameters:**
- `queries`: List of queries to search
- `includeStats`: Include graph statistics

### `get_related_memories`
Get memories related to a specific node.

**Parameters:**
- `nodeId`: Source node ID
- `depth`: Traversal depth

### `export_knowledge_graph`
Export the knowledge graph for visualization or analysis.

**Parameters:**
- `format`: 'visualization' or 'stats'

### `clear_cognitive_memory`
Clear all cognitive memory (requires confirmation).

## Configuration

### Environment Variables
```bash
# Embedding provider (optional, falls back to local)
OPENAI_API_KEY=your_openai_key
COHERE_API_KEY=your_cohere_key

# Memory persistence path
COGNITIVE_MEMORY_PATH=.cognitive-memory.json
```

### Config Options
```typescript
{
  maxNodes: 10000,          // Maximum nodes in graph
  maxEdges: 50000,          // Maximum edges in graph
  pruneThreshold: 0.1,      // Importance threshold for pruning
  embeddingDimensions: 384, // Embedding vector dimensions
  persistencePath: string,  // Path to save memory
  autoSave: true,          // Enable auto-save
  autoSaveInterval: 60000  // Auto-save interval (ms)
}
```

## Usage Examples

### Building a Knowledge Base
```javascript
// Add a concept
await build_knowledge_graph({
  operation: 'add_concept',
  data: {
    name: 'Machine Learning',
    content: 'A subset of AI that enables systems to learn from data',
    metadata: { category: 'AI', importance: 0.9 }
  }
});

// Add related entity
await build_knowledge_graph({
  operation: 'add_entity',
  data: {
    name: 'Neural Networks',
    content: 'Computing systems inspired by biological neural networks',
    entityType: 'technology',
    metadata: { category: 'AI' }
  }
});
```

### Analyzing a Codebase
```javascript
// Analyze entire directory
await analyze_code_graph({
  directory: './src',
  extensions: ['.ts', '.js']
});

// Search for related code
await cognitive_search({
  query: 'authentication',
  type: 'code',
  includeRelated: true
});
```

### Building Context for AI
```javascript
// Build context from multiple concepts
const context = await build_memory_context({
  queries: ['user authentication', 'JWT tokens', 'security'],
  includeStats: true
});
```

## Architecture

### Components
1. **KnowledgeGraphManager**: Core graph operations and search
2. **CodeAnalyzer**: AST-based code analysis
3. **CognitiveMemoryManager**: High-level API and orchestration
4. **Embedding Providers**: OpenAI, Cohere, or local embeddings

### Data Flow
1. Content is added as nodes with embeddings
2. Relationships are created between nodes
3. Search queries use embeddings for semantic matching
4. Graph traversal finds related nodes
5. Context is built from search results

## Future Enhancements
- Support for more programming languages
- Graph visualization UI
- Incremental code analysis
- Distributed graph storage
- Real-time collaborative memory
- Advanced pruning strategies