# Content Management System

## Overview

The content management system in Ultimate MCP v2.0 provides comprehensive content operations inspired by contentful-mcp. It enables structured content creation, management, and organization with support for versioning, comments, and bulk operations.

## Key Features

### 1. Space Management
- **Multi-Space Support**: Organize content into separate spaces
- **Environment Isolation**: Each space has multiple environments
- **Metadata Tracking**: Custom metadata for spaces and content

### 2. Content Modeling
- **Flexible Content Types**: Define custom content schemas
- **Rich Field Types**: 13+ field types including RichText, Media, Reference
- **Field Validation**: Built-in and custom validation rules
- **Localization Support**: Multi-locale content management

### 3. Entry Management
- **Version Control**: Automatic versioning with history
- **Status Workflow**: Draft, Published, Archived states
- **Bulk Operations**: Publish, unpublish, archive, delete multiple entries
- **Smart Pagination**: Limited to 3 items per page to prevent context overflow

### 4. Asset Management
- **File Upload**: Support for images, videos, documents
- **Metadata Tracking**: Title, description, tags
- **Version Control**: Asset versioning
- **Content Type Detection**: Automatic MIME type detection

### 5. Comment System
- **Threaded Comments**: Support for replies and discussions
- **512-Character Limit**: Optimized for API constraints
- **Status Tracking**: Active, resolved, deleted states

### 6. Import/Export
- **Multiple Formats**: JSON and CSV support
- **Field Mapping**: Transform data during import
- **Selective Export**: Filter and choose specific fields

## MCP Tools

### Space Management

#### `content_create_space`
Create a new content space.

**Parameters:**
- `name`: Space name
- `description`: Optional description

**Returns:** Created space with ID and default environment

#### `content_list_spaces`
List all available spaces.

**Returns:** Array of spaces with basic information

### Content Type Management

#### `content_create_type`
Define a new content type schema.

**Parameters:**
- `spaceId`: Target space
- `name`: Type name
- `fields`: Array of field definitions
  - `id`: Field identifier
  - `name`: Display name
  - `type`: Field type (Symbol, Text, RichText, etc.)
  - `required`: Is field required
  - `validations`: Validation rules

**Example:**
```javascript
await content_create_type({
  spaceId: 'space123',
  name: 'BlogPost',
  fields: [
    {
      id: 'title',
      name: 'Title',
      type: 'Symbol',
      required: true,
      validations: [{
        type: 'size',
        params: { min: 1, max: 200 }
      }]
    },
    {
      id: 'content',
      name: 'Content',
      type: 'RichText',
      required: true
    },
    {
      id: 'publishDate',
      name: 'Publish Date',
      type: 'Date',
      required: false
    }
  ]
});
```

### Entry Management

#### `content_create_entry`
Create a new content entry.

**Parameters:**
- `spaceId`: Space ID
- `contentType`: Type ID
- `fields`: Field values
- `status`: Initial status (draft/published)
- `tags`: Optional tags

#### `content_update_entry`
Update an existing entry.

**Parameters:**
- `entryId`: Entry to update
- `fields`: Updated field values
- `status`: New status
- `tags`: Updated tags

#### `content_search_entries`
Search and filter entries with pagination.

**Parameters:**
- `contentType`: Filter by type
- `status`: Filter by status array
- `tags`: Filter by tags
- `search`: Text search in fields
- `limit`: Items per page (max 10)
- `offset`: Skip items for pagination

**Example:**
```javascript
await content_search_entries({
  contentType: 'BlogPost',
  status: ['published'],
  tags: ['featured'],
  limit: 3,
  offset: 0
});
```

### Asset Management

#### `content_upload_asset`
Upload a file as an asset.

**Parameters:**
- `spaceId`: Target space
- `filePath`: Local file path
- `title`: Asset title
- `description`: Optional description
- `tags`: Optional tags

#### `content_get_asset`
Retrieve asset details.

**Parameters:**
- `assetId`: Asset ID

**Returns:** Asset with file info and metadata

### Comment Management

#### `content_add_comment`
Add a comment to an entry.

**Parameters:**
- `entryId`: Entry to comment on
- `author`: Comment author
- `body`: Comment text (max 512 chars)
- `parentId`: For replies

#### `content_get_comments`
Get all comments for an entry.

**Parameters:**
- `entryId`: Entry ID

**Returns:** Array of comments with reply counts

### Bulk Operations

#### `content_bulk_operation`
Execute operations on multiple entries.

**Parameters:**
- `action`: Operation type (publish/unpublish/archive/delete/validate)
- `entryIds`: Array of entry IDs
- `options`: Additional options

**Example:**
```javascript
await content_bulk_operation({
  action: 'publish',
  entryIds: ['entry1', 'entry2', 'entry3'],
  options: {
    skipValidation: false
  }
});
```

### Import/Export

#### `content_import`
Import content from external data.

