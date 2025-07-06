import { promises as fs } from "fs";
import path from "path";
import { Logger } from "./logger.js";

const logger = new Logger("FileCollector");

export interface FileInfo {
  path: string;
  content: string;
  size: number;
  extension: string;
}

export interface FileCollectionOptions {
  pattern: RegExp;
  exclude?: RegExp;
  maxFileSize?: number; // bytes
  maxTotalSize?: number; // bytes
  followSymlinks?: boolean;
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

// Common patterns to ignore
const DEFAULT_IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.svn/,
  /\.hg/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /\.nuxt/,
  /\.cache/,
  /\.pytest_cache/,
  /__pycache__/,
  /\.pyc$/,
  /\.pyo$/,
  /\.class$/,
  /\.jar$/,
  /\.war$/,
  /\.ear$/,
  /\.so$/,
  /\.dylib$/,
  /\.dll$/,
  /\.exe$/,
  /\.bin$/,
  /\.o$/,
  /\.a$/,
  /\.DS_Store$/,
  /Thumbs\.db$/,
  /\.env$/,
  /\.env\./,
];

// Binary file extensions to skip
const BINARY_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pyc', '.pyo', '.class', '.jar', '.war', '.ear',
  '.woff', '.woff2', '.ttf', '.eot',
]);

export class FileCollector {
  private totalSize = 0;
  private fileCount = 0;
  private skippedCount = 0;

  async collectFiles(
    rootPath: string,
    options: FileCollectionOptions
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const maxFileSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    const maxTotalSize = options.maxTotalSize || DEFAULT_MAX_TOTAL_SIZE;

    logger.info(`Starting file collection from: ${rootPath}`);
    logger.info(`Pattern: ${options.pattern}, Max file size: ${maxFileSize}, Max total: ${maxTotalSize}`);

    await this.scanDirectory(rootPath, files, options, maxFileSize, maxTotalSize);

    logger.info(`File collection complete. Collected: ${this.fileCount}, Skipped: ${this.skippedCount}, Total size: ${this.totalSize} bytes`);

    return files;
  }

  private async scanDirectory(
    dirPath: string,
    files: FileInfo[],
    options: FileCollectionOptions,
    maxFileSize: number,
    maxTotalSize: number
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.totalSize >= maxTotalSize) {
          logger.warn(`Reached max total size limit: ${maxTotalSize} bytes`);
          break;
        }

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        // Check if path should be ignored
        if (this.shouldIgnorePath(relativePath, options)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files, options, maxFileSize, maxTotalSize);
        } else if (entry.isFile()) {
          await this.processFile(fullPath, relativePath, files, options, maxFileSize, maxTotalSize);
        } else if (entry.isSymbolicLink() && options.followSymlinks) {
          try {
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
              await this.scanDirectory(fullPath, files, options, maxFileSize, maxTotalSize);
            } else if (stats.isFile()) {
              await this.processFile(fullPath, relativePath, files, options, maxFileSize, maxTotalSize);
            }
          } catch (err) {
            logger.warn(`Failed to follow symlink: ${fullPath}`);
          }
        }
      }
    } catch (err) {
      logger.error(`Error scanning directory ${dirPath}: ${err}`);
    }
  }

  private async processFile(
    fullPath: string,
    relativePath: string,
    files: FileInfo[],
    options: FileCollectionOptions,
    maxFileSize: number,
    maxTotalSize: number
  ): Promise<void> {
    try {
      // Check if file matches pattern
      if (!options.pattern.test(relativePath)) {
        return;
      }

      // Check file extension
      const ext = path.extname(fullPath).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) {
        this.skippedCount++;
        return;
      }

      const stats = await fs.stat(fullPath);
      
      // Check file size
      if (stats.size > maxFileSize) {
        logger.warn(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
        this.skippedCount++;
        return;
      }

      // Check if adding this file would exceed total size
      if (this.totalSize + stats.size > maxTotalSize) {
        logger.warn(`Skipping file to stay under total size limit: ${relativePath}`);
        this.skippedCount++;
        return;
      }

      // Read file content
      const content = await fs.readFile(fullPath, 'utf-8');
      
      files.push({
        path: relativePath,
        content,
        size: stats.size,
        extension: ext,
      });

      this.fileCount++;
      this.totalSize += stats.size;
    } catch (err) {
      logger.error(`Error processing file ${fullPath}: ${err}`);
      this.skippedCount++;
    }
  }

  private shouldIgnorePath(relativePath: string, options: FileCollectionOptions): boolean {
    // Check custom exclude pattern
    if (options.exclude && options.exclude.test(relativePath)) {
      return true;
    }

    // Check default ignore patterns
    for (const pattern of DEFAULT_IGNORE_PATTERNS) {
      if (pattern.test(relativePath)) {
        return true;
      }
    }

    return false;
  }

  getStats() {
    return {
      fileCount: this.fileCount,
      skippedCount: this.skippedCount,
      totalSize: this.totalSize,
    };
  }
}