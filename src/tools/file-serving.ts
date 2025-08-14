import { z } from 'zod';
import { FileServer } from '../core/file-server.js';
import { Logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const fileServer = new FileServer();
const logger = new Logger('FileServingTool');

// Schema for registering files
const RegisterFileSchema = z.object({
  path: z.string().describe('File path to register for AI access'),
  recursive: z.boolean().optional().describe('If path is directory, include all files recursively')
});

// Schema for getting file content
const GetFileSchema = z.object({
  referenceId: z.string().optional().describe('File reference ID'),
  path: z.string().optional().describe('File path (alternative to referenceId)')
});

// Schema for searching files
const SearchFilesSchema = z.object({
  pattern: z.string().describe('Glob pattern to search for files (e.g., "**/*.ts")'),
  directory: z.string().optional().describe('Base directory to search in'),
  maxFiles: z.number().optional().default(100).describe('Maximum number of files to return')
});

/**
 * Register files for AI model access
 */
export async function registerFiles(input: z.infer<typeof RegisterFileSchema>) {
  try {
    const { path: targetPath, recursive } = RegisterFileSchema.parse(input);
    const resolvedPath = path.resolve(targetPath);
    
    // Check if path exists
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory() && recursive) {
      // Register all files in directory
      const pattern = path.join(resolvedPath, '**/*');
      const files = await glob(pattern, { 
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
      });
      
      const results = await fileServer.registerFiles(files);
      
      return {
        success: true,
        message: `Registered ${results.size} files`,
        files: Array.from(results.entries()).map(([filePath, id]) => ({
          path: filePath,
          referenceId: id,
          url: `/file/${id}`
        }))
      };
    } else if (stats.isFile()) {
      // Register single file
      const referenceId = await fileServer.registerFile(resolvedPath);
      
      return {
        success: true,
        message: 'File registered successfully',
        referenceId,
        path: resolvedPath,
        url: `/file/${referenceId}`
      };
    } else {
      throw new Error('Path must be a file or directory with recursive option');
    }
  } catch (error) {
    logger.error('Failed to register files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get file content for AI model consumption
 */
export async function getFileContent(input: z.infer<typeof GetFileSchema>) {
  try {
    const { referenceId, path: filePath } = GetFileSchema.parse(input);
    
    if (!referenceId && !filePath) {
      throw new Error('Either referenceId or path must be provided');
    }
    
    let file;
    if (referenceId) {
      file = await fileServer.getFile(referenceId);
    } else if (filePath) {
      file = await fileServer.getFileByPath(filePath);
    }
    
    if (!file) {
      return {
        success: false,
        error: 'File not found or expired'
      };
    }
    
    // For OpenRouter compatibility, generate data URL for certain file types
    const dataUrl = await fileServer.generateDataUrl(file.id);
    
    return {
      success: true,
      referenceId: file.id,
      path: file.path,
      content: file.content,
      dataUrl,
      metadata: {
        size: file.size,
        mimeType: file.mimeType,
        hash: file.hash,
        created: file.created,
        expires: file.expires
      }
    };
  } catch (error) {
    logger.error('Failed to get file content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search for files and register them
 */
export async function searchAndRegisterFiles(input: z.infer<typeof SearchFilesSchema>) {
  try {
    const { pattern, directory, maxFiles } = SearchFilesSchema.parse(input);
    
    const baseDir = directory ? path.resolve(directory) : process.cwd();
    const searchPattern = path.join(baseDir, pattern);
    
    // Search for files
    const files = await glob(searchPattern, {
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      maxDepth: 10
    });
    
    // Limit number of files
    const filesToRegister = files.slice(0, maxFiles);
    
    // Register all found files
    const results = await fileServer.registerFiles(filesToRegister);
    
    return {
      success: true,
      message: `Found and registered ${results.size} files`,
      totalFound: files.length,
      registered: results.size,
      files: Array.from(results.entries()).map(([filePath, id]) => ({
        path: filePath,
        referenceId: id,
        url: `/file/${id}`,
        name: path.basename(filePath),
        directory: path.dirname(filePath)
      }))
    };
  } catch (error) {
    logger.error('Failed to search and register files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get file manifest for AI models
 */
export async function getFileManifest() {
  try {
    const manifest = await fileServer.createManifest();
    
    return {
      success: true,
      manifest,
      stats: fileServer.getStats()
    };
  } catch (error) {
    logger.error('Failed to get file manifest:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a batch file package for AI model analysis
 */
export async function createFilePackage(input: {
  paths: string[];
  includeMetadata?: boolean;
}) {
  try {
    const { paths, includeMetadata = true } = input;
    const packageData: any = {
      version: '1.0',
      created: new Date().toISOString(),
      files: []
    };
    
    for (const filePath of paths) {
      try {
        const resolvedPath = path.resolve(filePath);
        const stats = await fs.stat(resolvedPath);
        
        if (stats.isFile()) {
          const referenceId = await fileServer.registerFile(resolvedPath);
          const file = await fileServer.getFile(referenceId);
          
          if (file) {
            const fileData: any = {
              path: file.path,
              name: path.basename(file.path),
              content: file.content
            };
            
            if (includeMetadata) {
              fileData.metadata = {
                size: file.size,
                mimeType: file.mimeType,
                hash: file.hash
              };
            }
            
            packageData.files.push(fileData);
          }
        }
      } catch (error) {
        logger.warn(`Skipping file ${filePath}:`, error);
      }
    }
    
    return {
      success: true,
      package: packageData,
      fileCount: packageData.files.length,
      totalSize: packageData.files.reduce((sum: number, f: any) => 
        sum + (f.metadata?.size || 0), 0)
    };
  } catch (error) {
    logger.error('Failed to create file package:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export tool definitions for MCP
export const fileServingTools = [
  {
    name: 'register_files',
    description: 'Register files for AI model access',
    inputSchema: RegisterFileSchema,
    handler: registerFiles
  },
  {
    name: 'get_file_content',
    description: 'Get file content by reference ID or path',
    inputSchema: GetFileSchema,
    handler: getFileContent
  },
  {
    name: 'search_and_register_files',
    description: 'Search for files using glob patterns and register them',
    inputSchema: SearchFilesSchema,
    handler: searchAndRegisterFiles
  },
  {
    name: 'get_file_manifest',
    description: 'Get manifest of all registered files',
    inputSchema: z.object({}),
    handler: getFileManifest
  },
  {
    name: 'create_file_package',
    description: 'Create a package of multiple files for AI analysis',
    inputSchema: z.object({
      paths: z.array(z.string()).describe('File paths to include in package'),
      includeMetadata: z.boolean().optional().describe('Include file metadata')
    }),
    handler: createFilePackage
  }
];