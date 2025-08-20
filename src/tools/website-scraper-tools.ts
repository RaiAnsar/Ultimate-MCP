import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { URL } from 'url';

interface ScrapedAsset {
  url: string;
  localPath: string;
  type: 'html' | 'css' | 'js' | 'image' | 'video' | 'font' | 'other';
  size?: number;
  downloaded: boolean;
}

interface ScrapeResult {
  baseUrl: string;
  outputDir: string;
  stats: {
    pagesScraped: number;
    assetsDownloaded: number;
    totalSize: number;
    errors: string[];
  };
  assets: ScrapedAsset[];
  siteMap: Map<string, string[]>;
}

class WebsiteScraper {
  private visited = new Set<string>();
  private assets: ScrapedAsset[] = [];
  private errors: string[] = [];
  private siteMap = new Map<string, string[]>();
  
  async scrapeWebsite(
    url: string,
    outputDir: string,
    options: {
      maxDepth?: number;
      downloadMedia?: boolean;
      preserveStructure?: boolean;
      includeExternal?: boolean;
      userAgent?: string;
    } = {}
  ): Promise<ScrapeResult> {
    const {
      maxDepth = 10,
      downloadMedia = true,
      preserveStructure = true,
      includeExternal = false,
      userAgent = 'Mozilla/5.0 (compatible; MCP-WebScraper/1.0)'
    } = options;

    const baseUrl = new URL(url);
    const baseDomain = baseUrl.hostname;
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    // Start crawling
    await this.crawlPage(url, baseUrl, outputDir, baseDomain, 0, maxDepth, {
      downloadMedia,
      preserveStructure,
      includeExternal,
      userAgent
    });
    
    return {
      baseUrl: url,
      outputDir,
      stats: {
        pagesScraped: this.visited.size,
        assetsDownloaded: this.assets.filter(a => a.downloaded).length,
        totalSize: this.assets.reduce((sum, a) => sum + (a.size || 0), 0),
        errors: this.errors
      },
      assets: this.assets,
      siteMap: this.siteMap
    };
  }
  
  private async crawlPage(
    url: string,
    baseUrl: URL,
    outputDir: string,
    baseDomain: string,
    depth: number,
    maxDepth: number,
    options: any
  ): Promise<void> {
    if (depth > maxDepth || this.visited.has(url)) {
      return;
    }
    
    this.visited.add(url);
    
    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': options.userAgent
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        const html = await response.text();
        const dom = new JSDOM(html, { url });
        const document = dom.window.document;
        
        // Save HTML
        const htmlPath = this.getLocalPath(url, baseUrl, outputDir, 'html');
        await this.saveFile(htmlPath, html);
        
        this.assets.push({
          url,
          localPath: htmlPath,
          type: 'html',
          size: Buffer.byteLength(html),
          downloaded: true
        });
        
        // Extract all links and assets
        const links: string[] = [];
        
        // Find all links to crawl
        const anchors = document.querySelectorAll('a[href]');
        for (const anchor of anchors) {
          const href = anchor.getAttribute('href');
          if (href) {
            const absoluteUrl = new URL(href, url).toString();
            const linkUrl = new URL(absoluteUrl);
            
            // Check if we should crawl this link
            if (linkUrl.hostname === baseDomain || options.includeExternal) {
              links.push(absoluteUrl);
              
              // Recursively crawl
              await this.crawlPage(
                absoluteUrl,
                baseUrl,
                outputDir,
                baseDomain,
                depth + 1,
                maxDepth,
                options
              );
            }
          }
        }
        
        // Store site map
        this.siteMap.set(url, links);
        
        if (options.downloadMedia) {
          // Download CSS
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
          for (const link of stylesheets) {
            const href = link.getAttribute('href');
            if (href) {
              await this.downloadAsset(href, url, outputDir, baseUrl, 'css');
            }
          }
          
          // Download JavaScript
          const scripts = document.querySelectorAll('script[src]');
          for (const script of scripts) {
            const src = script.getAttribute('src');
            if (src) {
              await this.downloadAsset(src, url, outputDir, baseUrl, 'js');
            }
          }
          
          // Download images
          const images = document.querySelectorAll('img[src]');
          for (const img of images) {
            const src = img.getAttribute('src');
            if (src) {
              await this.downloadAsset(src, url, outputDir, baseUrl, 'image');
            }
          }
          
          // Download videos
          const videos = document.querySelectorAll('video source[src], video[src]');
          for (const video of videos) {
            const src = video.getAttribute('src');
            if (src) {
              await this.downloadAsset(src, url, outputDir, baseUrl, 'video');
            }
          }
          
          // Download background images from inline styles
          const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
          for (const element of elementsWithBg) {
            const style = element.getAttribute('style') || '';
            const urlMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
              await this.downloadAsset(urlMatch[1], url, outputDir, baseUrl, 'image');
            }
          }
        }
      }
    } catch (error: any) {
      this.errors.push(`Error crawling ${url}: ${error.message}`);
    }
  }
  
  private async downloadAsset(
    assetUrl: string,
    pageUrl: string,
    outputDir: string,
    baseUrl: URL,
    type: ScrapedAsset['type']
  ): Promise<void> {
    try {
      const absoluteUrl = new URL(assetUrl, pageUrl).toString();
      
      if (this.visited.has(absoluteUrl)) {
        return;
      }
      
      this.visited.add(absoluteUrl);
      
      const response = await fetch(absoluteUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const localPath = this.getLocalPath(absoluteUrl, baseUrl, outputDir, type);
      const dir = path.dirname(localPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Download file
      const fileStream = createWriteStream(localPath);
      await pipeline(response.body as any, fileStream);
      
      const stats = await fs.stat(localPath);
      
      this.assets.push({
        url: absoluteUrl,
        localPath,
        type,
        size: stats.size,
        downloaded: true
      });
    } catch (error: any) {
      this.errors.push(`Error downloading ${assetUrl}: ${error.message}`);
      this.assets.push({
        url: assetUrl,
        localPath: '',
        type,
        downloaded: false
      });
    }
  }
  
  private getLocalPath(
    url: string,
    baseUrl: URL,
    outputDir: string,
    type: string
  ): string {
    const urlObj = new URL(url);
    let relativePath = urlObj.pathname;
    
    // Remove leading slash
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1);
    }
    
    // Add index.html for directory paths
    if (relativePath === '' || relativePath.endsWith('/')) {
      relativePath += 'index.html';
    }
    
    // Add appropriate extension if missing
    if (!path.extname(relativePath)) {
      const extensions: Record<string, string> = {
        html: '.html',
        css: '.css',
        js: '.js',
        image: '.jpg',
        video: '.mp4'
      };
      relativePath += extensions[type] || '';
    }
    
    return path.join(outputDir, urlObj.hostname, relativePath);
  }
  
  private async saveFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }
}

