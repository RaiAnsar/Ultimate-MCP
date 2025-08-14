/**
 * Content Manager
 * Orchestrates content operations with validation, caching, and bulk operations
 */

import {
  ContentEntry,
  ContentAsset,
  ContentType,
  ContentSpace,
  ContentComment,
  ContentSearchOptions,
  ContentBulkOperation,
  ContentValidationResult,
  ContentImportOptions,
  ContentExportOptions,
  ContentManagerConfig,
  ContentManagerStats,
  ContentFilter,
  ContentPagination
} from './types.js';
import { BaseContentStorage } from './storage/base.js';
import { MemoryContentStorage } from './storage/memory.js';
import { Logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger('ContentManager');

export class ContentManager {
  private storage: BaseContentStorage;
  private config: ContentManagerConfig;
  private cache = new Map<string, { data: any; expires: number }>();
  
  constructor(config?: Partial<ContentManagerConfig>) {
    this.config = {
      maxItemsPerPage: 3, // Follow contentful-mcp pattern
      defaultLocale: 'en-US',
      supportedLocales: ['en-US'],
      enableVersioning: true,
      enableComments: true,
      autoSave: false,
      autoSaveInterval: 60000,
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    };
    
    // Initialize storage (can be extended to support different backends)
    this.storage = new MemoryContentStorage();
  }
  
  // Space operations
  async createSpace(name: string, description?: string): Promise<ContentSpace> {
    const space = await this.storage.createSpace({ 
      name, 
      description,
      environments: []
    });
    this.invalidateCache('spaces');
    return space;
  }
  
  async getSpace(spaceId: string): Promise<ContentSpace | null> {
    const cacheKey = `space:${spaceId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const space = await this.storage.getSpace(spaceId);
    if (space) {
      this.setCache(cacheKey, space);
    }
    return space;
  }
  
  async listSpaces(): Promise<ContentSpace[]> {
    const cached = this.getFromCache('spaces');
    if (cached) return cached;
    
    const spaces = await this.storage.listSpaces();
    this.setCache('spaces', spaces);
    return spaces;
  }
  
  // Content type operations
  async createContentType(
    spaceId: string,
    name: string,
    fields: any[],
    options?: Partial<ContentType>
  ): Promise<ContentType> {
    const contentType = await this.storage.createContentType(spaceId, {
      name,
      fields,
      ...options
    });
    
    this.invalidateCache(`types:${spaceId}`);
    return contentType;
  }
  
  async getContentType(typeId: string): Promise<ContentType | null> {
    const cacheKey = `type:${typeId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const type = await this.storage.getContentType(typeId);
    if (type) {
      this.setCache(cacheKey, type);
    }
    return type;
  }
  
  // Entry operations
  async createEntry(
    spaceId: string,
    type: string,
    fields: Record<string, any>,
    options?: Partial<ContentEntry>
  ): Promise<ContentEntry> {
    // Validate fields against content type
    const contentType = await this.getContentType(type);
    if (!contentType) {
      throw new Error(`Content type not found: ${type}`);
    }
    
    const validation = await this.validateFields(fields, contentType);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const entry = await this.storage.createEntry(spaceId, {
      type,
      fields,
      status: 'draft',
      ...options
    });
    
    this.invalidateCache(`entries:${spaceId}`);
    logger.info(`Created entry ${entry.id} of type ${type}`);
    
    return entry;
  }
  
  async getEntry(entryId: string): Promise<ContentEntry | null> {
    const cacheKey = `entry:${entryId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const entry = await this.storage.getEntry(entryId);
    if (entry) {
      this.setCache(cacheKey, entry);
    }
    return entry;
  }
  
  async updateEntry(
    entryId: string,
    updates: Partial<ContentEntry>
  ): Promise<ContentEntry> {
    const entry = await this.getEntry(entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }
    
    // Validate if fields are being updated
    if (updates.fields) {
      const contentType = await this.getContentType(entry.type);
      if (contentType) {
        const validation = await this.validateFields(
          { ...entry.fields, ...updates.fields },
          contentType
        );
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }
    }
    
    const updated = await this.storage.updateEntry(entryId, updates);
    this.invalidateCache(`entry:${entryId}`);
    
    return updated;
  }
  
  async searchEntries(
    filter?: ContentFilter,
    pagination?: Partial<ContentPagination>
  ): Promise<{ entries: ContentEntry[]; pagination: ContentPagination }> {
    const options: ContentSearchOptions = {
      ...filter,
      pagination: {
        limit: pagination?.limit || this.config.maxItemsPerPage,
        offset: pagination?.offset || 0
      }
    };
    
    return this.storage.searchEntries(options);
  }
  
  // Asset operations
  async uploadAsset(
    spaceId: string,
    filePath: string,
    title: string,
    options?: Partial<ContentAsset>
  ): Promise<ContentAsset> {
    // Read file info
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const contentType = this.getMimeType(fileName);
    
    const asset = await this.storage.createAsset(spaceId, {
      title,
      file: {
        url: `file://${filePath}`,
        fileName,
        contentType,
        size: stats.size
      },
      status: 'draft',
      ...options
    });
    
    logger.info(`Uploaded asset: ${title}`);
    return asset;
  }
  
  async getAsset(assetId: string): Promise<ContentAsset | null> {
    const cacheKey = `asset:${assetId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const asset = await this.storage.getAsset(assetId);
    if (asset) {
      this.setCache(cacheKey, asset);
    }
    return asset;
  }
  
  // Comment operations
  async addComment(
    entryId: string,
    author: string,
    body: string,
    parentId?: string
  ): Promise<ContentComment> {
    if (!this.config.enableComments) {
      throw new Error('Comments are disabled');
    }
    
    // Work around 512 character limit by splitting if needed
    if (body.length > 512) {
      logger.warn('Comment exceeds 512 characters, will be truncated');
      body = body.substring(0, 509) + '...';
    }
    
    const comment = await this.storage.createComment({
      entryId,
      parentId,
      author,
      body,
      status: 'active'
    });
    
    return comment;
  }
  
  async getEntryComments(entryId: string): Promise<ContentComment[]> {
    if (!this.config.enableComments) {
      return [];
    }
    
    return this.storage.getEntryComments(entryId);
  }
  
  // Bulk operations
  async executeBulkOperation(operation: ContentBulkOperation): Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    
    for (const entryId of operation.entryIds) {
      try {
        switch (operation.action) {
          case 'publish':
            await this.updateEntry(entryId, {
              status: 'published',
              publishedAt: new Date()
            });
            break;
            
          case 'unpublish':
            await this.updateEntry(entryId, {
              status: 'draft',
              publishedAt: undefined
            });
            break;
            
          case 'archive':
            await this.updateEntry(entryId, { status: 'archived' });
            break;
            
          case 'delete':
            await this.storage.deleteEntry(entryId);
            break;
            
          case 'validate':
            const entry = await this.getEntry(entryId);
            if (entry) {
              const contentType = await this.getContentType(entry.type);
              if (contentType) {
                const validation = await this.validateFields(entry.fields, contentType);
                if (!validation.valid) {
                  throw new Error(validation.errors.map(e => e.message).join(', '));
                }
              }
            }
            break;
        }
        
        succeeded.push(entryId);
      } catch (error) {
        failed.push({
          id: entryId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    logger.info(`Bulk ${operation.action}: ${succeeded.length} succeeded, ${failed.length} failed`);
    
    return { succeeded, failed };
  }
  
  // Import/Export
  async importContent(
    spaceId: string,
    data: string | Buffer,
    options: ContentImportOptions
  ): Promise<{ imported: number; errors: string[] }> {
    let entries: any[] = [];
    const errors: string[] = [];
    
    try {
      // Parse data based on format
      switch (options.format) {
        case 'json':
          entries = JSON.parse(data.toString());
          break;
          
        case 'csv':
          // Simple CSV parsing (in production, use a proper CSV parser)
          const lines = data.toString().split('\n');
          const headers = lines[0].split(',');
          entries = lines.slice(1).map(line => {
            const values = line.split(',');
            const entry: any = {};
            headers.forEach((header, i) => {
              entry[header.trim()] = values[i]?.trim();
            });
            return entry;
          });
          break;
          
        default:
          throw new Error(`Unsupported import format: ${options.format}`);
      }
    } catch (error) {
      errors.push(`Failed to parse data: ${error}`);
      return { imported: 0, errors };
    }
    
    let imported = 0;
    
    for (const entryData of entries) {
      try {
        // Apply field mapping if provided
        let fields = entryData;
        if (options.mapping) {
          fields = {};
          for (const [source, target] of Object.entries(options.mapping)) {
            if (entryData[source] !== undefined) {
              fields[target] = entryData[source];
            }
          }
        }
        
        await this.createEntry(
          spaceId,
          entryData.type || 'imported',
          fields,
          { locale: options.locale }
        );
        
        imported++;
      } catch (error) {
        errors.push(`Failed to import entry: ${error}`);
      }
    }
    
    return { imported, errors };
  }
  
  async exportContent(
    spaceId: string,
    options: ContentExportOptions
  ): Promise<string> {
    const { entries } = await this.searchEntries(options.filter, {
      limit: 1000, // Export up to 1000 entries
      offset: 0
    });
    
    // Filter fields if specified
    let exportData = entries;
    if (options.fields) {
      exportData = entries.map(entry => {
        const filtered: any = { id: entry.id, type: entry.type };
        for (const field of options.fields!) {
          if (entry.fields[field] !== undefined) {
            filtered[field] = entry.fields[field];
          }
        }
        return filtered;
      });
    }
    
    // Format output
    switch (options.format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
        
      case 'csv':
        // Simple CSV generation
        if (exportData.length === 0) return '';
        const headers = Object.keys(exportData[0]);
        const csv = [
          headers.join(','),
          ...exportData.map(entry => 
            headers.map(h => JSON.stringify((entry as any)[h] || '')).join(',')
          )
        ];
        return csv.join('\n');
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }
  
  // Statistics
  async getStats(spaceId?: string): Promise<ContentManagerStats> {
    return this.storage.getStats(spaceId);
  }
  
  // Validation
  private async validateFields(
    fields: Record<string, any>,
    contentType: ContentType
  ): Promise<ContentValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Check required fields
    for (const field of contentType.fields) {
      if (field.required && !fields[field.id]) {
        errors.push({
          field: field.id,
          message: `Field '${field.name}' is required`,
          code: 'REQUIRED_FIELD'
        });
      }
      
      // Type validation
      if (fields[field.id] !== undefined) {
        const value = fields[field.id];
        const typeValid = this.validateFieldType(value, field.type);
        if (!typeValid) {
          errors.push({
            field: field.id,
            message: `Field '${field.name}' has invalid type. Expected ${field.type}`,
            code: 'INVALID_TYPE'
          });
        }
      }
      
      // Custom validations
      if (field.validations) {
        for (const validation of field.validations) {
          const result = this.runValidation(fields[field.id], validation);
          if (!result.valid) {
            errors.push({
              field: field.id,
              message: result.message || `Validation failed: ${validation.type}`,
              code: validation.type,
              details: validation.params
            });
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private validateFieldType(value: any, type: string): boolean {
    switch (type) {
      case 'Symbol':
      case 'Text':
        return typeof value === 'string';
      case 'Integer':
        return Number.isInteger(value);
      case 'Number':
        return typeof value === 'number';
      case 'Boolean':
        return typeof value === 'boolean';
      case 'Date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'Array':
        return Array.isArray(value);
      case 'Object':
      case 'JSON':
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }
  
  private runValidation(value: any, validation: any): { valid: boolean; message?: string } {
    switch (validation.type) {
      case 'size':
        if (validation.params?.min && value.length < validation.params.min) {
          return { valid: false, message: `Minimum length is ${validation.params.min}` };
        }
        if (validation.params?.max && value.length > validation.params.max) {
          return { valid: false, message: `Maximum length is ${validation.params.max}` };
        }
        break;
        
      case 'regexp':
        if (validation.params?.pattern) {
          const regex = new RegExp(validation.params.pattern);
          if (!regex.test(value)) {
            return { valid: false, message: `Value must match pattern: ${validation.params.pattern}` };
          }
        }
        break;
        
      case 'unique':
        // This would require checking against other entries
        break;
    }
    
    return { valid: true };
  }
  
  // Cache management
  private getFromCache(key: string): any {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }
  
  private setCache(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;
    
    this.cache.set(key, {
      data,
      expires: Date.now() + this.config.cacheTTL
    });
  }
  
  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}