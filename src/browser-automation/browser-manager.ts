/**
 * Browser Automation Manager
 * 
 * Provides unified interface for both Playwright and Puppeteer
 * with automatic fallback and optimal selection
 */

import { Browser as PlaywrightBrowser, Page as PlaywrightPage, chromium, firefox, webkit } from 'playwright';
import puppeteer, { Browser as PuppeteerBrowser, Page as PuppeteerPage } from 'puppeteer';

export type BrowserEngine = 'playwright' | 'puppeteer';
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

interface BrowserOptions {
  engine?: BrowserEngine;
  browserType?: BrowserType;
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
}

interface UnifiedPage {
  goto(url: string): Promise<void>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
  close(): Promise<void>;
  content(): Promise<string>;
  title(): Promise<string>;
  url(): string;
  setViewport?(viewport: { width: number; height: number }): Promise<void>;
}

interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  quality?: number;
  type?: 'png' | 'jpeg';
}

export class BrowserManager {
  private playwrightBrowser?: PlaywrightBrowser;
  private puppeteerBrowser?: PuppeteerBrowser;
  private currentEngine?: BrowserEngine;
  private isInitialized = false;
  
  /**
   * Initialize browser with specified engine
   */
  async initialize(options: BrowserOptions = {}): Promise<void> {
    const engine = options.engine || this.selectOptimalEngine();
    
    try {
      if (engine === 'playwright') {
        await this.initializePlaywright(options);
      } else {
        await this.initializePuppeteer(options);
      }
      
      this.currentEngine = engine;
      this.isInitialized = true;
    } catch (error) {
      console.error(`Failed to initialize ${engine}, trying fallback...`);
      
      // Try fallback engine
      const fallbackEngine = engine === 'playwright' ? 'puppeteer' : 'playwright';
      if (fallbackEngine === 'playwright') {
        await this.initializePlaywright(options);
      } else {
        await this.initializePuppeteer(options);
      }
      
      this.currentEngine = fallbackEngine;
      this.isInitialized = true;
    }
  }
  
