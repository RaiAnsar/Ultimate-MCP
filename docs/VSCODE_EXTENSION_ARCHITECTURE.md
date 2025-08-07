# Ultimate MCP VS Code Extension Architecture

## Overview

The VS Code extension acts as an MCP client, connecting to the Ultimate MCP server to provide all tools directly within VS Code.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              VS Code Extension Host                  │
│  ┌─────────────────────────────────────────────┐   │
│  │         Extension Activation                │   │
│  │  - Register commands                        │   │
│  │  - Initialize MCP client                    │   │
│  │  - Set up UI components                     │   │
│  └─────────────────────────────────────────────┘   │
│                         ↓                            │
│  ┌─────────────────────────────────────────────┐   │
│  │          MCP Client Manager                 │   │
│  │  - Connect to Ultimate MCP server           │   │
│  │  - Handle stdio/HTTP/WebSocket              │   │
│  │  - Manage tool execution                    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│           Ultimate MCP Server (External)             │
│  - Runs as separate process or remote service       │
│  - Provides all 50+ tools and AI models             │
│  - Handles all heavy computation                    │
└─────────────────────────────────────────────────────┘
```

## Key Components

### 1. Command Palette Integration
```typescript
// package.json commands
{
  "contributes": {
    "commands": [
      {
        "command": "ultimateMcp.analyzeError",
        "title": "Ultimate MCP: Analyze Error"
      },
      {
        "command": "ultimateMcp.explainCode",
        "title": "Ultimate MCP: Explain Selected Code"
      },
      {
        "command": "ultimateMcp.generateCode",
        "title": "Ultimate MCP: Generate Code"
      },
      {
        "command": "ultimateMcp.analyzeCodebase",
        "title": "Ultimate MCP: Analyze Entire Codebase"
      },
      {
        "command": "ultimateMcp.analyzeUI",
        "title": "Ultimate MCP: Analyze UI from URL/Image"
      }
    ]
  }
}
```

### 2. Status Bar
```typescript
// Shows connection status and quick actions
class UltimateMcpStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this.updateStatus('connecting');
  }
  
  updateStatus(status: 'connected' | 'disconnected' | 'connecting') {
    switch (status) {
      case 'connected':
        this.statusBarItem.text = '$(check) Ultimate MCP';
        this.statusBarItem.tooltip = 'Connected to Ultimate MCP Server';
        break;
      case 'disconnected':
        this.statusBarItem.text = '$(x) Ultimate MCP';
        this.statusBarItem.tooltip = 'Click to reconnect';
        break;
      case 'connecting':
        this.statusBarItem.text = '$(sync~spin) Ultimate MCP';
        this.statusBarItem.tooltip = 'Connecting...';
        break;
    }
    
    this.statusBarItem.show();
  }
}
```

### 3. Tool Explorer (Tree View)
```typescript
// Visual tool browser in sidebar
class UltimateMcpToolProvider implements vscode.TreeDataProvider<ToolItem> {
  private tools: Tool[] = [];
  
  getTreeItem(element: ToolItem): vscode.TreeItem {
    return {
      label: element.name,
      description: element.description.slice(0, 50) + '...',
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      command: {
        command: 'ultimateMcp.executeTool',
        title: 'Execute Tool',
        arguments: [element]
      },
      iconPath: this.getIconForTool(element.category)
    };
  }
  
  getChildren(element?: ToolItem): ToolItem[] {
    if (!element) {
      // Return tool categories
      return this.getCategories();
    }
    
    // Return tools in category
    return this.getToolsInCategory(element.category);
  }
}
```

### 4. Inline Code Actions
```typescript
// Provide quick fixes and suggestions
class UltimateMcpCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    
    // For errors, offer to analyze
    if (context.diagnostics.length > 0) {
      const analyzeAction = new vscode.CodeAction(
        'Analyze with Ultimate MCP',
        vscode.CodeActionKind.QuickFix
      );
      analyzeAction.command = {
        command: 'ultimateMcp.analyzeError',
        arguments: [context.diagnostics[0]]
      };
      actions.push(analyzeAction);
    }
    
    // For selected code, offer explanations
    if (!range.isEmpty) {
      const explainAction = new vscode.CodeAction(
        'Explain with Ultimate MCP',
        vscode.CodeActionKind.Refactor
      );
      explainAction.command = {
        command: 'ultimateMcp.explainCode',
        arguments: [document.getText(range)]
      };
      actions.push(explainAction);
    }
    
    return actions;
  }
}
```

### 5. WebView for Rich UI
```typescript
// For complex interactions like UI analysis results
class UltimateMcpWebviewPanel {
  private panel: vscode.WebviewPanel;
  
