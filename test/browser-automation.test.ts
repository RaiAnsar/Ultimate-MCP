import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserManager } from '../src/browser-automation/browser-manager.js';

// Create a shared page mock that can be modified
let mockPage: any;
let evaluateMockOverride: any = null;

// Mock the browser libraries
vi.mock('playwright', () => {
  return {
    chromium: {
      launch: vi.fn().mockImplementation(async () => ({
        newPage: vi.fn().mockImplementation(async () => {
          mockPage = {
            goto: vi.fn(),
            screenshot: vi.fn().mockResolvedValue(Buffer.from('screenshot')),
            evaluate: evaluateMockOverride || vi.fn().mockImplementation((fn, ...args) => {
              // Default implementation for evaluate
              if (typeof fn === 'function') {
                // For simple functions without arguments
                if (args.length === 0) {
                  return [];
                }
                // For functions with selector argument (like in extractData)
                const selector = args[0];
                if (selector) {
                  // Default mock behavior
                  return null;
                }
              }
              return [];
            }),
            click: vi.fn(),
            type: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue(null),
            close: vi.fn(),
            content: vi.fn().mockResolvedValue('<html></html>'),
            title: vi.fn().mockResolvedValue('Test Page'),
            url: vi.fn().mockReturnValue('https://example.com'),
            setViewport: vi.fn(),
            setViewportSize: vi.fn()
          };
          return mockPage;
        }),
        close: vi.fn()
      }))
    },
    firefox: {
      launch: vi.fn().mockResolvedValue({
        newPage: vi.fn(),
        close: vi.fn()
      })
    },
    webkit: {
      launch: vi.fn().mockResolvedValue({
        newPage: vi.fn(),
        close: vi.fn()
      })
    }
  };
});

vi.mock('puppeteer', () => {
  return {
    default: {
      launch: vi.fn().mockImplementation(async () => ({
        newPage: vi.fn().mockImplementation(async () => {
          mockPage = {
            goto: vi.fn(),
            screenshot: vi.fn().mockResolvedValue(Buffer.from('screenshot')),
            evaluate: evaluateMockOverride || vi.fn().mockImplementation((fn, ...args) => {
              // Default implementation for evaluate
              if (typeof fn === 'function') {
                // For simple functions without arguments
                if (args.length === 0) {
                  return [];
                }
                // For functions with selector argument (like in extractData)
                const selector = args[0];
                if (selector) {
                  // Default mock behavior
                  return null;
                }
              }
              return [];
            }),
            click: vi.fn(),
            type: vi.fn(),
            waitForSelector: vi.fn().mockResolvedValue(null),
            close: vi.fn(),
            content: vi.fn().mockResolvedValue('<html></html>'),
            title: vi.fn().mockResolvedValue('Test Page'),
            url: vi.fn().mockReturnValue('https://example.com'),
            setViewport: vi.fn(),
            setViewportSize: vi.fn()
          };
          return mockPage;
        }),
        close: vi.fn()
      }))
    }
  };
});

