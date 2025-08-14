#!/usr/bin/env node
/**
 * Cross-platform script to make files executable
 */

import { promises as fs } from 'fs';
import { platform } from 'os';
import { join } from 'path';

async function makeExecutable() {
  const isWindows = platform() === 'win32';
  
  if (isWindows) {
    // On Windows, executable status is determined by file extension
    console.error('✓ Windows platform detected - executables determined by file extension');
    return;
  }
  
  // On Unix-like systems, set execute permissions
  const files = [
    'dist/index.js',
    'bin/ultimate-mcp.js'
  ];
  
  for (const file of files) {
    try {
      await fs.chmod(file, '755');
      console.error(`✓ Made ${file} executable`);
    } catch (error) {
      console.warn(`⚠ Could not make ${file} executable:`, error.message);
    }
  }
}

makeExecutable().catch(console.error);