  constructor(context: vscode.ExtensionContext) {
    this.panel = vscode.window.createWebviewPanel(
      'ultimateMcp',
      'Ultimate MCP Results',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    this.panel.webview.html = this.getWebviewContent();
  }
  
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: var(--vscode-font-family); }
            .result-container { padding: 20px; }
            .ui-analysis { display: grid; gap: 20px; }
            .design-system { 
              background: var(--vscode-editor-background);
              padding: 15px;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div id="results" class="result-container">
            <!-- Dynamic results rendered here -->
          </div>
          <script>
            const vscode = acquireVsCodeApi();
            
            // Handle messages from extension
            window.addEventListener('message', event => {
              const message = event.data;
              switch (message.command) {
                case 'displayResults':
                  displayResults(message.results);
                  break;
              }
            });
          </script>
        </body>
      </html>
    `;
  }
}
```

## MCP Client Implementation

```typescript
// MCP client that connects to Ultimate MCP server
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { HttpClientTransport } from '../transports/http-client.js';

class UltimateMcpClient {
  private client: Client;
  private transport: any;
  
  async connect(config: ExtensionConfig) {
    // Choose transport based on configuration
    if (config.connectionType === 'stdio') {
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['ultimate-mcp-server'],
        env: process.env
      });
    } else if (config.connectionType === 'http') {
      this.transport = new HttpClientTransport({
        url: config.serverUrl || 'http://localhost:3000',
        apiKey: config.apiKey
      });
    }
    
    this.client = new Client({
      name: 'ultimate-mcp-vscode',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
    
    await this.client.connect(this.transport);
    
    // List available tools
    const tools = await this.client.listTools();
    return tools;
  }
  
  async executeTool(toolName: string, args: any): Promise<any> {
    const result = await this.client.callTool({
      name: toolName,
      arguments: args
    });
    
    return result;
  }
}
```

## Extension Features

### 1. Error Analysis
```typescript
// Automatically analyze errors in Problems panel
vscode.languages.onDidChangeDiagnostics(async (e) => {
  for (const uri of e.uris) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
        // Offer to analyze with Ultimate MCP
        const result = await mcpClient.executeTool('analyze_error', {
          error: diagnostic.message,
          code: document.getText(diagnostic.range),
          language: document.languageId
        });
        
        // Show inline suggestion
        showInlineSuggestion(uri, diagnostic.range, result);
      }
    }
  }
});
```

### 2. Code Generation
```typescript
// Generate code from comments
vscode.commands.registerCommand('ultimateMcp.generateFromComment', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  
  const line = editor.document.lineAt(editor.selection.active.line);
  const comment = extractComment(line.text);
  
  if (comment) {
    const result = await mcpClient.executeTool('generate_code', {
      description: comment,
      language: editor.document.languageId,
      context: getCodeContext(editor)
    });
    
    // Insert generated code
    editor.edit(editBuilder => {
      editBuilder.insert(
        new vscode.Position(line.lineNumber + 1, 0),
        result.code + '\n'
      );
    });
  }
});
```

### 3. Codebase Analysis
```typescript
// Analyze entire workspace
vscode.commands.registerCommand('ultimateMcp.analyzeWorkspace', async () => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;
  
  // Show progress
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Analyzing codebase with Ultimate MCP",
    cancellable: true
  }, async (progress, token) => {
    const result = await mcpClient.executeTool('analyze_large_codebase', {
      rootDir: workspaceFolder.uri.fsPath,
      query: await vscode.window.showInputBox({
        prompt: "What would you like to analyze?",
        placeholder: "e.g., Find all API endpoints"
      }),
      pattern: ".*\\.(ts|js|py|java)$"
    });
    
    // Display results in webview
    showResultsInWebview(result);
  });
});
```

## Benefits of VS Code Extension

1. **Seamless Integration** - Use Ultimate MCP without leaving VS Code
2. **Context Aware** - Automatically uses current file/project context
3. **Visual Results** - Rich UI for complex results
4. **Inline Suggestions** - See AI suggestions right in your code
5. **Tool Discovery** - Browse all 50+ tools in sidebar
6. **Quick Actions** - Command palette and keyboard shortcuts
7. **Multi-Transport** - Connect via stdio, HTTP, or WebSocket

## Configuration

```json
// .vscode/settings.json
{
  "ultimateMcp.connectionType": "http",
  "ultimateMcp.serverUrl": "http://localhost:3000",
  "ultimateMcp.apiKey": "your-api-key",
  "ultimateMcp.defaultModel": "claude-3-opus",
  "ultimateMcp.autoAnalyzeErrors": true,
  "ultimateMcp.inlineSuggestions": true
}
```

The VS Code extension makes Ultimate MCP's powerful features accessible directly in your development environment!