**Parameters:**
- `spaceId`: Target space
- `data`: Import data as string
- `format`: Data format (json/csv)
- `mapping`: Field mapping object
- `updateExisting`: Update if exists

#### `content_export`
Export content to various formats.

**Parameters:**
- `spaceId`: Source space
- `format`: Export format (json/csv)
- `filter`: Optional filters
- `fields`: Specific fields to export

### Statistics

#### `content_get_stats`
Get content management statistics.

**Parameters:**
- `spaceId`: Optional space filter

**Returns:**
- Total entries, assets, comments
- Entry type breakdown
- Status distribution
- Storage usage
- Last activity timestamp

## Usage Examples

### Creating a Blog System

```javascript
// 1. Create a space
const space = await content_create_space({
  name: 'Company Blog',
  description: 'Main company blog content'
});

// 2. Define content type
const blogType = await content_create_type({
  spaceId: space.space.id,
  name: 'BlogPost',
  fields: [
    { id: 'title', name: 'Title', type: 'Symbol', required: true },
    { id: 'slug', name: 'URL Slug', type: 'Symbol', required: true },
    { id: 'content', name: 'Content', type: 'RichText', required: true },
    { id: 'author', name: 'Author', type: 'Symbol', required: true },
    { id: 'tags', name: 'Tags', type: 'Array', required: false },
    { id: 'featuredImage', name: 'Featured Image', type: 'Media', required: false }
  ]
});

// 3. Create a blog post
const post = await content_create_entry({
  spaceId: space.space.id,
  contentType: blogType.contentType.id,
  fields: {
    title: 'Getting Started with Ultimate MCP',
    slug: 'getting-started-ultimate-mcp',
    content: '# Introduction\n\nWelcome to Ultimate MCP...',
    author: 'John Doe',
    tags: ['tutorial', 'getting-started']
  },
  status: 'draft'
});

// 4. Add a comment
await content_add_comment({
  entryId: post.entry.id,
  author: 'Editor',
  body: 'Great post! Please add a section about installation.'
});

// 5. Publish the post
await content_update_entry({
  entryId: post.entry.id,
  status: 'published'
});
```

### Bulk Content Management

```javascript
// Search for draft posts
const drafts = await content_search_entries({
  contentType: 'BlogPost',
  status: ['draft'],
  limit: 10
});

// Validate all drafts
const validation = await content_bulk_operation({
  action: 'validate',
  entryIds: drafts.entries.map(e => e.id)
});

// Publish valid entries
if (validation.succeeded.length > 0) {
  await content_bulk_operation({
    action: 'publish',
    entryIds: validation.succeeded
  });
}
```

### Content Migration

```javascript
// Export from one space
const exportData = await content_export({
  spaceId: 'old-space',
  format: 'json',
  filter: {
    contentType: 'Article',
    status: ['published']
  }
});

// Import to new space with field mapping
await content_import({
  spaceId: 'new-space',
  data: exportData.data,
  format: 'json',
  mapping: {
    'body': 'content',
    'headline': 'title'
  }
});
```

## Architecture

### Storage Layer

The content management system uses a pluggable storage architecture:

1. **BaseContentStorage**: Abstract interface for storage operations
2. **MemoryContentStorage**: In-memory implementation for development
3. **Future**: PostgreSQL, MongoDB, S3 storage backends

### Content Manager

The ContentManager orchestrates all operations:

- **Validation**: Field type and custom validation rules
- **Caching**: In-memory cache with TTL
- **Versioning**: Automatic version tracking
- **History**: Complete change history

### Data Model

```
Space
  └── Environments
  └── Content Types
       └── Fields
            └── Validations
  └── Entries
       └── Versions
       └── Comments
  └── Assets
```

## Performance Considerations

### Pagination

- Default limit: 3 items per page
- Maximum limit: 10 items per page
- Prevents context window overflow
- Includes total count and navigation info

### Caching

- 5-minute TTL for all cached data
- Automatic invalidation on updates
- Key-based cache management

### Validation

- Field-level validation before storage
- Type checking and constraint validation
- Custom validation rule support

## Best Practices

1. **Content Modeling**
   - Keep content types focused and specific
   - Use appropriate field types
   - Add validation rules early

2. **Version Management**
   - Review version history before major changes
   - Use meaningful update messages
   - Restore from history when needed

3. **Bulk Operations**
   - Always validate before bulk publish
   - Use filters to target specific content
   - Monitor operation results

4. **Comments**
   - Keep comments under 512 characters
   - Use threading for discussions
   - Resolve comments when addressed

5. **Import/Export**
   - Test with small datasets first
   - Verify field mappings
   - Back up before bulk imports

## Future Enhancements

- GraphQL API support
- Webhooks for content events
- Advanced workflow management
- A/B testing support
- Content scheduling
- Multi-user collaboration
- Real-time sync
- CDN integration for assets