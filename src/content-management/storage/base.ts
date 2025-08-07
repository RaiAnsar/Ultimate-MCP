/**
 * Base Content Storage Interface
 * Provides abstraction for different storage backends
 */

import {
  ContentEntry,
  ContentAsset,
  ContentType,
  ContentSpace,
  ContentEnvironment,
  ContentComment,
  ContentFilter,
  ContentPagination,
  ContentSearchOptions,
  ContentHistory,
  ContentManagerStats
} from '../types.js';

export abstract class BaseContentStorage {
  protected abstract name: string;
  
  // Space management
  abstract createSpace(space: Omit<ContentSpace, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentSpace>;
  abstract getSpace(spaceId: string): Promise<ContentSpace | null>;
  abstract updateSpace(spaceId: string, updates: Partial<ContentSpace>): Promise<ContentSpace>;
  abstract deleteSpace(spaceId: string): Promise<void>;
  abstract listSpaces(): Promise<ContentSpace[]>;
  
  // Environment management
  abstract createEnvironment(
    spaceId: string,
    environment: Omit<ContentEnvironment, 'id' | 'spaceId' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentEnvironment>;
  abstract getEnvironment(environmentId: string): Promise<ContentEnvironment | null>;
  abstract listEnvironments(spaceId: string): Promise<ContentEnvironment[]>;
  abstract deleteEnvironment(environmentId: string): Promise<void>;
  
  // Content type management
  abstract createContentType(
    spaceId: string,
    contentType: Omit<ContentType, 'id'>
  ): Promise<ContentType>;
  abstract getContentType(typeId: string): Promise<ContentType | null>;
  abstract updateContentType(typeId: string, updates: Partial<ContentType>): Promise<ContentType>;
  abstract deleteContentType(typeId: string): Promise<void>;
  abstract listContentTypes(spaceId: string): Promise<ContentType[]>;
  
  // Entry management
  abstract createEntry(
    spaceId: string,
    entry: Omit<ContentEntry, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<ContentEntry>;
  abstract getEntry(entryId: string): Promise<ContentEntry | null>;
  abstract updateEntry(entryId: string, updates: Partial<ContentEntry>): Promise<ContentEntry>;
  abstract deleteEntry(entryId: string): Promise<void>;
  abstract searchEntries(options: ContentSearchOptions): Promise<{
    entries: ContentEntry[];
    pagination: ContentPagination;
  }>;
  
  // Asset management
  abstract createAsset(
    spaceId: string,
    asset: Omit<ContentAsset, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<ContentAsset>;
  abstract getAsset(assetId: string): Promise<ContentAsset | null>;
  abstract updateAsset(assetId: string, updates: Partial<ContentAsset>): Promise<ContentAsset>;
  abstract deleteAsset(assetId: string): Promise<void>;
  abstract searchAssets(options: ContentSearchOptions): Promise<{
    assets: ContentAsset[];
    pagination: ContentPagination;
  }>;
  
  // Comment management
  abstract createComment(
    comment: Omit<ContentComment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentComment>;
  abstract getComment(commentId: string): Promise<ContentComment | null>;
  abstract updateComment(commentId: string, updates: Partial<ContentComment>): Promise<ContentComment>;
  abstract deleteComment(commentId: string): Promise<void>;
  abstract getEntryComments(entryId: string): Promise<ContentComment[]>;
  abstract getCommentThread(commentId: string): Promise<ContentComment[]>;
  
  // History management
  abstract getEntryHistory(entryId: string): Promise<ContentHistory>;
  abstract restoreVersion(entryId: string, version: number): Promise<ContentEntry>;
  
  // Statistics
  abstract getStats(spaceId?: string): Promise<ContentManagerStats>;
  
  // Utility methods
  protected generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  protected applyFilter<T extends { fields?: any; tags?: string[]; createdAt: Date; updatedAt: Date }>(
    items: T[],
    filter: ContentFilter
  ): T[] {
    return items.filter(item => {
      // Status filter
      if (filter.status && 'status' in item) {
        if (!filter.status.includes((item as any).status)) {
          return false;
        }
      }
      
      // Tag filter
      if (filter.tags && item.tags) {
        const hasAllTags = filter.tags.every(tag => item.tags!.includes(tag));
        if (!hasAllTags) return false;
      }
      
      // Date filters
      if (filter.createdAfter && item.createdAt < filter.createdAfter) {
        return false;
      }
      
      if (filter.updatedAfter && item.updatedAt < filter.updatedAfter) {
        return false;
      }
      
      // Search filter (simple text search in fields)
      if (filter.search && item.fields) {
        const searchLower = filter.search.toLowerCase();
        const fieldsStr = JSON.stringify(item.fields).toLowerCase();
        if (!fieldsStr.includes(searchLower)) {
          return false;
        }
      }
      
      // Field filters
      if (filter.fields && item.fields) {
        for (const [key, value] of Object.entries(filter.fields)) {
          if (item.fields[key] !== value) {
            return false;
          }
        }
      }
      
      return true;
    });
  }
  
  protected paginate<T>(
    items: T[],
    pagination: ContentPagination
  ): { items: T[]; pagination: ContentPagination } {
    const start = pagination.offset;
    const end = start + pagination.limit;
    const paginatedItems = items.slice(start, end);
    
    return {
      items: paginatedItems,
      pagination: {
        ...pagination,
        total: items.length,
        hasNext: end < items.length,
        hasPrevious: start > 0
      }
    };
  }
}