export const scrapeWebsite: ToolDefinition = {
  name: 'scrape_website',
  description: 'Scrape an entire website including all pages, media, CSS, JS, and other assets',
  inputSchema: z.object({
    url: z.string().url().describe('The website URL to scrape'),
    outputDir: z.string().describe('Directory to save the scraped content'),
    options: z.object({
      maxDepth: z.number().optional().default(10)
        .describe('Maximum crawl depth (default: 10)'),
      downloadMedia: z.boolean().optional().default(true)
        .describe('Download images, videos, CSS, JS (default: true)'),
      preserveStructure: z.boolean().optional().default(true)
        .describe('Preserve the website directory structure (default: true)'),
      includeExternal: z.boolean().optional().default(false)
        .describe('Include external links and resources (default: false)'),
      userAgent: z.string().optional()
        .describe('Custom user agent string')
    }).optional()
  }) as any,
  handler: async (args) => {
    const scraper = new WebsiteScraper();
    const result = await scraper.scrapeWebsite(
      args.url,
      args.outputDir,
      args.options
    );
    
    return {
      success: true,
      message: `Successfully scraped ${result.stats.pagesScraped} pages and ${result.stats.assetsDownloaded} assets`,
      summary: {
        baseUrl: result.baseUrl,
        outputDirectory: result.outputDir,
        statistics: {
          pagesScraped: result.stats.pagesScraped,
          assetsDownloaded: result.stats.assetsDownloaded,
          totalSizeBytes: result.stats.totalSize,
          totalSizeMB: (result.stats.totalSize / 1024 / 1024).toFixed(2),
          errors: result.stats.errors.length
        },
        assetBreakdown: {
          html: result.assets.filter(a => a.type === 'html').length,
          css: result.assets.filter(a => a.type === 'css').length,
          javascript: result.assets.filter(a => a.type === 'js').length,
          images: result.assets.filter(a => a.type === 'image').length,
          videos: result.assets.filter(a => a.type === 'video').length,
          other: result.assets.filter(a => a.type === 'other').length
        },
        errors: result.stats.errors.slice(0, 10) // First 10 errors
      }
    };
  }
};

export const websiteScraperTools: ToolDefinition[] = [
  scrapeWebsite
];