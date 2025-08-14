/**
 * Content Management Tools
 * MCP tools for comprehensive content operations inspired by contentful-mcp
 */

import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { ContentManager } from '../content-management/content-manager.js';
import { Logger } from '../utils/logger.js';
import {
  ContentStatus,
  ContentFieldType,
  ContentBulkOperation
} from '../content-management/types.js';

const logger = new Logger('ContentManagementTools');

// Global content manager instance
let contentManager: ContentManager | null = null;

// Initialize content manager
function getContentManager(): ContentManager {
  if (!contentManager) {
    contentManager = new ContentManager({
      maxItemsPerPage: 3, // Follow contentful-mcp pattern
      enableVersioning: true,
      enableComments: true,
      cacheEnabled: true
    });
  }
  return contentManager;
}

// Space management tools

export const createSpace: ToolDefinition = {
  name: 'content_create_space',
  description: 'Create a new content space for organizing content',
  inputSchema: z.object({
    name: z.string().describe('Space name'),
    description: z.string().optional().describe('Space description')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const space = await manager.createSpace(args.name, args.description);
    
    return {
      space: {
        id: space.id,
        name: space.name,
        description: space.description,
        environments: space.environments.map(e => ({
          id: e.id,
          name: e.name,
          isActive: e.isActive
        })),
        createdAt: space.createdAt,
        updatedAt: space.updatedAt
      },
      message: `Space '${space.name}' created successfully with ID: ${space.id}`
    };
  }
};

export const listSpaces: ToolDefinition = {
  name: 'content_list_spaces',
  description: 'List all content spaces',
  inputSchema: z.object({}).strict() as any,
  handler: async () => {
    const manager = getContentManager();
    const spaces = await manager.listSpaces();
    
    return {
      spaces: spaces.map(space => ({
        id: space.id,
        name: space.name,
        description: space.description,
        environmentCount: space.environments.length,
        createdAt: space.createdAt
      })),
      total: spaces.length
    };
  }
};

// Content type tools

export const createContentType: ToolDefinition = {
  name: 'content_create_type',
  description: 'Create a new content type schema',
  inputSchema: z.object({
    spaceId: z.string().describe('Space ID'),
    name: z.string().describe('Content type name'),
    description: z.string().optional().describe('Description'),
    displayField: z.string().optional().describe('Field to use as display name'),
    fields: z.array(z.object({
      id: z.string().describe('Field ID'),
      name: z.string().describe('Field display name'),
      type: z.enum([
        'Symbol', 'Text', 'RichText', 'Integer', 'Number',
        'Boolean', 'Date', 'Location', 'Media', 'Reference',
        'Array', 'Object', 'JSON'
      ] as const).describe('Field type'),
      required: z.boolean().optional().default(false),
      localized: z.boolean().optional().default(false),
      validations: z.array(z.object({
        type: z.string(),
        params: z.any().optional()
      })).optional()
    })).describe('Field definitions')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const contentType = await manager.createContentType(
      args.spaceId,
      args.name,
      args.fields,
      {
        description: args.description,
        displayField: args.displayField
      }
    );
    
    return {
      contentType: {
        id: contentType.id,
        name: contentType.name,
        description: contentType.description,
        displayField: contentType.displayField,
        fieldCount: contentType.fields.length,
        fields: contentType.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          required: f.required
        }))
      },
      message: `Content type '${contentType.name}' created with ${contentType.fields.length} fields`
    };
  }
};

// Entry management tools

