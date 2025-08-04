#!/usr/bin/env node

// This wrapper helps with npx execution and CLI commands
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is a CLI command
const args = process.argv.slice(2);
const command = args[0];

if (command === 'install' || command === 'add-to-claude') {
  // Handle CLI commands
  const cliPath = join(__dirname, '..', 'dist', 'cli.js');
  const child = spawn('node', [cliPath, ...args], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // Run the MCP server
  const serverPath = join(__dirname, '..', 'dist', 'index.js');
  const child = spawn('node', [serverPath, ...args], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}