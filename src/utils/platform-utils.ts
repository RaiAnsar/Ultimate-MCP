/**
 * Platform Utilities
 * 
 * Cross-platform compatibility helpers for Ultimate MCP
 */

import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import { exec as execCallback, spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

export enum Platform {
  WINDOWS = 'win32',
  MAC = 'darwin',
  LINUX = 'linux',
  UNKNOWN = 'unknown'
}

/**
 * Get current platform
 */
export function getPlatform(): Platform {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return Platform.WINDOWS;
    case 'darwin':
      return Platform.MAC;
    case 'linux':
      return Platform.LINUX;
    default:
      return Platform.UNKNOWN;
  }
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === Platform.WINDOWS;
}

/**
 * Check if running on Mac
 */
export function isMac(): boolean {
  return getPlatform() === Platform.MAC;
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === Platform.LINUX;
}

/**
 * Get platform-specific path separator
 */
export function getPathSeparator(): string {
  return path.sep;
}

/**
 * Join paths in a cross-platform way
 */
export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * Normalize path for current platform
 */
export function normalizePath(inputPath: string): string {
  // Replace all forward slashes and backslashes with the platform separator
  return inputPath.split(/[/\\]/).join(path.sep);
}

/**
 * Convert to platform-specific absolute path
 */
export function toAbsolutePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return normalizePath(inputPath);
  }
  return path.resolve(inputPath);
}

/**
 * Get platform-specific temp directory
 */
export function getTempDir(): string {
  return os.tmpdir();
}

/**
 * Get platform-specific home directory
 */
export function getHomeDir(): string {
  return os.homedir();
}

/**
 * Get platform-specific config directory
 */
export function getConfigDir(appName: string = 'ultimate-mcp'): string {
  const platform = getPlatform();
  const home = getHomeDir();
  
  switch (platform) {
    case Platform.WINDOWS:
      return joinPath(process.env.APPDATA || joinPath(home, 'AppData', 'Roaming'), appName);
    case Platform.MAC:
      return joinPath(home, 'Library', 'Application Support', appName);
    case Platform.LINUX:
      return joinPath(process.env.XDG_CONFIG_HOME || joinPath(home, '.config'), appName);
    default:
      return joinPath(home, `.${appName}`);
  }
}

/**
 * Get platform-specific data directory
 */
export function getDataDir(appName: string = 'ultimate-mcp'): string {
  const platform = getPlatform();
  const home = getHomeDir();
  
  switch (platform) {
    case Platform.WINDOWS:
      return joinPath(process.env.LOCALAPPDATA || joinPath(home, 'AppData', 'Local'), appName);
    case Platform.MAC:
      return joinPath(home, 'Library', 'Application Support', appName);
    case Platform.LINUX:
      return joinPath(process.env.XDG_DATA_HOME || joinPath(home, '.local', 'share'), appName);
    default:
      return joinPath(home, `.${appName}`, 'data');
  }
}

/**
 * Get platform-specific cache directory
 */
export function getCacheDir(appName: string = 'ultimate-mcp'): string {
  const platform = getPlatform();
  const home = getHomeDir();
  
  switch (platform) {
    case Platform.WINDOWS:
      return joinPath(process.env.TEMP || getTempDir(), appName);
    case Platform.MAC:
      return joinPath(home, 'Library', 'Caches', appName);
    case Platform.LINUX:
      return joinPath(process.env.XDG_CACHE_HOME || joinPath(home, '.cache'), appName);
    default:
      return joinPath(getTempDir(), appName);
  }
}

/**
 * Execute command in a cross-platform way
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<{ stdout: string; stderr: string }> {
  const platform = getPlatform();
  
  // On Windows, use cmd.exe for shell commands
  if (platform === Platform.WINDOWS) {
    const cmdArgs = ['/c', command, ...args];
    return exec(`cmd ${cmdArgs.join(' ')}`, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env }
    });
  }
  
  // On Unix-like systems, use the command directly
  return exec(`${command} ${args.join(' ')}`, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env }
  });
}

/**
 * Spawn process in a cross-platform way
 */
export function spawnProcess(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean } = {}
) {
  const platform = getPlatform();
  
  // On Windows, use shell mode for better compatibility
  if (platform === Platform.WINDOWS) {
    return spawn(command, args, {
      ...options,
      shell: true,
      env: { ...process.env, ...options.env }
    });
  }
  
  return spawn(command, args, {
    ...options,
    env: { ...process.env, ...options.env }
  });
}

/**
 * Get platform-specific executable extension
 */