export const createEntry: ToolDefinition = {
  name: 'content_create_entry',
  description: 'Create a new content entry',
  inputSchema: z.object({
    spaceId: z.string().describe('Space ID'),
    contentType: z.string().describe('Content type ID'),
    fields: z.record(z.any()).describe('Field values'),
    status: z.enum(['draft', 'published']).optional().default('draft'),
    locale: z.string().optional().describe('Locale code'),
    tags: z.array(z.string()).optional().describe('Tags for organization')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const entry = await manager.createEntry(
      args.spaceId,
      args.contentType,
      args.fields,
      {
        status: args.status as ContentStatus,
        locale: args.locale,
        tags: args.tags
      }
    );
    
    return {
      entry: {
        id: entry.id,
        type: entry.type,
        status: entry.status,
        version: entry.version,
        fields: entry.fields,
        locale: entry.locale,
        tags: entry.tags,
        createdAt: entry.createdAt
      },
      message: `Entry created with ID: ${entry.id}`
    };
  }
};

export const updateEntry: ToolDefinition = {
  name: 'content_update_entry',
  description: 'Update an existing content entry',
  inputSchema: z.object({
    entryId: z.string().describe('Entry ID to update'),
    fields: z.record(z.any()).optional().describe('Updated field values'),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    tags: z.array(z.string()).optional()
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const updates: any = {};
    
    if (args.fields) updates.fields = args.fields;
    if (args.status) updates.status = args.status;
    if (args.tags) updates.tags = args.tags;
    
    const entry = await manager.updateEntry(args.entryId, updates);
    
    return {
      entry: {
        id: entry.id,
        type: entry.type,
        status: entry.status,
        version: entry.version,
        updatedAt: entry.updatedAt
      },
      message: `Entry ${entry.id} updated to version ${entry.version}`
    };
  }
};

export const searchEntries: ToolDefinition = {
  name: 'content_search_entries',
  description: 'Search and filter content entries with pagination',
  inputSchema: z.object({
    contentType: z.string().optional().describe('Filter by content type'),
    status: z.array(z.enum(['draft', 'published', 'archived'])).optional(),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    search: z.string().optional().describe('Search in fields'),
    locale: z.string().optional(),
    limit: z.number().optional().default(3).describe('Items per page (max 10)'),
    offset: z.number().optional().default(0).describe('Skip items')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const result = await manager.searchEntries(
      {
        contentType: args.contentType,
        status: args.status as ContentStatus[],
        tags: args.tags,
        search: args.search,
        locale: args.locale
      },
      {
        limit: Math.min(args.limit, 10), // Cap at 10
        offset: args.offset
      }
    );
    
    return {
      entries: result.entries.map(entry => ({
        id: entry.id,
        type: entry.type,
        status: entry.status,
        version: entry.version,
        fields: entry.fields,
        tags: entry.tags,
        updatedAt: entry.updatedAt
      })),
      pagination: {
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        total: result.pagination.total,
        hasNext: result.pagination.hasNext,
        hasPrevious: result.pagination.hasPrevious
      },
      message: `Found ${result.pagination.total} entries, showing ${result.entries.length}`
    };
  }
};

// Asset management tools

export const uploadAsset: ToolDefinition = {
  name: 'content_upload_asset',
  description: 'Upload a file as a content asset',
  inputSchema: z.object({
    spaceId: z.string().describe('Space ID'),
    filePath: z.string().describe('Local file path'),
    title: z.string().describe('Asset title'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const asset = await manager.uploadAsset(
      args.spaceId,
      args.filePath,
      args.title,
      {
        description: args.description,
        tags: args.tags
      }
    );
    
    return {
      asset: {
        id: asset.id,
        title: asset.title,
        description: asset.description,
        file: {
          url: asset.file.url,
          fileName: asset.file.fileName,
          contentType: asset.file.contentType,
          size: asset.file.size
        },
        status: asset.status,
        createdAt: asset.createdAt
      },
      message: `Asset '${asset.title}' uploaded successfully`
    };
  }
};

export const getAsset: ToolDefinition = {
  name: 'content_get_asset',
  description: 'Get asset details by ID',
  inputSchema: z.object({
    assetId: z.string().describe('Asset ID')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const asset = await manager.getAsset(args.assetId);
    
    if (!asset) {
      return {
        found: false,
        message: `Asset ${args.assetId} not found`
      };
    }
    
    return {
      found: true,
      asset: {
        id: asset.id,
        title: asset.title,
        description: asset.description,
        file: asset.file,
        status: asset.status,
        version: asset.version,
        tags: asset.tags,
        metadata: asset.metadata,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        publishedAt: asset.publishedAt
      }
    };
  }
};

// Comment management tools

export const addComment: ToolDefinition = {
  name: 'content_add_comment',
  description: 'Add a comment to an entry (max 512 characters)',
  inputSchema: z.object({
    entryId: z.string().describe('Entry ID to comment on'),
    author: z.string().describe('Comment author'),
    body: z.string().max(512).describe('Comment text (max 512 chars)'),
    parentId: z.string().optional().describe('Parent comment ID for replies')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const comment = await manager.addComment(
      args.entryId,
      args.author,
      args.body,
      args.parentId
    );
    
    return {
      comment: {
        id: comment.id,
        entryId: comment.entryId,
        author: comment.author,
        body: comment.body,
        status: comment.status,
        parentId: comment.parentId,
        createdAt: comment.createdAt
      },
      message: args.parentId 
        ? `Reply added to comment ${args.parentId}`
        : `Comment added to entry ${args.entryId}`
    };
  }
};

export const getEntryComments: ToolDefinition = {
  name: 'content_get_comments',
  description: 'Get all comments for an entry',
  inputSchema: z.object({
    entryId: z.string().describe('Entry ID')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const comments = await manager.getEntryComments(args.entryId);
    
    return {
      comments: comments.map(comment => ({
        id: comment.id,
        author: comment.author,
        body: comment.body,
        status: comment.status,
        createdAt: comment.createdAt,
        replyCount: comment.replies?.length || 0
      })),
      total: comments.length
    };
  }
};

// Bulk operations

export const bulkOperation: ToolDefinition = {
  name: 'content_bulk_operation',
  description: 'Execute bulk operations on multiple entries',
  inputSchema: z.object({
    action: z.enum(['publish', 'unpublish', 'archive', 'delete', 'validate'])
      .describe('Bulk action to perform'),
    entryIds: z.array(z.string()).describe('Entry IDs to operate on'),
    options: z.object({
      skipValidation: z.boolean().optional(),
      force: z.boolean().optional(),
      locale: z.string().optional()
    }).optional()
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const operation: ContentBulkOperation = {
      action: args.action,
      entryIds: args.entryIds,
      options: args.options
    };
    
    const result = await manager.executeBulkOperation(operation);
    
    return {
      action: args.action,
      total: args.entryIds.length,
      succeeded: result.succeeded,
      failed: result.failed,
      summary: {
        successCount: result.succeeded.length,
        failureCount: result.failed.length,
        successRate: `${Math.round((result.succeeded.length / args.entryIds.length) * 100)}%`
      },
      message: `Bulk ${args.action} completed: ${result.succeeded.length} succeeded, ${result.failed.length} failed`
    };
  }
};

// Import/Export tools

export const importContent: ToolDefinition = {
  name: 'content_import',
  description: 'Import content from JSON or CSV',
  inputSchema: z.object({
    spaceId: z.string().describe('Target space ID'),
    data: z.string().describe('Import data as string'),
    format: z.enum(['json', 'csv']).describe('Data format'),
    mapping: z.record(z.string()).optional()
      .describe('Field mapping (source -> target)'),
    updateExisting: z.boolean().optional().default(false),
    locale: z.string().optional()
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const result = await manager.importContent(
      args.spaceId,
      Buffer.from(args.data),
      {
        format: args.format,
        mapping: args.mapping,
        updateExisting: args.updateExisting,
        locale: args.locale
      }
    );
    
    return {
      imported: result.imported,
      errors: result.errors,
      success: result.errors.length === 0,
      message: `Imported ${result.imported} entries${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
    };
  }
};

export const exportContent: ToolDefinition = {
  name: 'content_export',
  description: 'Export content to JSON or CSV format',
  inputSchema: z.object({
    spaceId: z.string().describe('Space ID to export from'),
    format: z.enum(['json', 'csv']).describe('Export format'),
    filter: z.object({
      contentType: z.string().optional(),
      status: z.array(z.enum(['draft', 'published', 'archived'])).optional(),
      tags: z.array(z.string()).optional()
    }).optional(),
    fields: z.array(z.string()).optional()
      .describe('Specific fields to export'),
    includeMetadata: z.boolean().optional().default(false)
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const data = await manager.exportContent(
      args.spaceId,
      {
        format: args.format,
        filter: args.filter as any,
        fields: args.fields,
        includeMetadata: args.includeMetadata
      }
    );
    
    return {
      data,
      format: args.format,
      size: data.length,
      message: `Exported content in ${args.format} format (${data.length} bytes)`
    };
  }
};

// Statistics tool

export const getContentStats: ToolDefinition = {
  name: 'content_get_stats',
  description: 'Get content management statistics',
  inputSchema: z.object({
    spaceId: z.string().optional().describe('Space ID for space-specific stats')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContentManager();
    const stats = await manager.getStats(args.spaceId);
    
    return {
      stats: {
        totalEntries: stats.totalEntries,
        totalAssets: stats.totalAssets,
        totalComments: stats.totalComments,
        entryTypes: stats.entryTypes,
        statusBreakdown: stats.statusBreakdown,
        storageUsed: `${Math.round(stats.storageUsed / 1024)} KB`,
        lastActivity: stats.lastActivity
      },
      spaceId: args.spaceId || 'all',
      message: `Content statistics${args.spaceId ? ` for space ${args.spaceId}` : ' for all spaces'}`
    };
  }
};

// Export all content management tools
export const contentManagementTools: ToolDefinition[] = [
  // Space management
  createSpace,
  listSpaces,
  
  // Content types
  createContentType,
  
  // Entries
  createEntry,
  updateEntry,
  searchEntries,
  
  // Assets
  uploadAsset,
  getAsset,
  
  // Comments
  addComment,
  getEntryComments,
  
  // Bulk operations
  bulkOperation,
  
  // Import/Export
  importContent,
  exportContent,
  
  // Statistics
  getContentStats
];