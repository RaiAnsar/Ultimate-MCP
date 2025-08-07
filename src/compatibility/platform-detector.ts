/**
 * Platform detection and compatibility layer
 */

export interface PlatformInfo {
  name: string;
  version?: string;
  transportSupport: {
    stdio: boolean;
    sse: boolean;
    http: boolean;
    websocket: boolean;
  };
  features: {
    streaming: boolean;
    authentication: boolean;
    fileAccess: boolean;
    environmentVariables: boolean;
  };
  detected: boolean;
}

export const SUPPORTED_PLATFORMS = {
  // Desktop Applications
  CLAUDE_DESKTOP: 'claude-desktop',
  CURSOR: 'cursor',
  WINDSURF: 'windsurf',
  VSCODE: 'vscode',
  ZEDNOW: 'zednow',
  CONTINUE: 'continue',
  CLINE: 'cline',
  BOLTAI: 'bolt-ai',
  LIBRECHAT: 'librechat',
  BIGAGI: 'big-agi',
  MSPILOT: 'mspilot',
  MODELCOMPUTER: 'model.computer',
  
  // CLI Tools
  CLAUDE_CLI: 'claude-cli',
  MCPHUB: 'mcphub',
  SHELL_ASSISTANT: 'shell-assistant',
  
  // Development Tools
  OPEROS: 'operos',
  SRCBOOK: 'srcbook',
  GLAMA: 'glama',
  AIDE: 'aide',
  PEAR_AI: 'pear-ai',
  AUGMEND: 'augmend',
  VOID: 'void',
  MELTY: 'melty',
  
  // Specialized Tools
  SMITHERY: 'smithery',
  DOUBLE: 'double',
  CODY: 'cody',
  PIECES: 'pieces-app',
  AIDER: 'aider',
  MENTAT: 'mentat',
  RIFT: 'rift',
  TABBY: 'tabby',
  COPILOT: 'github-copilot',
  
  // Additional Platforms
  JETBRAINS: 'jetbrains',
  SUBLIME: 'sublime-text',
  NEOVIM: 'neovim',
  EMACS: 'emacs'
} as const;

export type SupportedPlatform = typeof SUPPORTED_PLATFORMS[keyof typeof SUPPORTED_PLATFORMS];

export class PlatformDetector {
  private userAgent?: string;
  private processEnv: NodeJS.ProcessEnv;
  
  constructor() {
    this.processEnv = process.env;
    this.userAgent = this.detectUserAgent();
  }
  
  private detectUserAgent(): string | undefined {
    // Check various environment variables that platforms might set
    return this.processEnv.MCP_USER_AGENT ||
           this.processEnv.USER_AGENT ||
           this.processEnv.HTTP_USER_AGENT;
  }
  
  detect(): PlatformInfo {
    // Check for Claude Desktop
    if (this.processEnv.CLAUDE_DESKTOP || this.userAgent?.includes('Claude-Desktop')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.CLAUDE_DESKTOP);
    }
    