export function getExecutableExtension(): string {
  return isWindows() ? '.exe' : '';
}

/**
 * Get platform-specific script extension
 */
export function getScriptExtension(): string {
  return isWindows() ? '.bat' : '.sh';
}

/**
 * Convert line endings for current platform
 */
export function normalizeLineEndings(text: string): string {
  const platform = getPlatform();
  
  if (platform === Platform.WINDOWS) {
    // Convert to CRLF for Windows
    return text.replace(/\r?\n/g, '\r\n');
  } else {
    // Convert to LF for Unix-like systems
    return text.replace(/\r\n/g, '\n');
  }
}

/**
 * Get platform-specific environment variable
 */
export function getEnvVar(name: string, fallback?: string): string | undefined {
  // Handle case-insensitive env vars on Windows
  if (isWindows()) {
    const upperName = name.toUpperCase();
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toUpperCase() === upperName) {
        return value;
      }
    }
  }
  
  return process.env[name] || fallback;
}

/**
 * Check if a file is executable
 */
export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    
    if (isWindows()) {
      // On Windows, check file extension
      const ext = path.extname(filePath).toLowerCase();
      return ['.exe', '.bat', '.cmd', '.com'].includes(ext);
    } else {
      // On Unix-like systems, check execute permission
      // Check if owner, group, or others have execute permission
      const hasExecute = (stats.mode & 0o111) !== 0;
      return hasExecute;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Make a file executable (Unix-like systems only)
 */
export async function makeExecutable(filePath: string): Promise<void> {
  if (!isWindows()) {
    await fs.chmod(filePath, '755');
  }
  // On Windows, executable status is determined by file extension
}

/**
 * Get platform-specific null device
 */
export function getNullDevice(): string {
  return isWindows() ? 'NUL' : '/dev/null';
}

/**
 * Get platform info
 */
export function getPlatformInfo() {
  return {
    platform: getPlatform(),
    platformName: os.platform(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    homeDir: getHomeDir(),
    tempDir: getTempDir(),
    pathSeparator: path.sep,
    eol: os.EOL
  };
}

/**
 * Resolve module path in a cross-platform way
 */
export function resolveModulePath(moduleName: string, basePath?: string): string {
  const paths = basePath ? [basePath] : [];
  
  // Add node_modules paths
  if (basePath) {
    let currentPath = basePath;
    while (currentPath !== path.dirname(currentPath)) {
      paths.push(joinPath(currentPath, 'node_modules'));
      currentPath = path.dirname(currentPath);
    }
  }
  
  // Add global paths based on platform
  const platform = getPlatform();
  if (platform === Platform.WINDOWS) {
    const appData = process.env.APPDATA;
    if (appData) {
      paths.push(joinPath(appData, 'npm', 'node_modules'));
    }
  } else {
    paths.push('/usr/local/lib/node_modules');
    paths.push('/usr/lib/node_modules');
    const home = getHomeDir();
    paths.push(joinPath(home, '.npm-global', 'lib', 'node_modules'));
  }
  
  // Try to resolve the module
  for (const searchPath of paths) {
    try {
      const modulePath = joinPath(searchPath, moduleName);
      require.resolve(modulePath);
      return modulePath;
    } catch {
      // Continue searching
    }
  }
  
  // Fallback to default resolution
  return require.resolve(moduleName);
}

/**
 * Get platform-specific browser command
 */
export function getBrowserCommand(): string {
  const platform = getPlatform();
  
  switch (platform) {
    case Platform.WINDOWS:
      return 'start';
    case Platform.MAC:
      return 'open';
    case Platform.LINUX:
      return 'xdg-open';
    default:
      return 'open';
  }
}

/**
 * Open URL in default browser
 */
export async function openInBrowser(url: string): Promise<void> {
  const command = getBrowserCommand();
  
  if (isWindows()) {
    // Windows needs special handling for URLs
    await executeCommand('cmd', ['/c', 'start', '""', url]);
  } else {
    await executeCommand(command, [url]);
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Safe file write with atomic operation
 */
export async function safeWriteFile(
  filePath: string,
  data: string | Buffer,
  encoding: BufferEncoding = 'utf8'
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  
  try {
    // Write to temp file
    await fs.writeFile(tempPath, data, encoding);
    
    // Rename atomically
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Check if running in a container (Docker, etc.)
 */
export async function isContainer(): Promise<boolean> {
  if (await fileExists('/.dockerenv')) {
    return true;
  }
  
  try {
    const cgroup = await fs.readFile('/proc/1/cgroup', 'utf8');
    return cgroup.includes('docker') || cgroup.includes('containerd');
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}