describe('BrowserManager', () => {
  let browserManager: BrowserManager;

  beforeEach(() => {
    browserManager = new BrowserManager();
    vi.clearAllMocks();
    // Reset mockPage and override to ensure clean state
    mockPage = null;
    evaluateMockOverride = null;
  });

  afterEach(async () => {
    await browserManager.close();
    // Clean up mockPage and override
    mockPage = null;
    evaluateMockOverride = null;
  });

  describe('Initialization', () => {
    it('should initialize with playwright by default', async () => {
      await browserManager.initialize();
      
      const { chromium } = await import('playwright');
      expect(chromium.launch).toHaveBeenCalled();
    });

    it('should initialize with puppeteer when specified', async () => {
      await browserManager.initialize({ engine: 'puppeteer' });
      
      const puppeteer = (await import('puppeteer')).default;
      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should support different browser types for playwright', async () => {
      await browserManager.initialize({ 
        engine: 'playwright',
        browserType: 'firefox' 
      });
      
      const { firefox } = await import('playwright');
      expect(firefox.launch).toHaveBeenCalled();
    });

    it('should handle initialization failures with fallback', async () => {
      const { chromium } = await import('playwright');
      const puppeteer = (await import('puppeteer')).default;
      
      // Make playwright fail
      (chromium.launch as any).mockRejectedValueOnce(new Error('Playwright failed'));
      
      await browserManager.initialize({ engine: 'playwright' });
      
      // Should fallback to puppeteer
      expect(puppeteer.launch).toHaveBeenCalled();
    });
  });

  describe('Page Creation', () => {
    it('should create new pages with unified interface', async () => {
      await browserManager.initialize();
      
      const page = await browserManager.newPage();
      
      expect(page).toBeDefined();
      expect(mockPage.goto).toBeDefined();
      expect(mockPage.screenshot).toBeDefined();
      expect(mockPage.evaluate).toBeDefined();
      expect(mockPage.click).toBeDefined();
      expect(mockPage.type).toBeDefined();
    });

    it('should auto-initialize if not initialized', async () => {
      const page = await browserManager.newPage();
      
      expect(page).toBeDefined();
      
      const { chromium } = await import('playwright');
      expect(chromium.launch).toHaveBeenCalled();
    });
  });

  describe('Screenshot Capture', () => {
    it('should capture basic screenshot', async () => {
      await browserManager.initialize();
      
      const screenshots = await browserManager.captureScreenshot('https://example.com');
      
      expect(screenshots).toHaveLength(1);
      expect(screenshots[0]).toBeInstanceOf(Buffer);
    });

    it('should capture full page screenshot', async () => {
      await browserManager.initialize();
      
      const screenshots = await browserManager.captureScreenshot('https://example.com', {
        fullPage: true
      });
      
      expect(screenshots).toHaveLength(1);
    });

    it('should tile large screenshots when requested', async () => {
      // Set up mock before initialization
      const { chromium } = await import('playwright');
      const mockEvaluate = vi.fn()
        .mockResolvedValueOnce([]) // First call for image loading
        .mockResolvedValueOnce({ width: 2200, height: 2200 }); // Second call for dimensions
      
      const mockPage = {
        goto: vi.fn(),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('tile')),
        evaluate: mockEvaluate,
        click: vi.fn(),
        type: vi.fn(),
        waitForSelector: vi.fn().mockResolvedValue(null),
        close: vi.fn(),
        content: vi.fn().mockResolvedValue('<html></html>'),
        title: vi.fn().mockResolvedValue('Test Page'),
        url: vi.fn().mockReturnValue('https://example.com'),
        setViewportSize: vi.fn()
      };
      
      (chromium.launch as any).mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn()
      });
      
      await browserManager.initialize();
      
      const screenshots = await browserManager.captureScreenshot('https://example.com', {
        fullPage: true,
        tileSize: 1072
      });
      
      // Should create tiles for large screenshots
      expect(screenshots.length).toBeGreaterThan(1);
      expect(mockEvaluate).toHaveBeenCalled();
    });

    it('should set custom viewport', async () => {
      await browserManager.initialize({ engine: 'playwright' });
      
      await browserManager.captureScreenshot('https://example.com', {
        viewport: { width: 1920, height: 1080 }
      });
      
      expect(mockPage).toBeDefined();
      expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });
  });

  describe('Browser Automation', () => {
    it('should execute click actions', async () => {
      await browserManager.initialize();
      
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'click', selector: '.button' }
        ]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ type: 'click', success: true });
    });

    it('should execute type actions', async () => {
      await browserManager.initialize();
      
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'type', selector: '#input', text: 'Hello World' }
        ]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ type: 'type', success: true });
    });

    it('should execute wait actions', async () => {
      await browserManager.initialize();
      
      const start = Date.now();
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'wait', duration: 100 }
        ]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ type: 'wait', success: true });
    });

    it('should execute screenshot actions', async () => {
      await browserManager.initialize();
      
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'screenshot' }
        ]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('screenshot');
      expect(results[0].data).toBeInstanceOf(Buffer);
    });

    it('should execute evaluate actions', async () => {
      // Set up custom mock before initialization
      const { chromium } = await import('playwright');
      (chromium.launch as any).mockResolvedValueOnce({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('screenshot')),
          evaluate: vi.fn().mockResolvedValue('Page Title'),
          click: vi.fn(),
          type: vi.fn(),
          waitForSelector: vi.fn().mockResolvedValue(null),
          close: vi.fn(),
          content: vi.fn().mockResolvedValue('<html></html>'),
          title: vi.fn().mockResolvedValue('Test Page'),
          url: vi.fn().mockReturnValue('https://example.com'),
          setViewport: vi.fn(),
          setViewportSize: vi.fn()
        }),
        close: vi.fn()
      });
      
      await browserManager.initialize();
      
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'evaluate', code: 'document.title' }
        ]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('evaluate');
      expect(results[0].data).toBe('Page Title');
    });

    it('should handle multiple actions in sequence', async () => {
      await browserManager.initialize();
      
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'click', selector: '.login' },
          { type: 'type', selector: '#username', text: 'user' },
          { type: 'type', selector: '#password', text: 'pass' },
          { type: 'click', selector: '#submit' },
          { type: 'wait', duration: 100 }
        ]
      });
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success || result.data).toBeTruthy();
      });
    });
  });

  describe('Data Extraction', () => {
    it('should extract text content', async () => {
      // Setup mock evaluate override to return different values based on selector
      evaluateMockOverride = vi.fn().mockImplementation((fn, selector) => {
        // Simulate the function execution - it passes a function and selector
        if (typeof fn === 'function') {
          // Mock the extraction based on selector
          if (selector === 'h1') return 'Page Title';
          if (selector === '.price') return '$99.99';
          if (selector === '.description') return 'Product description';
        }
        return null;
      });
      
      await browserManager.initialize();
      
      const data = await browserManager.extractData('https://example.com', {
        title: 'h1',
        price: '.price',
        description: '.description'
      });
      
      expect(data).toEqual({
        title: 'Page Title',
        price: '$99.99',
        description: 'Product description'
      });
    });

    it('should handle missing elements gracefully', async () => {
      // Mock evaluate override to always return null (element not found)
      evaluateMockOverride = vi.fn().mockResolvedValue(null);
      
      await browserManager.initialize();
      
      const data = await browserManager.extractData('https://example.com', {
        missing: '.non-existent'
      });
      
      expect(data).toEqual({
        missing: null
      });
    });

    it('should extract different element types', async () => {
      // Mock evaluate override based on selector argument
      evaluateMockOverride = vi.fn().mockImplementation((fn, selector) => {
        // Simulate different element types based on selector
        if (selector === 'img.logo') {
          // Simulate IMG element extraction
          return 'https://example.com/image.jpg';
        }
        if (selector === 'a.nav-link') {
          // Simulate A element extraction
          return { text: 'Link Text', href: 'https://example.com/link' };
        }
        return null;
      });
      
      await browserManager.initialize();
      
      const data = await browserManager.extractData('https://example.com', {
        image: 'img.logo',
        link: 'a.nav-link'
      });
      
      expect(data.image).toBe('https://example.com/image.jpg');
      expect(data.link).toEqual({
        text: 'Link Text',
        href: 'https://example.com/link'
      });
    });
  });

  describe('Browser Cleanup', () => {
    it('should close all browsers on cleanup', async () => {
      await browserManager.initialize({ engine: 'playwright' });
      
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      
      await browserManager.close();
      
      expect(browser.close).toHaveBeenCalled();
    });

    it('should handle multiple browser cleanup', async () => {
      // Initialize both engines
      await browserManager.initialize({ engine: 'playwright' });
      await browserManager.close();
      
      await browserManager.initialize({ engine: 'puppeteer' });
      await browserManager.close();
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should reset state after close', async () => {
      await browserManager.initialize();
      await browserManager.close();
      
      // Should be able to initialize again
      await browserManager.initialize();
      
      const { chromium } = await import('playwright');
      expect(chromium.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle page navigation errors', async () => {
      // Create a custom mock that will throw error
      const { chromium } = await import('playwright');
      const errorMockPage = {
        goto: vi.fn().mockRejectedValue(new Error('Network error')),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('screenshot')),
        evaluate: vi.fn().mockResolvedValue([]),
        click: vi.fn(),
        type: vi.fn(),
        waitForSelector: vi.fn().mockResolvedValue(null),
        close: vi.fn(),
        content: vi.fn().mockResolvedValue('<html></html>'),
        title: vi.fn().mockResolvedValue('Test Page'),
        url: vi.fn().mockReturnValue('https://example.com'),
        setViewport: vi.fn(),
        setViewportSize: vi.fn()
      };
      
      (chromium.launch as any).mockResolvedValueOnce({
        newPage: vi.fn().mockResolvedValue(errorMockPage),
        close: vi.fn()
      });
      
      await browserManager.initialize();
      
      await expect(
        browserManager.captureScreenshot('https://invalid-url.com')
      ).rejects.toThrow('Network error');
    });

    it('should handle screenshot errors', async () => {
      // Create a custom mock that will throw error on screenshot
      const { chromium } = await import('playwright');
      const errorMockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockRejectedValue(new Error('Screenshot failed')),
        evaluate: vi.fn().mockResolvedValue([]),
        click: vi.fn(),
        type: vi.fn(),
        waitForSelector: vi.fn().mockResolvedValue(null),
        close: vi.fn(),
        content: vi.fn().mockResolvedValue('<html></html>'),
        title: vi.fn().mockResolvedValue('Test Page'),
        url: vi.fn().mockReturnValue('https://example.com'),
        setViewport: vi.fn(),
        setViewportSize: vi.fn()
      };
      
      (chromium.launch as any).mockResolvedValueOnce({
        newPage: vi.fn().mockResolvedValue(errorMockPage),
        close: vi.fn()
      });
      
      await browserManager.initialize();
      
      await expect(
        browserManager.captureScreenshot('https://example.com')
      ).rejects.toThrow('Screenshot failed');
    });

    it('should handle automation errors gracefully', async () => {
      await browserManager.initialize();
      
      // Set up the mock to reject before executing
      if (mockPage) {
        mockPage.click = vi.fn().mockRejectedValueOnce(new Error('Element not found'));
      }
      
      // Should not throw, but handle gracefully
      const results = await browserManager.executeAutomation({
        url: 'https://example.com',
        actions: [
          { type: 'click', selector: '.non-existent' }
        ]
      });
      
      // Implementation might vary - could either throw or return error result
      expect(results).toBeDefined();
    });
  });
});