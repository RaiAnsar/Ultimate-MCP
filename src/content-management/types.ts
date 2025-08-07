/**
 * Content Management Types
 * Inspired by contentful-mcp for comprehensive content operations
 */

export interface ContentSpace {
  id: string;
  name: string;
  description?: string;
  environments: ContentEnvironment[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ContentEnvironment {
  id: string;
  name: string;
  spaceId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentType {
  id: string;
  name: string;
  description?: string;
  displayField?: string;
  fields: ContentField[];
  metadata?: Record<string, any>;
}

export interface ContentField {
  id: string;
  name: string;
  type: ContentFieldType;
  required: boolean;
  localized: boolean;
  validations?: ContentValidation[];
  defaultValue?: any;
  metadata?: Record<string, any>;
}

export type ContentFieldType = 
  | 'Symbol'
  | 'Text'
  | 'RichText'
  | 'Integer'
  | 'Number'
  | 'Boolean'
  | 'Date'
  | 'Location'
  | 'Media'
  | 'Reference'
  | 'Array'
  | 'Object'
  | 'JSON';

export interface ContentValidation {
  type: string;
  params?: any;
  message?: string;
}

export interface ContentEntry {
  id: string;
  type: string;
  fields: Record<string, any>;
  status: ContentStatus;
  version: number;
  locale?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  author?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export type ContentStatus = 'draft' | 'published' | 'archived' | 'deleted';

export interface ContentAsset {
  id: string;
  title: string;
  description?: string;
  file: AssetFile;
  status: ContentStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface AssetFile {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  checksum?: string;
}

export interface ContentComment {
  id: string;
  entryId: string;
  parentId?: string;
  author: string;
  body: string;
  status: 'active' | 'resolved' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  replies?: ContentComment[];
}

export interface ContentFilter {
  contentType?: string;
  status?: ContentStatus[];
  tags?: string[];
  search?: string;
  locale?: string;
  createdAfter?: Date;
  updatedAfter?: Date;
  author?: string;
  fields?: Record<string, any>;
}

export interface ContentPagination {
  limit: number;
  offset: number;
  total?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface ContentBulkOperation {
  action: 'publish' | 'unpublish' | 'archive' | 'delete' | 'validate';
  entryIds: string[];
  options?: {
    skipValidation?: boolean;
    force?: boolean;
    locale?: string;
  };
}

export interface ContentValidationResult {
  valid: boolean;
  errors: ContentValidationError[];
  warnings: ContentValidationWarning[];
}

export interface ContentValidationError {
  field: string;
  message: string;
  code: string;
  details?: any;
}

export interface ContentValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ContentSearchOptions extends ContentFilter {
  pagination: ContentPagination;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  include?: ('author' | 'tags' | 'comments' | 'history')[];
}

export interface ContentHistory {
  entryId: string;
  versions: ContentVersion[];
}

export interface ContentVersion {
  version: number;
  author: string;
  changes: ContentChange[];
  timestamp: Date;
  message?: string;
}

export interface ContentChange {
  field: string;
  oldValue: any;
  newValue: any;
  action: 'added' | 'modified' | 'removed';
}

export interface ContentImportOptions {
  format: 'json' | 'csv' | 'xml' | 'markdown';
  mapping?: Record<string, string>;
  skipValidation?: boolean;
  updateExisting?: boolean;
  locale?: string;
}

export interface ContentExportOptions {
  format: 'json' | 'csv' | 'xml' | 'markdown';
  filter?: ContentFilter;
  fields?: string[];
  includeMetadata?: boolean;
  includeAssets?: boolean;
}

export interface ContentManagerConfig {
  maxItemsPerPage: number;
  defaultLocale: string;
  supportedLocales: string[];
  enableVersioning: boolean;
  enableComments: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface ContentManagerStats {
  totalEntries: number;
  totalAssets: number;
  totalComments: number;
  entryTypes: Record<string, number>;
  statusBreakdown: Record<ContentStatus, number>;
  storageUsed: number;
  lastActivity: Date;
}