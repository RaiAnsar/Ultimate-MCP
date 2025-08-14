#!/usr/bin/env node
/**
 * Post-install script for platform-specific setup
 */

import { platform, arch, release } from 'os';
import { existsSync } from 'fs';
import { join } from 'path';

console.error('=================================');
console.error('Ultimate MCP Server v2.0');
console.error('=================================\n');

// Detect platform
const platformName = platform();
const architecture = arch();
const osRelease = release();

console.error(`Platform: ${platformName} (${architecture})`);
console.error(`OS Version: ${osRelease}\n`);

// Platform-specific instructions
switch (platformName) {
  case 'win32':
    console.error('🪟 Windows detected');
    console.error('Ensure you have Node.js 18+ installed');
    console.error('You may need to run terminal as Administrator for some features\n');
    break;
    
  case 'darwin':
    console.error('🍎 macOS detected');
    console.error('All features should work out of the box\n');
    break;
    
  case 'linux':
    console.error('🐧 Linux detected');
    console.error('Ensure you have proper permissions for browser automation\n');
    break;
    
  default:
    console.error('⚠️  Unknown platform detected');
    console.error('Some features may require manual configuration\n');
}

// Check for required dependencies
console.error('Checking dependencies...');

const optionalDeps = [
  { name: 'playwright', message: 'Browser automation (Playwright)' },
  { name: 'puppeteer', message: 'Browser automation (Puppeteer)' },
  { name: 'sharp', message: 'Image processing' },
  { name: 'redis', message: 'Redis caching' },
  { name: 'postgres', message: 'PostgreSQL vector store' }
];

for (const dep of optionalDeps) {
  try {
    const depPath = join(process.cwd(), 'node_modules', dep.name);
    if (existsSync(depPath)) {
      console.error(`✓ ${dep.message} available`);
    } else {
      console.error(`○ ${dep.message} not installed (optional)`);
    }
  } catch {
    console.error(`○ ${dep.message} not installed (optional)`);
  }
}

console.error('\n=================================');
console.error('Installation complete!');
console.error('=================================\n');

console.error('Quick start:');
console.error('  npx ultimate-mcp-server');
console.error('\nFor platform-specific installation:');
console.error('  npx ultimate-mcp-server install [platform]');
console.error('\nAvailable platforms:');
console.error('  - claude-desktop');
console.error('  - claude-code');
console.error('  - cursor');
console.error('  - gemini');
console.error('  - vscode');
console.error('\nDocumentation: https://github.com/RaiAnsar/Ultimate-MCP');