    // Check for Cursor
    if (this.processEnv.CURSOR_IDE || this.userAgent?.includes('Cursor')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.CURSOR);
    }
    
    // Check for Windsurf
    if (this.processEnv.WINDSURF || this.userAgent?.includes('Windsurf')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.WINDSURF);
    }
    
    // Check for VSCode
    if (this.processEnv.VSCODE_PID || this.processEnv.TERM_PROGRAM === 'vscode') {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.VSCODE);
    }
    
    // Check for Cline
    if (this.processEnv.CLINE || this.userAgent?.includes('Cline')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.CLINE);
    }
    
    // Check for Claude CLI
    if (this.processEnv.CLAUDE_CLI || process.argv.includes('claude')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.CLAUDE_CLI);
    }
    
    // Check for Continue
    if (this.processEnv.CONTINUE_IDE || this.userAgent?.includes('Continue')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.CONTINUE);
    }
    
    // Check for BoltAI
    if (this.processEnv.BOLTAI || this.userAgent?.includes('BoltAI')) {
      return this.getPlatformInfo(SUPPORTED_PLATFORMS.BOLTAI);
    }
    
    // Check for other platforms via environment variables
    const platformEnvMap: Record<string, SupportedPlatform> = {
      ZEDNOW: SUPPORTED_PLATFORMS.ZEDNOW,
      LIBRECHAT: SUPPORTED_PLATFORMS.LIBRECHAT,
      BIG_AGI: SUPPORTED_PLATFORMS.BIGAGI,
      MSPILOT: SUPPORTED_PLATFORMS.MSPILOT,
      OPEROS: SUPPORTED_PLATFORMS.OPEROS,
      SRCBOOK: SUPPORTED_PLATFORMS.SRCBOOK,
      GLAMA: SUPPORTED_PLATFORMS.GLAMA,
      AIDE: SUPPORTED_PLATFORMS.AIDE,
      PEAR_AI: SUPPORTED_PLATFORMS.PEAR_AI,
      AUGMEND: SUPPORTED_PLATFORMS.AUGMEND,
      VOID_EDITOR: SUPPORTED_PLATFORMS.VOID,
      MELTY: SUPPORTED_PLATFORMS.MELTY,
      SMITHERY: SUPPORTED_PLATFORMS.SMITHERY,
      DOUBLE: SUPPORTED_PLATFORMS.DOUBLE,
      CODY: SUPPORTED_PLATFORMS.CODY,
      PIECES: SUPPORTED_PLATFORMS.PIECES,
      AIDER: SUPPORTED_PLATFORMS.AIDER,
      MENTAT: SUPPORTED_PLATFORMS.MENTAT,
      RIFT: SUPPORTED_PLATFORMS.RIFT,
      TABBY: SUPPORTED_PLATFORMS.TABBY,
      GITHUB_COPILOT: SUPPORTED_PLATFORMS.COPILOT,
      INTELLIJ_IDEA: SUPPORTED_PLATFORMS.JETBRAINS,
      SUBLIME_TEXT: SUPPORTED_PLATFORMS.SUBLIME,
      NVIM: SUPPORTED_PLATFORMS.NEOVIM,
      EMACS: SUPPORTED_PLATFORMS.EMACS
    };
    
    for (const [envVar, platform] of Object.entries(platformEnvMap)) {
      if (this.processEnv[envVar]) {
        return this.getPlatformInfo(platform);
      }
    }
    
    // Default to unknown platform with full support
    return {
      name: 'unknown',
      transportSupport: {
        stdio: true,
        sse: true,
        http: true,
        websocket: true
      },
      features: {
        streaming: true,
        authentication: true,
        fileAccess: true,
        environmentVariables: true
      },
      detected: false
    };
  }
  
  private getPlatformInfo(platform: SupportedPlatform): PlatformInfo {
    const platformConfigs: Record<SupportedPlatform, Omit<PlatformInfo, 'detected'>> = {
      [SUPPORTED_PLATFORMS.CLAUDE_DESKTOP]: {
        name: 'Claude Desktop',
        version: this.processEnv.CLAUDE_VERSION,
        transportSupport: {
          stdio: true,
          sse: false,
          http: false,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.CURSOR]: {
        name: 'Cursor',
        version: this.processEnv.CURSOR_VERSION,
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.WINDSURF]: {
        name: 'Windsurf',
        version: this.processEnv.WINDSURF_VERSION,
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.VSCODE]: {
        name: 'VSCode',
        version: this.processEnv.VSCODE_VERSION,
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.CLINE]: {
        name: 'Cline',
        version: this.processEnv.CLINE_VERSION,
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.CLAUDE_CLI]: {
        name: 'Claude CLI',
        transportSupport: {
          stdio: true,
          sse: false,
          http: false,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.CONTINUE]: {
        name: 'Continue',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.BOLTAI]: {
        name: 'BoltAI',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      // Add configs for all other platforms...
      [SUPPORTED_PLATFORMS.ZEDNOW]: {
        name: 'ZedNow',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.LIBRECHAT]: {
        name: 'LibreChat',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.BIGAGI]: {
        name: 'Big-AGI',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.MSPILOT]: {
        name: 'MSPilot',
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.MODELCOMPUTER]: {
        name: 'Model.Computer',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: false
        }
      },
      [SUPPORTED_PLATFORMS.MCPHUB]: {
        name: 'MCPHub',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.SHELL_ASSISTANT]: {
        name: 'Shell Assistant',
        transportSupport: {
          stdio: true,
          sse: false,
          http: false,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: false,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.OPEROS]: {
        name: 'OperOS',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.SRCBOOK]: {
        name: 'Srcbook',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.GLAMA]: {
        name: 'Glama',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.AIDE]: {
        name: 'Aide',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.PEAR_AI]: {
        name: 'Pear AI',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.AUGMEND]: {
        name: 'Augmend',
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.VOID]: {
        name: 'Void',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.MELTY]: {
        name: 'Melty',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.SMITHERY]: {
        name: 'Smithery',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.DOUBLE]: {
        name: 'Double',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.CODY]: {
        name: 'Cody',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.PIECES]: {
        name: 'Pieces',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.AIDER]: {
        name: 'Aider',
        transportSupport: {
          stdio: true,
          sse: false,
          http: false,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: false,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.MENTAT]: {
        name: 'Mentat',
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.RIFT]: {
        name: 'Rift',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.TABBY]: {
        name: 'Tabby',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.COPILOT]: {
        name: 'GitHub Copilot',
        transportSupport: {
          stdio: false,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: false,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.JETBRAINS]: {
        name: 'JetBrains',
        transportSupport: {
          stdio: true,
          sse: true,
          http: true,
          websocket: true
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.SUBLIME]: {
        name: 'Sublime Text',
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: true,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.NEOVIM]: {
        name: 'Neovim',
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: false,
          fileAccess: true,
          environmentVariables: true
        }
      },
      [SUPPORTED_PLATFORMS.EMACS]: {
        name: 'Emacs',
        transportSupport: {
          stdio: true,
          sse: false,
          http: true,
          websocket: false
        },
        features: {
          streaming: true,
          authentication: false,
          fileAccess: true,
          environmentVariables: true
        }
      }
    };
    
    return {
      ...platformConfigs[platform],
      detected: true
    };
  }
  
  isCompatible(platform: PlatformInfo, requiredTransport: 'stdio' | 'sse' | 'http' | 'websocket'): boolean {
    return platform.transportSupport[requiredTransport];
  }
  
  getRecommendedTransport(platform: PlatformInfo): 'stdio' | 'sse' | 'http' | 'websocket' {
    // Priority: stdio > websocket > http > sse
    if (platform.transportSupport.stdio) return 'stdio';
    if (platform.transportSupport.websocket) return 'websocket';
    if (platform.transportSupport.http) return 'http';
    if (platform.transportSupport.sse) return 'sse';
    
    return 'stdio'; // Default fallback
  }
}