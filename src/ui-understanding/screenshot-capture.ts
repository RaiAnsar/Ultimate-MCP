/**
 * Screenshot Capture with Automatic Tiling
 * Optimized for Claude Vision API (1072x1072 tiles)
 */

import { chromium, Browser } from 'playwright';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { ScreenshotOptions, ScreenshotTile } from './types.js';

export class ScreenshotCapture {
  private browser?: Browser;
  private readonly defaultTileSize = 1072; // Optimal for Claude Vision API
  private readonly defaultOverlap = 50;
  
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }
  
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
  
  async captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotTile[]> {
    await this.initialize();
    
    const page = await this.browser!.newPage();
    
    try {
      // Set viewport
      const viewport = options.viewport || { width: 1920, height: 1080 };
      await page.setViewportSize(viewport);
      
      // Navigate to URL if provided
      if (options.url) {
        await page.goto(options.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // Wait for specific selector if provided
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, {
            timeout: 10000
          });
        }
        
        // Additional wait time if specified
        if (options.waitTime) {
          await page.waitForTimeout(options.waitTime);
        }
      }
      
      // Take screenshot
      const format = (options.format === 'webp' ? 'png' : options.format) || 'png';
      const screenshotBuffer = await page.screenshot({
        fullPage: options.fullPage || false,
        type: format as 'png' | 'jpeg',
        quality: options.quality
      });
      
      // Get page dimensions
      const dimensions = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        return {
          width: doc?.documentElement?.scrollWidth || 1920,
          height: doc?.documentElement?.scrollHeight || 1080,
          viewportWidth: (globalThis as any).innerWidth || 1920,
          viewportHeight: (globalThis as any).innerHeight || 1080
        };
      });
      
      // Tile the screenshot
      const tiles = await this.tileScreenshot(
        screenshotBuffer,
        dimensions,
        options
      );
      
      return tiles;
      
    } finally {
      await page.close();
    }
  }
  
  private async tileScreenshot(
    buffer: Buffer,
    dimensions: { width: number; height: number; viewportWidth: number; viewportHeight: number },
    options: ScreenshotOptions
  ): Promise<ScreenshotTile[]> {
    const tileSize = options.tileSize || this.defaultTileSize;
    const overlap = options.overlap || this.defaultOverlap;
    const tiles: ScreenshotTile[] = [];
    
    // Load image with sharp
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Failed to get image metadata');
    }
    
    // Calculate number of tiles needed
    const effectiveTileSize = tileSize - overlap;
    const tilesX = Math.ceil(metadata.width / effectiveTileSize);
    const tilesY = Math.ceil(metadata.height / effectiveTileSize);
    
    // Generate tiles
    let tileIndex = 0;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const startX = x * effectiveTileSize;
        const startY = y * effectiveTileSize;
        
        // Ensure we don't exceed image boundaries
        const width = Math.min(tileSize, metadata.width - startX);
        const height = Math.min(tileSize, metadata.height - startY);
        
        // Extract tile
        const tileBuffer = await image
          .extract({
            left: startX,
            top: startY,
            width,
            height
          })
          .toBuffer();
        
        const tile: ScreenshotTile = {
          id: uuidv4(),
          index: tileIndex++,
          x: startX,
          y: startY,
          width,
          height,
          data: tileBuffer.toString('base64'),
          metadata: {
            pageUrl: options.url || 'local',
            capturedAt: new Date(),
            viewport: {
              width: dimensions.viewportWidth,
              height: dimensions.viewportHeight
            }
          }
        };
        
        tiles.push(tile);
      }
    }
    
    return tiles;
  }
  
  async captureElement(
    url: string,
    selector: string,
    options?: Partial<ScreenshotOptions>
  ): Promise<ScreenshotTile[]> {
    await this.initialize();
    
    const page = await this.browser!.newPage();
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      await page.waitForSelector(selector);
      
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      
      const boundingBox = await element.boundingBox();
      if (!boundingBox) {
        throw new Error('Could not get element bounding box');
      }
      
      // Scroll element into view
      await element.scrollIntoViewIfNeeded();
      
      // Take screenshot of element
      const format = (options?.format === 'webp' ? 'png' : options?.format) || 'png';
      const screenshotBuffer = await element.screenshot({
        type: format as 'png' | 'jpeg',
        quality: options?.quality
      });
      
      // For element screenshots, usually return a single tile
      const tile: ScreenshotTile = {
        id: uuidv4(),
        index: 0,
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
        data: screenshotBuffer.toString('base64'),
        metadata: {
          pageUrl: url,
          capturedAt: new Date(),
          viewport: await page.viewportSize() || { width: 1920, height: 1080 }
        }
      };
      
      return [tile];
      
    } finally {
      await page.close();
    }
  }
  
  async captureScreencast(
    url: string,
    duration: number,
    interval: number = 1000,
    options?: Partial<ScreenshotOptions>
  ): Promise<ScreenshotTile[][]> {
    await this.initialize();
    
    const page = await this.browser!.newPage();
    const frames: ScreenshotTile[][] = [];
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < duration) {
        const tiles = await this.captureScreenshot({
          ...options,
          url: undefined // Don't navigate again
        });
        
        frames.push(tiles);
        
        await page.waitForTimeout(interval);
      }
      
      return frames;
      
    } finally {
      await page.close();
    }
  }
  
  async compareScreenshots(
    tiles1: ScreenshotTile[],
    tiles2: ScreenshotTile[]
  ): Promise<{ similarity: number; differences: Buffer[] }> {
    const differences: Buffer[] = [];
    let totalSimilarity = 0;
    
    // Compare matching tiles
    const minTiles = Math.min(tiles1.length, tiles2.length);
    
    for (let i = 0; i < minTiles; i++) {
      const tile1 = sharp(Buffer.from(tiles1[i].data, 'base64'));
      const tile2 = sharp(Buffer.from(tiles2[i].data, 'base64'));
      
      // Get metadata
      const [meta1, meta2] = await Promise.all([
        tile1.metadata(),
        tile2.metadata()
      ]);
      
      // Ensure same dimensions
      if (meta1.width !== meta2.width || meta1.height !== meta2.height) {
        continue;
      }
      
      // Calculate pixel difference
      const diff = await sharp({
        create: {
          width: meta1.width!,
          height: meta1.height!,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
        .composite([
          {
            input: await tile1.toBuffer(),
            blend: 'difference'
          },
          {
            input: await tile2.toBuffer(),
            blend: 'difference'
          }
        ])
        .toBuffer();
      
      differences.push(diff);
      
      // Calculate similarity (simplified - in production use proper image comparison)
      totalSimilarity += 0.8; // Placeholder
    }
    
    return {
      similarity: totalSimilarity / minTiles,
      differences
    };
  }
}