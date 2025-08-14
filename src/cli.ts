#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getPlatform, Platform, joinPath, getHomeDir, executeCommand } from './utils/platform-utils.js';

// Command line handling for installation
const args = process.argv.slice(2);
const command = args[0];

if (command === 'install') {
  const platform = args[1];
  install(platform);
} else if (command === 'add-to-claude') {
  const keyIndex = args.indexOf('--key');
  const apiKey = keyIndex !== -1 ? args[keyIndex + 1] : process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Please provide your OpenRouter API key with --key flag');
    process.exit(1);
  }
  
  addToClaude(apiKey);
} else {
  // Run the MCP server normally
  import('./index.js');
}

async function install(targetPlatform?: string) {
  console.error('🚀 Ultimate MCP Server Installer');
  console.error('================================\n');

  if (!targetPlatform) {
    console.error('Please specify a platform:');
    console.error('  npx ultimate-mcp-server install claude-desktop');
    console.error('  npx ultimate-mcp-server install claude-code');
    console.error('  npx ultimate-mcp-server install cursor');
    console.error('  npx ultimate-mcp-server install gemini');
    console.error('  npx ultimate-mcp-server install vscode');
    return;
  }

  // Get API key
  const apiKey = process.env.OPENROUTER_API_KEY || await promptForApiKey();

  switch (targetPlatform) {
    case 'claude-desktop':
      await installClaudeDesktop(apiKey);
      break;
    case 'claude-code':
      await installClaudeCode(apiKey);
      break;
    case 'cursor':
      await installCursor(apiKey);
      break;
    case 'gemini':
      await installGemini(apiKey);
      break;
    case 'vscode':
      await installVSCode(apiKey);
      break;
    default:
      console.error(`❌ Unknown platform: ${targetPlatform}`);
      process.exit(1);
  }
}

async function promptForApiKey(): Promise<string> {
  console.error('🔑 Enter your OpenRouter API key:');
  console.error('   (Get one at https://openrouter.ai/keys)');
  
  // Simple implementation - in production use a proper prompt library
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function installClaudeDesktop(apiKey: string) {
  console.error('📦 Installing for Claude Desktop...\n');

  const configPath = getClaudeConfigPath();
  const config = loadOrCreateConfig(configPath);

  // Add Ultimate MCP to config
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers['ultimate'] = {
    command: 'npx',
    args: ['ultimate-mcp-server'],
    env: {
      OPENROUTER_API_KEY: apiKey
    }
  };

  // Save config
  saveConfig(configPath, config);

  console.error('✅ Installation complete!');
  console.error('\n🎯 Next steps:');
  console.error('1. Restart Claude Desktop');
  console.error('2. Try: /ask "Explain async/await in JavaScript"');
  console.error('3. Or: /orchestrate "Design a REST API" --strategy debate');
}

async function installClaudeCode(apiKey: string) {
  console.error('📦 Installing for Claude Code...\n');

  try {
    execSync(`claude mcp add ultimate npx ultimate-mcp-server -e OPENROUTER_API_KEY="${apiKey}" --scope user`, {
      stdio: 'inherit'
    });
    
    console.error('\n✅ Installation complete!');
    console.error('Restart Claude Code to use Ultimate MCP');
  } catch (error) {
    console.error('❌ Installation failed. Make sure Claude Code CLI is installed');
    process.exit(1);
  }
}

async function installCursor(apiKey: string) {
  console.error('📦 Installing for Cursor...\n');
  
  try {
    execSync(`cursor mcp install ultimate-mcp-server --env OPENROUTER_API_KEY="${apiKey}"`, {
      stdio: 'inherit'
    });
    
    console.error('\n✅ Installation complete!');
    console.error('Restart Cursor to use Ultimate MCP');
  } catch (error) {
    console.error('❌ Installation failed. Manual instructions:');
    console.error('1. Open Cursor Settings (Cmd+, or Ctrl+,)');
    console.error('2. Search for "MCP Servers"');
    console.error('3. Add server with:');
    console.error('   Name: ultimate');
    console.error('   Command: npx ultimate-mcp-server');
    console.error(`   Env: OPENROUTER_API_KEY=${apiKey}`);
  }
}

async function installGemini(apiKey: string) {
  console.error('📦 Setting up for Google AI Studio (Gemini)...\n');

  const config = {
    mcpServers: {
      ultimate: {
        type: 'stdio',
        command: 'npx',
        args: ['ultimate-mcp-server'],
        env: {
          OPENROUTER_API_KEY: apiKey,
          MCP_MODE: 'gemini'
        }
      }
    }
  };

  const configPath = 'gemini-mcp-config.json';
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.error('✅ Configuration file created: gemini-mcp-config.json');
  console.error('\n🎯 Next steps:');
  console.error('1. Open Google AI Studio');
  console.error('2. Go to Settings → Extensions');
  console.error('3. Click "Add MCP Server"');
  console.error(`4. Upload ${configPath}`);
  console.error('5. Enable the Ultimate MCP extension');
}

async function installVSCode(_apiKey: string) {
  console.error('📦 Installing for VS Code...\n');
  console.error('Choose your extension:');
  console.error('1. Continue extension');
  console.error('2. Cline extension');
  console.error('\nVisit: https://github.com/RaiAnsar/Ultimate-MCP/blob/main/PLATFORM_INSTALLATION.md#5-vs-code-via-continue-extension');
}

function addToClaude(apiKey: string) {
  const configPath = getClaudeConfigPath();
  const config = loadOrCreateConfig(configPath);

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers['ultimate'] = {
    command: 'npx',
    args: ['ultimate-mcp-server'],
    env: {
      OPENROUTER_API_KEY: apiKey
    }
  };

  saveConfig(configPath, config);
  console.error('✅ Ultimate MCP added to Claude Desktop!');
  console.error('Please restart Claude Desktop to use it.');
}

function getClaudeConfigPath(): string {
  const homeDir = getHomeDir();
  switch (getPlatform()) {
    case Platform.MAC:
      return joinPath(homeDir, 'Library', 'Application Support', 'Claude', 'claude.json');
    case Platform.WINDOWS:
      return joinPath(process.env.APPDATA || '', 'Claude', 'claude.json');
    default:
      return joinPath(homeDir, '.config', 'claude', 'claude.json');
  }
}

function loadOrCreateConfig(configPath: string): any {
  try {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not read existing config, creating new one');
  }

  // Ensure directory exists
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return {};
}

function saveConfig(configPath: string, config: any) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}