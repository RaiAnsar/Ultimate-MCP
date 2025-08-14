/**
 * In-Memory Content Storage
 * Simple implementation for development and testing
 */

import { BaseContentStorage } from './base.js';
import {
  ContentEntry,
  ContentAsset,
  ContentType,
  ContentSpace,
  ContentEnvironment,
  ContentComment,
  ContentSearchOptions,
  ContentHistory,
  ContentManagerStats,
  ContentStatus,
  ContentVersion,
  ContentPagination,
  ContentChange
} from '../types.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('MemoryContentStorage');

export class MemoryContentStorage extends BaseContentStorage {
  protected name = 'memory';
  
  private spaces = new Map<string, ContentSpace>();
  private environments = new Map<string, ContentEnvironment>();
  private contentTypes = new Map<string, ContentType>();
  private entries = new Map<string, ContentEntry>();
  private assets = new Map<string, ContentAsset>();
  private comments = new Map<string, ContentComment>();
  private history = new Map<string, ContentVersion[]>();
  
  // Space management
  async createSpace(space: Omit<ContentSpace, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentSpace> {
    const newSpace: ContentSpace = {
      ...space,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      environments: []
    };
    
    this.spaces.set(newSpace.id, newSpace);
    
    // Create default environment
    const defaultEnv = await this.createEnvironment(newSpace.id, {
      name: 'master',
      isActive: true
    });
    
    newSpace.environments = [defaultEnv];
    logger.info(`Created space: ${newSpace.name}`);
    
    return newSpace;
  }
  
  async getSpace(spaceId: string): Promise<ContentSpace | null> {
    return this.spaces.get(spaceId) || null;
  }
  
  async updateSpace(spaceId: string, updates: Partial<ContentSpace>): Promise<ContentSpace> {
    const space = this.spaces.get(spaceId);
    if (!space) {
      throw new Error(`Space not found: ${spaceId}`);
    }
    
    const updated = {
      ...space,
      ...updates,
      id: space.id,
      createdAt: space.createdAt,
      updatedAt: new Date()
    };
    
    this.spaces.set(spaceId, updated);
    return updated;
  }
  
  async deleteSpace(spaceId: string): Promise<void> {
    // Delete all related data
    for (const [envId, env] of this.environments) {
      if (env.spaceId === spaceId) {
        this.environments.delete(envId);
      }
    }
    
    for (const [entryId, entry] of this.entries) {
      // Check if entry belongs to this space
      this.entries.delete(entryId);
    }
    
    for (const [assetId, asset] of this.assets) {
      // Check if asset belongs to this space
      this.assets.delete(assetId);
    }
    
    this.spaces.delete(spaceId);
    logger.info(`Deleted space: ${spaceId}`);
  }
  
  async listSpaces(): Promise<ContentSpace[]> {
    return Array.from(this.spaces.values());
  }
  
  // Environment management
  async createEnvironment(
    spaceId: string,
    environment: Omit<ContentEnvironment, 'id' | 'spaceId' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentEnvironment> {
    const newEnv: ContentEnvironment = {
      ...environment,
      id: this.generateId(),
      spaceId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.environments.set(newEnv.id, newEnv);
    return newEnv;
  }
  
  async getEnvironment(environmentId: string): Promise<ContentEnvironment | null> {
    return this.environments.get(environmentId) || null;
  }
  
  async listEnvironments(spaceId: string): Promise<ContentEnvironment[]> {
    return Array.from(this.environments.values())
      .filter(env => env.spaceId === spaceId);
  }
  
  async deleteEnvironment(environmentId: string): Promise<void> {
    this.environments.delete(environmentId);
  }
  
  // Content type management
  async createContentType(
    spaceId: string,
    contentType: Omit<ContentType, 'id'>
  ): Promise<ContentType> {
    const newType: ContentType = {
      ...contentType,
      id: this.generateId()
    };
    
    this.contentTypes.set(newType.id, newType);
    logger.info(`Created content type: ${newType.name}`);
    
    return newType;
  }
  
  async getContentType(typeId: string): Promise<ContentType | null> {
    return this.contentTypes.get(typeId) || null;
  }
  
  async updateContentType(typeId: string, updates: Partial<ContentType>): Promise<ContentType> {
    const type = this.contentTypes.get(typeId);
    if (!type) {
      throw new Error(`Content type not found: ${typeId}`);
    }
    
    const updated = {
      ...type,
      ...updates,
      id: type.id
    };
    
    this.contentTypes.set(typeId, updated);
    return updated;
  }
  
  async deleteContentType(typeId: string): Promise<void> {
    this.contentTypes.delete(typeId);
  }
  
  async listContentTypes(spaceId: string): Promise<ContentType[]> {
    // In a real implementation, content types would be associated with spaces
    return Array.from(this.contentTypes.values());
  }
  
  // Entry management
  async createEntry(
    spaceId: string,
    entry: Omit<ContentEntry, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<ContentEntry> {
    const newEntry: ContentEntry = {
      ...entry,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    this.entries.set(newEntry.id, newEntry);
    
    // Add to history
    this.addToHistory(newEntry.id, {
      version: 1,
      author: entry.author || 'system',
      changes: Object.keys(entry.fields).map(field => ({
        field,
        oldValue: undefined,
        newValue: entry.fields[field],
        action: 'added' as const
      })),
      timestamp: new Date()
    });
    
    logger.info(`Created entry: ${newEntry.id}`);
    return newEntry;
  }
  
  async getEntry(entryId: string): Promise<ContentEntry | null> {
    return this.entries.get(entryId) || null;
  }
  
  async updateEntry(entryId: string, updates: Partial<ContentEntry>): Promise<ContentEntry> {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }
    
    const changes = [];
    if (updates.fields) {
      for (const [field, newValue] of Object.entries(updates.fields)) {
        const oldValue = entry.fields[field];
        if (oldValue !== newValue) {
          changes.push({
            field,
            oldValue,
            newValue,
            action: (oldValue === undefined ? 'added' : 'modified') as 'added' | 'modified'
          });
        }
      }
    }
    
    const updated = {
      ...entry,
      ...updates,
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: new Date(),
      version: entry.version + 1
    };
    
    this.entries.set(entryId, updated);
    
    // Add to history
    if (changes.length > 0) {
      this.addToHistory(entryId, {
        version: updated.version,
        author: updates.author || entry.author || 'system',
        changes,
        timestamp: new Date()
      });
    }
    
    return updated;
  }
  
  async deleteEntry(entryId: string): Promise<void> {
    // Delete associated comments
    for (const [commentId, comment] of this.comments) {
      if (comment.entryId === entryId) {
        this.comments.delete(commentId);
      }
    }
    
    // Delete history
    this.history.delete(entryId);
    
    this.entries.delete(entryId);
    logger.info(`Deleted entry: ${entryId}`);
  }
  
  async searchEntries(options: ContentSearchOptions): Promise<{
    entries: ContentEntry[];
    pagination: ContentPagination;
  }> {
    let entries = Array.from(this.entries.values());
    
    // Apply filters
    entries = this.applyFilter(entries, options);
    
    // Apply sorting
    if (options.sort) {
      entries.sort((a, b) => {
        const aVal = a.fields[options.sort!.field] || '';
        const bVal = b.fields[options.sort!.field] || '';
        const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sort!.order === 'asc' ? compare : -compare;
      });
    }
    
    // Apply pagination
    const result = this.paginate(entries, options.pagination);
    
    return {
      entries: result.items,
      pagination: result.pagination
    };
  }
  
  // Asset management
  async createAsset(
    spaceId: string,
    asset: Omit<ContentAsset, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<ContentAsset> {
    const newAsset: ContentAsset = {
      ...asset,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
    
    this.assets.set(newAsset.id, newAsset);
    logger.info(`Created asset: ${newAsset.title}`);
    
    return newAsset;
  }
  
  async getAsset(assetId: string): Promise<ContentAsset | null> {
    return this.assets.get(assetId) || null;
  }
  
  async updateAsset(assetId: string, updates: Partial<ContentAsset>): Promise<ContentAsset> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    
    const updated = {
      ...asset,
      ...updates,
      id: asset.id,
      createdAt: asset.createdAt,
      updatedAt: new Date(),
      version: asset.version + 1
    };
    
    this.assets.set(assetId, updated);
    return updated;
  }
  
  async deleteAsset(assetId: string): Promise<void> {
    this.assets.delete(assetId);
    logger.info(`Deleted asset: ${assetId}`);
  }
  
  async searchAssets(options: ContentSearchOptions): Promise<{
    assets: ContentAsset[];
    pagination: ContentPagination;
  }> {
    let assets = Array.from(this.assets.values());
    
    // Apply filters
    assets = this.applyFilter(assets, options);
    
    // Apply sorting
    if (options.sort) {
      assets.sort((a, b) => {
        const aVal = (a as any)[options.sort!.field] || '';
        const bVal = (b as any)[options.sort!.field] || '';
        const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sort!.order === 'asc' ? compare : -compare;
      });
    }
    
    // Apply pagination
    const result = this.paginate(assets, options.pagination);
    
    return {
      assets: result.items,
      pagination: result.pagination
    };
  }
  
  // Comment management
  async createComment(
    comment: Omit<ContentComment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentComment> {
    const newComment: ContentComment = {
      ...comment,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: []
    };
    
    this.comments.set(newComment.id, newComment);
    
    // If it's a reply, add to parent's replies
    if (comment.parentId) {
      const parent = this.comments.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(newComment);
      }
    }
    
    logger.info(`Created comment on entry ${newComment.entryId}`);
    return newComment;
  }
  
  async getComment(commentId: string): Promise<ContentComment | null> {
    return this.comments.get(commentId) || null;
  }
  
  async updateComment(commentId: string, updates: Partial<ContentComment>): Promise<ContentComment> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }
    
    const updated = {
      ...comment,
      ...updates,
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: new Date()
    };
    
    this.comments.set(commentId, updated);
    return updated;
  }
  
  async deleteComment(commentId: string): Promise<void> {
    const comment = this.comments.get(commentId);
    if (!comment) return;
    
    // Remove from parent's replies if it's a reply
    if (comment.parentId) {
      const parent = this.comments.get(comment.parentId);
      if (parent && parent.replies) {
        parent.replies = parent.replies.filter(r => r.id !== commentId);
      }
    }
    
    // Delete all replies
    if (comment.replies) {
      for (const reply of comment.replies) {
        await this.deleteComment(reply.id);
      }
    }
    
    this.comments.delete(commentId);
  }
  
  async getEntryComments(entryId: string): Promise<ContentComment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.entryId === entryId && !comment.parentId);
  }
  
  async getCommentThread(commentId: string): Promise<ContentComment[]> {
    const comment = this.comments.get(commentId);
    if (!comment) return [];
    
    const thread: ContentComment[] = [comment];
    
    // Get all replies recursively
    const addReplies = (parent: ContentComment) => {
      if (parent.replies) {
        for (const reply of parent.replies) {
          thread.push(reply);
          addReplies(reply);
        }
      }
    };
    
    addReplies(comment);
    return thread;
  }
  
  // History management
  async getEntryHistory(entryId: string): Promise<ContentHistory> {
    const versions = this.history.get(entryId) || [];
    
    return {
      entryId,
      versions: versions.sort((a, b) => b.version - a.version)
    };
  }
  
  async restoreVersion(entryId: string, version: number): Promise<ContentEntry> {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }
    
    const history = await this.getEntryHistory(entryId);
    const targetVersion = history.versions.find(v => v.version === version);
    
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for entry ${entryId}`);
    }
    
    // Reconstruct fields from changes
    const restoredFields = { ...entry.fields };
    for (const change of targetVersion.changes) {
      if (change.action === 'removed') {
        delete restoredFields[change.field];
      } else {
        restoredFields[change.field] = change.newValue;
      }
    }
    
    return this.updateEntry(entryId, {
      fields: restoredFields,
      author: 'system-restore'
    });
  }
  
  // Statistics
  async getStats(spaceId?: string): Promise<ContentManagerStats> {
    const entries = Array.from(this.entries.values());
    const assets = Array.from(this.assets.values());
    const comments = Array.from(this.comments.values());
    
    const entryTypes: Record<string, number> = {};
    const statusBreakdown: Record<ContentStatus, number> = {
      draft: 0,
      published: 0,
      archived: 0,
      deleted: 0
    };
    
    for (const entry of entries) {
      entryTypes[entry.type] = (entryTypes[entry.type] || 0) + 1;
      statusBreakdown[entry.status]++;
    }
    
    // Calculate storage (rough estimate)
    const entriesSize = entries.reduce((acc, e) => acc + JSON.stringify(e).length, 0);
    const assetsSize = assets.reduce((acc, a) => acc + (a.file.size || 0), 0);
    
    // Find last activity
    const allDates = [
      ...entries.map(e => e.updatedAt),
      ...assets.map(a => a.updatedAt),
      ...comments.map(c => c.updatedAt)
    ];
    const lastActivity = allDates.length > 0 
      ? new Date(Math.max(...allDates.map(d => d.getTime())))
      : new Date();
    
    return {
      totalEntries: entries.length,
      totalAssets: assets.length,
      totalComments: comments.length,
      entryTypes,
      statusBreakdown,
      storageUsed: entriesSize + assetsSize,
      lastActivity
    };
  }
  
  // Private helper methods
  private addToHistory(entryId: string, version: ContentVersion): void {
    const versions = this.history.get(entryId) || [];
    versions.push(version);
    this.history.set(entryId, versions);
  }
}