  /**
   * Create a new page with unified interface
   */
  async newPage(): Promise<UnifiedPage> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.currentEngine === 'playwright' && this.playwrightBrowser) {
      const page = await this.playwrightBrowser.newPage();
      return this.wrapPlaywrightPage(page);
    } else if (this.puppeteerBrowser) {
      const page = await this.puppeteerBrowser.newPage();
      return this.wrapPuppeteerPage(page);
    }
    
    throw new Error('No browser initialized');
  }
  
  /**
   * Take screenshot with automatic tiling for large pages
   */
  async captureScreenshot(
    url: string,
    options: {
      fullPage?: boolean;
      tileSize?: number;
      viewport?: { width: number; height: number };
    } = {}
  ): Promise<Buffer[]> {
    const page = await this.newPage();
    
    try {
      // Set viewport if specified
      if (options.viewport && page.setViewport) {
        await page.setViewport(options.viewport);
      }
      
      await page.goto(url);
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Wait for images to load
      await page.evaluate(() => {
        const doc = (globalThis as any).document;
        if (!doc) return Promise.resolve();
        return Promise.all(
          Array.from(doc.images)
            .filter((img: any) => !img.complete)
            .map((img: any) => new Promise(resolve => {
              img.onload = img.onerror = resolve;
            }))
        );
      });
      
      if (options.fullPage && options.tileSize) {
        return await this.captureScreenshotTiles(page, options.tileSize);
      } else {
        const screenshot = await page.screenshot({
          fullPage: options.fullPage || false,
          type: 'png'
        });
        return [screenshot];
      }
    } finally {
      await page.close();
    }
  }
  
  /**
   * Execute automation script
   */
  async executeAutomation(
    script: {
      url: string;
      actions: Array<{
        type: 'click' | 'type' | 'wait' | 'screenshot' | 'evaluate';
        selector?: string;
        text?: string;
        duration?: number;
        code?: string;
      }>;
    }
  ): Promise<any[]> {
    const page = await this.newPage();
    const results: any[] = [];
    
    try {
      await page.goto(script.url);
      
      for (const action of script.actions) {
        switch (action.type) {
          case 'click':
            if (action.selector) {
              await page.waitForSelector(action.selector);
              await page.click(action.selector);
              results.push({ type: 'click', success: true });
            }
            break;
            
          case 'type':
            if (action.selector && action.text) {
              await page.waitForSelector(action.selector);
              await page.type(action.selector, action.text);
              results.push({ type: 'type', success: true });
            }
            break;
            
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
            results.push({ type: 'wait', success: true });
            break;
            
          case 'screenshot':
            const screenshot = await page.screenshot({ fullPage: true });
            results.push({ type: 'screenshot', data: screenshot });
            break;
            
          case 'evaluate':
            if (action.code) {
              const fn = new Function('return ' + action.code);
              const result = await page.evaluate(fn as any);
              results.push({ type: 'evaluate', data: result });
            }
            break;
        }
      }
      
      return results;
    } finally {
      await page.close();
    }
  }
  
  /**
   * Extract structured data from page
   */
  async extractData(
    url: string,
    selectors: Record<string, string>
  ): Promise<Record<string, any>> {
    const page = await this.newPage();
    
    try {
      await page.goto(url);
      await page.waitForSelector('body');
      
      const data: Record<string, any> = {};
      
      for (const [key, selector] of Object.entries(selectors)) {
        try {
          data[key] = await page.evaluate((sel) => {
            const doc = (globalThis as any).document;
            if (!doc) return null;
            const element = doc.querySelector(sel);
            if (!element) return null;
            
            // Try different extraction methods
            if ((globalThis as any).HTMLImageElement && element instanceof (globalThis as any).HTMLImageElement) {
              return element.src;
            } else if ((globalThis as any).HTMLAnchorElement && element instanceof (globalThis as any).HTMLAnchorElement) {
              return {
                text: element.textContent?.trim(),
                href: element.href
              };
            } else {
              return element.textContent?.trim();
            }
          }, selector);
        } catch (error) {
          data[key] = null;
        }
      }
      
      return data;
    } finally {
      await page.close();
    }
  }
  
  /**
   * Close all browsers
   */
  async close(): Promise<void> {
    if (this.playwrightBrowser) {
      await this.playwrightBrowser.close();
      this.playwrightBrowser = undefined;
    }
    
    if (this.puppeteerBrowser) {
      await this.puppeteerBrowser.close();
      this.puppeteerBrowser = undefined;
    }
    
    this.isInitialized = false;
    this.currentEngine = undefined;
  }
  
  /**
   * Initialize Playwright
   */
  private async initializePlaywright(options: BrowserOptions): Promise<void> {
    const browserType = options.browserType || 'chromium';
    const launcher = browserType === 'firefox' ? firefox : 
                     browserType === 'webkit' ? webkit : chromium;
    
    this.playwrightBrowser = await launcher.launch({
      headless: options.headless !== false,
      timeout: options.timeout || 30000
    });
  }
  
  /**
   * Initialize Puppeteer
   */
  private async initializePuppeteer(options: BrowserOptions): Promise<void> {
    this.puppeteerBrowser = await puppeteer.launch({
      headless: options.headless !== false,
      defaultViewport: options.viewport || { width: 1280, height: 720 },
      timeout: options.timeout || 30000
    });
  }
  
  /**
   * Select optimal engine based on availability and features
   */
  private selectOptimalEngine(): BrowserEngine {
    // Playwright is preferred for its better API and multi-browser support
    try {
      require.resolve('playwright');
      return 'playwright';
    } catch {
      return 'puppeteer';
    }
  }
  
  /**
   * Wrap Playwright page with unified interface
   */
  private wrapPlaywrightPage(page: PlaywrightPage): UnifiedPage {
    return {
      goto: async (url: string) => {
        await page.goto(url);
      },
      screenshot: async (options?: ScreenshotOptions) => {
        const result = await page.screenshot(options as any);
        return result as unknown as Buffer;
      },
      evaluate: (fn: Function, ...args: any[]) => page.evaluate(fn as any, ...args),
      click: (selector: string) => page.click(selector),
      type: (selector: string, text: string) => page.type(selector, text),
      waitForSelector: async (selector: string, options?: any) => {
        await page.waitForSelector(selector, options);
      },
      close: () => page.close(),
      content: () => page.content(),
      title: () => page.title(),
      url: () => page.url(),
      setViewport: (viewport: { width: number; height: number }) => page.setViewportSize(viewport)
    };
  }
  
  /**
   * Wrap Puppeteer page with unified interface
   */
  private wrapPuppeteerPage(page: PuppeteerPage): UnifiedPage {
    return {
      goto: async (url: string) => {
        await page.goto(url);
      },
      screenshot: async (options?: ScreenshotOptions) => {
        const result = await page.screenshot(options as any);
        return result as unknown as Buffer;
      },
      evaluate: (fn: Function, ...args: any[]) => page.evaluate(fn as any, ...args),
      click: (selector: string) => page.click(selector),
      type: (selector: string, text: string) => page.type(selector, text),
      waitForSelector: async (selector: string, options?: any) => {
        await page.waitForSelector(selector, options);
      },
      close: () => page.close(),
      content: () => page.content(),
      title: () => page.title(),
      url: () => page.url(),
      setViewport: (viewport: { width: number; height: number }) => page.setViewport(viewport)
    };
  }
  
  /**
   * Capture screenshot tiles for large pages
   */
  private async captureScreenshotTiles(
    page: UnifiedPage,
    tileSize: number
  ): Promise<Buffer[]> {
    const tiles: Buffer[] = [];
    
    // Get page dimensions
    const dimensions = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      if (!doc) return { width: 1920, height: 1080 };
      return {
        width: doc.documentElement.scrollWidth,
        height: doc.documentElement.scrollHeight
      };
    });
    
    const cols = Math.ceil(dimensions.width / tileSize);
    const rows = Math.ceil(dimensions.height / tileSize);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const width = Math.min(tileSize, dimensions.width - x);
        const height = Math.min(tileSize, dimensions.height - y);
        
        const tile = await page.screenshot({
          clip: { x, y, width, height },
          type: 'png'
        });
        
        tiles.push(tile);
      }
    }
    
    return tiles;
  }
}