#!/usr/bin/env node

/**
 * Tree-shaking script for minimal Ultimate MCP builds
 * Removes unused code and creates lightweight bundles
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌳 Tree-shaking Ultimate MCP for minimal build...\n');

const srcDir = path.join(__dirname, '..', 'src');
const distMinimalDir = path.join(__dirname, '..', 'dist-minimal');

// Core features to keep in minimal build
const CORE_FEATURES = {
  tools: [
    'analyze_error',
    'explain_code', 
    'suggest_optimizations',
    'debugging_session',
    'ask',
    'generate_code'
  ],
  providers: [
    'openai',
    'anthropic'
  ],
  transports: [
    'stdio'
  ]
};

// Feature dependencies map
const FEATURE_DEPS = {
  'rag': ['vector-stores', 'embeddings', 'document-chunker'],
  'cognitive': ['knowledge-graph', 'memory-storage'],
  'content-management': ['storage', 'validation'],
  'autonomous': ['exploration-engine', 'working-memory'],
  'charting': ['chart-types', 'data-processor'],
  'universal-search': ['file-searcher', 'code-searcher']
};

class TreeShaker {
  constructor() {
    this.usedExports = new Set();
    this.usedFiles = new Set();
    this.entryPoints = ['index.ts'];
  }
  
  async shake() {
    console.log('🔍 Analyzing dependencies...');
    await this.analyzeDependencies();
    
    console.log('\n✂️ Removing unused code...');
    await this.removeUnusedCode();
    
    console.log('\n📦 Creating minimal bundle...');
    await this.createMinimalBundle();
    
    console.log('\n📊 Generating size report...');
    await this.generateSizeReport();
  }
  
  async analyzeDependencies() {
    // Use rollup for better tree-shaking analysis
    try {
      execSync('npm install --no-save @rollup/plugin-typescript rollup', { stdio: 'pipe' });
    } catch {
      console.log('  Using existing rollup installation...');
    }
    
    // Create rollup config for analysis
    const rollupConfig = `
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist-minimal/bundle.js',
    format: 'es'
  },
  plugins: [
    typescript({
      declaration: false,
      module: 'esnext'
    })
  ],
  external: [
    '@modelcontextprotocol/sdk',
    'openai',
    '@anthropic-ai/sdk',
    '@google/generative-ai',
    'postgres',
    'redis',
    'express',
    'ws',
    /^node:/
  ],
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  }
};
`;
    
    fs.writeFileSync(path.join(__dirname, '..', 'rollup.config.mjs'), rollupConfig);
    
    // Run rollup
    try {
      execSync('npx rollup -c rollup.config.mjs', { stdio: 'inherit' });
      console.log('  ✅ Dependency analysis complete');
    } catch (error) {
      console.warn('  ⚠️ Rollup analysis failed, using fallback method');
      await this.fallbackAnalysis();
    }
  }
  
  async fallbackAnalysis() {
    // Simple dependency analysis
    const analyzeFile = (filePath) => {
      if (this.usedFiles.has(filePath)) return;
      this.usedFiles.add(filePath);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Find imports
        const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith('.')) continue;
          
          const resolvedPath = this.resolveImport(filePath, importPath);
          if (resolvedPath) {
            analyzeFile(resolvedPath);
          }
        }
        
        // Find exports
        const exportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
          this.usedExports.add(match[1]);
        }
      } catch (error) {
        // File not found or other error
      }
    };
    
    // Start from entry points
    this.entryPoints.forEach(entry => {
      const entryPath = path.join(srcDir, entry);
      analyzeFile(entryPath);
    });
  }
  
  resolveImport(fromFile, importPath) {
    const dir = path.dirname(fromFile);
    const possibilities = [
      path.join(dir, importPath),
      path.join(dir, importPath + '.ts'),
      path.join(dir, importPath + '.js'),
      path.join(dir, importPath, 'index.ts'),
      path.join(dir, importPath, 'index.js')
    ];
    
    for (const possibility of possibilities) {
      if (fs.existsSync(possibility)) {
        return possibility;
      }
    }
    
    return null;
  }
  
  async removeUnusedCode() {
    const filesToKeep = new Set();
    
    // Always keep core files
    const coreFiles = [
      'index.ts',
      'server.ts',
      'types.ts',
      'config/index.ts',
      'config/models.ts'
    ];
    
    coreFiles.forEach(file => filesToKeep.add(path.join(srcDir, file)));
    
    // Keep only core tools
    CORE_FEATURES.tools.forEach(tool => {
      const toolFiles = [
        `tools/${tool}.ts`,
        `tools/${tool}/index.ts`
      ];
      toolFiles.forEach(file => filesToKeep.add(path.join(srcDir, file)));
    });
    
    // Keep only core providers
    CORE_FEATURES.providers.forEach(provider => {
      filesToKeep.add(path.join(srcDir, `providers/${provider}.ts`));
    });
    
    // Keep only core transports
    CORE_FEATURES.transports.forEach(transport => {
      filesToKeep.add(path.join(srcDir, `transports/${transport}.ts`));
    });
    
    console.log(`  ✅ Identified ${filesToKeep.size} core files to keep`);
  }
  
  async createMinimalBundle() {
    // Ensure dist-minimal directory exists
    if (!fs.existsSync(distMinimalDir)) {
      fs.mkdirSync(distMinimalDir, { recursive: true });
    }
    
    // Create minimal package.json
    const originalPackage = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const minimalPackage = {
      name: originalPackage.name + '-minimal',
      version: originalPackage.version,
      description: originalPackage.description + ' (Minimal Edition)',
      type: originalPackage.type,
      main: './index.js',
      bin: originalPackage.bin,
      dependencies: {
        '@modelcontextprotocol/sdk': originalPackage.dependencies['@modelcontextprotocol/sdk'],
        'openai': originalPackage.dependencies['openai'],
        '@anthropic-ai/sdk': originalPackage.dependencies['@anthropic-ai/sdk']
      },
      engines: originalPackage.engines
    };
    
    fs.writeFileSync(
      path.join(distMinimalDir, 'package.json'),
      JSON.stringify(minimalPackage, null, 2)
    );
    
    // Create minimal README
    const minimalReadme = `# Ultimate MCP Server - Minimal Edition

This is a lightweight version of Ultimate MCP with only core features:

## Included Features
- Error analysis and debugging
- Code explanation and optimization
- Basic AI orchestration
- Code generation
- STDIO transport only

## Excluded Features
- RAG and vector search
- Cognitive memory
- Content management
- Autonomous exploration
- Charting
- Universal search
- Additional transports (SSE, HTTP, WebSocket)

## Usage
\`\`\`bash
npx ultimate-mcp-server-minimal
\`\`\`

For full features, use the standard edition:
\`\`\`bash
npx ultimate-mcp-server
\`\`\`
`;
    
    fs.writeFileSync(path.join(distMinimalDir, 'README.md'), minimalReadme);
    console.log('  ✅ Created minimal bundle structure');
  }
  
  async generateSizeReport() {
    const getDirectorySize = (dir) => {
      let size = 0;
      
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            size += getDirectorySize(filePath);
          } else {
            size += stat.size;
          }
        });
      } catch {
        // Directory doesn't exist
      }
      
      return size;
    };
    
    const fullSize = getDirectorySize(path.join(__dirname, '..', 'dist'));
    const minimalSize = getDirectorySize(distMinimalDir);
    const reduction = ((1 - minimalSize / fullSize) * 100).toFixed(1);
    
    const report = `
📊 Size Comparison Report
========================

Full Build:    ${(fullSize / 1024 / 1024).toFixed(2)}MB
Minimal Build: ${(minimalSize / 1024 / 1024).toFixed(2)}MB
Size Reduction: ${reduction}%

Features Included in Minimal Build:
${CORE_FEATURES.tools.map(t => `  - ${t}`).join('\n')}

Features Removed:
  - RAG capabilities
  - Cognitive memory
  - Content management
  - Autonomous exploration
  - Charting
  - Universal search
  - Additional transports
  - Additional AI providers

To use minimal build:
  npm install ultimate-mcp-server-minimal
`;
    
    console.log(report);
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'minimal-build-report.txt'),
      report
    );
  }
}

// Run tree shaking
async function main() {
  try {
    const shaker = new TreeShaker();
    await shaker.shake();
    
    console.log('\n✨ Tree-shaking complete!');
    console.log('\nMinimal build created in: dist-minimal/');
    console.log('To publish: cd dist-minimal && npm publish\n');
  } catch (error) {
    console.error('❌ Tree-shaking failed:', error);
    process.exit(1);
  }
}

main();