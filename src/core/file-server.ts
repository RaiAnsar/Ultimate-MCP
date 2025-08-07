import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Logger } from '../utils/logger.js';

interface FileReference {
  id: string;
  path: string;
  content: string;
  hash: string;
  size: number;
  mimeType: string;
  created: string;
  expires: string;
}

export class FileServer {
  private logger: Logger;
  private fileCache: Map<string, FileReference> = new Map();
  private filePathMap: Map<string, string> = new Map(); // path -> id mapping
  private maxFileSize: number;
  private cacheDuration: number;

  constructor(options?: { maxFileSize?: number; cacheDuration?: number }) {
    this.logger = new Logger('FileServer');
    this.maxFileSize = options?.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.cacheDuration = options?.cacheDuration || 3600000; // 1 hour default
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Register a file for AI model access
   * Returns a reference ID that AI models can use
   */
  async registerFile(filePath: string): Promise<string> {
    try {
      // Resolve absolute path
      const absolutePath = path.resolve(filePath);
      
      // Check if already cached
      if (this.filePathMap.has(absolutePath)) {
        const existingId = this.filePathMap.get(absolutePath)!;
        const existing = this.fileCache.get(existingId);
        if (existing && new Date(existing.expires) > new Date()) {
          this.logger.debug(`File already cached: ${absolutePath}`);
          return existingId;
        }
      }
      
      // Read file
      const stats = await fs.stat(absolutePath);
      
      // Check file size
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.maxFileSize})`);
      }
      
      // Read content
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // Generate ID and hash
      const id = this.generateId();
      const hash = this.generateHash(content);
      
      // Determine MIME type
      const mimeType = this.getMimeType(absolutePath);
      
      // Create reference
      const reference: FileReference = {
        id,
        path: absolutePath,
        content,
        hash,
        size: stats.size,
        mimeType,
        created: new Date().toISOString(),
        expires: new Date(Date.now() + this.cacheDuration).toISOString()
      };
      
      // Cache the reference
      this.fileCache.set(id, reference);
      this.filePathMap.set(absolutePath, id);
      
      this.logger.info(`File registered: ${absolutePath} -> ${id}`);
      return id;
    } catch (error) {
      this.logger.error(`Failed to register file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Register multiple files at once
   */
  async registerFiles(filePaths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const filePath of filePaths) {
      try {
        const id = await this.registerFile(filePath);
        results.set(filePath, id);
      } catch (error) {
        this.logger.warn(`Skipping file ${filePath}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get file content by reference ID
   */
  async getFile(referenceId: string): Promise<FileReference | null> {
    const reference = this.fileCache.get(referenceId);
    
    if (!reference) {
      return null;
    }
    
    // Check if expired
    if (new Date(reference.expires) < new Date()) {
      this.fileCache.delete(referenceId);
      this.filePathMap.delete(reference.path);
      return null;
    }
    
    // Refresh expiration
    reference.expires = new Date(Date.now() + this.cacheDuration).toISOString();
    
    return reference;
  }

  /**
   * Get file by path
   */
  async getFileByPath(filePath: string): Promise<FileReference | null> {
    const absolutePath = path.resolve(filePath);
    const id = this.filePathMap.get(absolutePath);
    
    if (!id) {
      // Try to register it
      try {
        const newId = await this.registerFile(filePath);
        return this.getFile(newId);
      } catch (error) {
        return null;
      }
    }
    
    return this.getFile(id);
  }

  /**
   * Generate a shareable URL for OpenRouter models
   * This creates a data URL that can be passed to models
   */
  async generateDataUrl(referenceId: string): Promise<string | null> {
    const reference = await this.getFile(referenceId);
    
    if (!reference) {
      return null;
    }
    
    // For text files, create a data URL
    if (reference.mimeType.startsWith('text/') || 
        reference.mimeType === 'application/json' ||
        reference.mimeType === 'application/javascript') {
      
      const base64 = Buffer.from(reference.content).toString('base64');
      return `data:${reference.mimeType};base64,${base64}`;
    }
    
    // For other files, return the content directly
    return reference.content;
  }

  /**
   * Create a file manifest for AI models
   * This provides a structured way for models to understand available files
   */
  async createManifest(): Promise<Record<string, any>> {
    const files: any[] = [];
    
    for (const [id, reference] of this.fileCache.entries()) {
      // Skip expired files
      if (new Date(reference.expires) < new Date()) {
        continue;
      }
      
      files.push({
        id,
        path: reference.path,
        name: path.basename(reference.path),
        size: reference.size,
        mimeType: reference.mimeType,
        hash: reference.hash,
        created: reference.created,
        expires: reference.expires
      });
    }
    
    return {
      version: '1.0',
      generated: new Date().toISOString(),
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      files
    };
  }

  /**
   * Clear expired files from cache
   */
  private cleanupExpired(): void {
    const now = new Date();
    const toDelete: string[] = [];
    
    for (const [id, reference] of this.fileCache.entries()) {
      if (new Date(reference.expires) < now) {
        toDelete.push(id);
        this.filePathMap.delete(reference.path);
      }
    }
    
    for (const id of toDelete) {
      this.fileCache.delete(id);
    }
    
    if (toDelete.length > 0) {
      this.logger.debug(`Cleaned up ${toDelete.length} expired files`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Clean up every minute
  }

  /**
   * Generate unique ID for file reference
   */
  private generateId(): string {
    return `file-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate hash of file content
   */
  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Determine MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.cs': 'text/x-csharp',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.rb': 'text/x-ruby',
      '.php': 'text/x-php',
      '.swift': 'text/x-swift',
      '.kt': 'text/x-kotlin',
      '.scala': 'text/x-scala',
      '.r': 'text/x-r',
      '.sql': 'text/x-sql',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'text/xml',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.toml': 'text/toml',
      '.ini': 'text/ini',
      '.env': 'text/plain',
      '.sh': 'text/x-shellscript',
      '.bash': 'text/x-shellscript',
      '.zsh': 'text/x-shellscript',
      '.fish': 'text/x-shellscript',
      '.ps1': 'text/x-powershell',
      '.bat': 'text/x-batch',
      '.cmd': 'text/x-batch'
    };
    
    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * Get statistics about cached files
   */
  getStats(): Record<string, any> {
    const files = Array.from(this.fileCache.values());
    const active = files.filter(f => new Date(f.expires) > new Date());
    
    return {
      totalFiles: this.fileCache.size,
      activeFiles: active.length,
      totalSize: active.reduce((sum, f) => sum + f.size, 0),
      averageSize: active.length > 0 ? 
        active.reduce((sum, f) => sum + f.size, 0) / active.length : 0,
      mimeTypes: active.reduce((acc, f) => {
        acc[f.mimeType] = (acc[f.mimeType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clear all cached files
   */
  clearCache(): void {
    this.fileCache.clear();
    this.filePathMap.clear();
    this.logger.info('File cache cleared');
  }
}