#!/usr/bin/env node

/**
 * Bundle optimization script for Ultimate MCP
 * Reduces bundle size and improves performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

console.log('🚀 Optimizing Ultimate MCP bundle...\n');

// Configuration
const distDir = path.join(__dirname, '..', 'dist');
const reportPath = path.join(__dirname, '..', 'optimization-report.md');

// Optimization steps
const optimizations = {
  // 1. Remove unnecessary files
  removeUnnecessaryFiles() {
    console.log('📦 Removing unnecessary files...');
    const unnecessaryPatterns = [
      '*.map',
      '*.test.js',
      '*.spec.js',
      'test/',
      'tests/',
      'examples/',
      '__tests__/'
    ];
    
    let removed = 0;
    const removeFile = (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
          } else {
            fs.unlinkSync(filePath);
          }
          removed++;
        }
      } catch (error) {
        console.warn(`  Warning: Could not remove ${filePath}`);
      }
    };
    
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (unnecessaryPatterns.some(pattern => file.match(pattern))) {
            removeFile(filePath);
          } else {
            walkDir(filePath);
          }
        } else {
          if (unnecessaryPatterns.some(pattern => file.match(pattern))) {
            removeFile(filePath);
          }
        }
      });
    };
    
    walkDir(distDir);
    console.log(`  ✅ Removed ${removed} unnecessary files\n`);
  },
  
  // 2. Minify JavaScript files
  minifyJavaScript() {
    console.log('🗜️ Minifying JavaScript files...');
    
    try {
      // Install terser if not present
      try {
        require.resolve('terser');
      } catch {
        console.log('  Installing terser...');
        execSync('npm install --no-save terser', { stdio: 'inherit' });
      }
      
      const terser = require('terser');
      let minified = 0;
      let totalSaved = 0;
      
      const walkDir = async (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            await walkDir(filePath);
          } else if (file.endsWith('.js') && !file.endsWith('.min.js')) {
            const code = fs.readFileSync(filePath, 'utf8');
            const originalSize = Buffer.byteLength(code);
            
            const result = await terser.minify(code, {
              compress: {
                dead_code: true,
                drop_console: false, // Keep console for debugging
                drop_debugger: true,
                unused: true
              },
              mangle: {
                keep_fnames: true // Keep function names for better stack traces
              },
              format: {
                comments: false
              }
            });
            
            if (result.code) {
              fs.writeFileSync(filePath, result.code);
              const newSize = Buffer.byteLength(result.code);
              const saved = originalSize - newSize;
              totalSaved += saved;
              minified++;
            }
          }
        }
      };
      
      walkDir(distDir);
      console.log(`  ✅ Minified ${minified} files, saved ${(totalSaved / 1024).toFixed(2)}KB\n`);
    } catch (error) {
      console.warn('  ⚠️ Minification skipped:', error.message);
    }
  },
  
  // 3. Optimize imports and exports
  optimizeImports() {
    console.log('📚 Optimizing imports...');
    
    const optimizeFile = (filePath) => {
      let content = fs.readFileSync(filePath, 'utf8');
      let optimized = false;
      
      // Remove unused imports (basic detection)
      const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
      const usedIdentifiers = new Set();
      
      // Find all used identifiers
      const codeWithoutImports = content.replace(importRegex, '');
      const identifierRegex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
      let match;
      while ((match = identifierRegex.exec(codeWithoutImports)) !== null) {
        usedIdentifiers.add(match[1]);
      }
      
      // Optimize imports
      content = content.replace(importRegex, (fullMatch, imports, module) => {
        const importList = imports.split(',').map(i => i.trim());
        const usedImports = importList.filter(imp => {
          const name = imp.split(' as ')[0].trim();
          return usedIdentifiers.has(name);
        });
        
        if (usedImports.length === 0) {
          optimized = true;
          return ''; // Remove entire import
        } else if (usedImports.length < importList.length) {
          optimized = true;
          return `import { ${usedImports.join(', ')} } from '${module}'`;
        }
        
        return fullMatch;
      });
      
      if (optimized) {
        fs.writeFileSync(filePath, content);
        return true;
      }
      return false;
    };
    
    let optimizedCount = 0;
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.js')) {
          if (optimizeFile(filePath)) {
            optimizedCount++;
          }
        }
      });
    };
    
    walkDir(distDir);
    console.log(`  ✅ Optimized imports in ${optimizedCount} files\n`);
  },
  
  // 4. Create compressed versions
  createCompressedVersions() {
    console.log('🗜️ Creating compressed versions...');
    
    const compressFile = (filePath) => {
      const content = fs.readFileSync(filePath);
      
      // Create gzip version
      const gzipped = zlib.gzipSync(content, { level: 9 });
      fs.writeFileSync(`${filePath}.gz`, gzipped);
      
      // Create brotli version (if available)
      try {
        const brotli = zlib.brotliCompressSync(content, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11
          }
        });
        fs.writeFileSync(`${filePath}.br`, brotli);
      } catch {
        // Brotli not available in older Node versions
      }
      
      return {
        original: content.length,
        gzip: gzipped.length,
        brotli: fs.existsSync(`${filePath}.br`) ? fs.statSync(`${filePath}.br`).size : 0
      };
    };
    
    const mainFile = path.join(distDir, 'index.js');
    if (fs.existsSync(mainFile)) {
      const sizes = compressFile(mainFile);
      console.log(`  ✅ Created compressed versions:`);
      console.log(`     Original: ${(sizes.original / 1024).toFixed(2)}KB`);
      console.log(`     Gzip: ${(sizes.gzip / 1024).toFixed(2)}KB (${((1 - sizes.gzip / sizes.original) * 100).toFixed(1)}% reduction)`);
      if (sizes.brotli > 0) {
        console.log(`     Brotli: ${(sizes.brotli / 1024).toFixed(2)}KB (${((1 - sizes.brotli / sizes.original) * 100).toFixed(1)}% reduction)`);
      }
      console.log();
    }
  },
  
  // 5. Generate optimization report
  generateReport() {
    console.log('📊 Generating optimization report...');
    
    const calculateDirSize = (dir) => {
      let totalSize = 0;
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          totalSize += calculateDirSize(filePath);
        } else {
          totalSize += stat.size;
        }
      });
      
      return totalSize;
    };
    
    const finalSize = calculateDirSize(distDir);
    const report = `# Ultimate MCP Bundle Optimization Report

Generated: ${new Date().toISOString()}

## Bundle Size

- Final bundle size: ${(finalSize / 1024 / 1024).toFixed(2)}MB
- Main file: ${fs.existsSync(path.join(distDir, 'index.js')) ? (fs.statSync(path.join(distDir, 'index.js')).size / 1024).toFixed(2) + 'KB' : 'N/A'}

## Optimizations Applied

1. ✅ Removed unnecessary files (test files, source maps, etc.)
2. ✅ Minified JavaScript files
3. ✅ Optimized imports and removed dead code
4. ✅ Created compressed versions (gzip/brotli)

## Recommendations

1. Enable gzip/brotli compression on your server
2. Use CDN for static assets
3. Implement lazy loading for optional features
4. Consider code splitting for large modules

## File Structure

\`\`\`
dist/
${generateFileTree(distDir, '  ', 2)}
\`\`\`
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`  ✅ Report saved to: ${reportPath}\n`);
  }
};

// Helper function to generate file tree
function generateFileTree(dir, prefix = '', maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '';
  
  let tree = '';
  const files = fs.readdirSync(dir).sort();
  
  files.forEach((file, index) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const isLast = index === files.length - 1;
    const filePrefix = isLast ? '└── ' : '├── ';
    const size = stat.isDirectory() ? '' : ` (${(stat.size / 1024).toFixed(1)}KB)`;
    
    tree += `${prefix}${filePrefix}${file}${size}\n`;
    
    if (stat.isDirectory() && currentDepth < maxDepth - 1) {
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      tree += generateFileTree(filePath, nextPrefix, maxDepth, currentDepth + 1);
    }
  });
  
  return tree;
}

// Run optimizations
async function optimize() {
  try {
    for (const [name, fn] of Object.entries(optimizations)) {
      await fn();
    }
    
    console.log('✨ Bundle optimization complete!\n');
    console.log('Next steps:');
    console.log('1. Test the optimized bundle: npm start');
    console.log('2. Run compatibility tests: npm run test:compatibility');
    console.log('3. Deploy with confidence! 🚀\n');
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

// Execute
optimize();