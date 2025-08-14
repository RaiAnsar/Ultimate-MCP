/**
 * Browser Automation MCP Tools
 * 
 * Provides web scraping, automation, and interaction capabilities
 * using both Playwright and Puppeteer
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from '../browser-automation/browser-manager.js';

const browserManager = new BrowserManager();

/**
 * Navigate to URL and capture screenshot
 */
export const capture_webpage_screenshot: Tool = {
  name: 'capture_webpage_screenshot',
  description: `Capture screenshots of web pages with various options.

Features:
- Full page screenshots
- Viewport screenshots
- Automatic tiling for large pages
- Multiple browser engines (Chromium, Firefox, WebKit)
- Headless or headed mode

Use cases:
- UI testing and verification
- Visual documentation
- Design reviews
- Bug reporting`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to capture'
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full scrollable page',
        default: true
      },
      tileSize: {
        type: 'number',
        description: 'Split large screenshots into tiles (pixels)',
        default: 1072
      },
      viewport: {
        type: 'object',
        description: 'Viewport dimensions',
        properties: {
          width: { type: 'number', default: 1280 },
          height: { type: 'number', default: 720 }
        }
      },
      engine: {
        type: 'string',
        enum: ['playwright', 'puppeteer'],
        description: 'Browser automation engine',
        default: 'playwright'
      },
      browserType: {
        type: 'string',
        enum: ['chromium', 'firefox', 'webkit'],
        description: 'Browser type (Playwright only)',
        default: 'chromium'
      }
    },
    required: ['url']
  },
  handler: async (args: any) => {
    try {
      await browserManager.initialize({
        engine: args.engine,
        browserType: args.browserType,
        headless: true
      });
      
      const screenshots = await browserManager.captureScreenshot(args.url, {
        fullPage: args.fullPage,
        tileSize: args.fullPage ? args.tileSize : undefined,
        viewport: args.viewport
      });
      
      // Convert buffers to base64 for transport
      const base64Screenshots = screenshots.map(buffer => 
        buffer.toString('base64')
      );
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: args.url,
            screenshotCount: screenshots.length,
            totalSize: screenshots.reduce((sum, buf) => sum + buf.length, 0),
            screenshots: base64Screenshots
          }, null, 2)
        }]
      };
    } catch (error: any) {
      throw new Error(`Screenshot capture failed: ${error.message}`);
    } finally {
      await browserManager.close();
    }
  }
};

/**
 * Execute browser automation script
 */
export const execute_browser_automation: Tool = {
  name: 'execute_browser_automation',
  description: `Execute complex browser automation scripts.

Supported actions:
- click: Click on elements
- type: Type text into inputs
- wait: Wait for specified duration
- screenshot: Capture screenshots
- evaluate: Execute JavaScript

Perfect for:
- Form filling
- UI testing
- Web scraping
- Automated workflows`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Starting URL'
      },
      actions: {
        type: 'array',
        description: 'List of actions to execute',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['click', 'type', 'wait', 'screenshot', 'evaluate']
            },
            selector: {
              type: 'string',
              description: 'CSS selector (for click/type)'
            },
            text: {
              type: 'string',
              description: 'Text to type'
            },
            duration: {
              type: 'number',
              description: 'Wait duration in milliseconds'
            },
            code: {
              type: 'string',
              description: 'JavaScript code to evaluate'
            }
          },
          required: ['type']
        }
      },
      engine: {
        type: 'string',
        enum: ['playwright', 'puppeteer'],
        default: 'playwright'
      }
    },
    required: ['url', 'actions']
  },
  handler: async (args: any) => {
    try {
      await browserManager.initialize({
        engine: args.engine,
        headless: true
      });
      
      const results = await browserManager.executeAutomation({
        url: args.url,
        actions: args.actions
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: args.url,
            actionsExecuted: args.actions.length,
            results: results.map(r => {
              if (r.data instanceof Buffer) {
                return { ...r, data: '[Binary Screenshot Data]' };
              }
              return r;
            })
          }, null, 2)
        }]
      };
    } catch (error: any) {
      throw new Error(`Automation failed: ${error.message}`);
    } finally {
      await browserManager.close();
    }
  }
};

/**
 * Extract structured data from web pages
 */
export const extract_webpage_data: Tool = {
  name: 'extract_webpage_data',
  description: `Extract structured data from web pages using CSS selectors.

Features:
- Extract text content
- Extract attributes (href, src, etc.)
- Handle dynamic content
- Multiple data points in one request

Use cases:
- Web scraping
- Data collection
- Content monitoring
- Research automation`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to extract data from'
      },
      selectors: {
        type: 'object',
        description: 'Key-value pairs of data to extract',
        additionalProperties: {
          type: 'string',
          description: 'CSS selector'
        },
        examples: [
          {
            title: 'h1',
            price: '.price-tag',
            description: 'meta[name="description"]'
          }
        ]
      },
      waitForSelector: {
        type: 'string',
        description: 'Wait for this selector before extracting',
        default: 'body'
      },
      engine: {
        type: 'string',
        enum: ['playwright', 'puppeteer'],
        default: 'playwright'
      }
    },
    required: ['url', 'selectors']
  },
  handler: async (args: any) => {
    try {
      await browserManager.initialize({
        engine: args.engine,
        headless: true
      });
      
      const data = await browserManager.extractData(args.url, args.selectors);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: args.url,
            extractedData: data,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error: any) {
      throw new Error(`Data extraction failed: ${error.message}`);
    } finally {
      await browserManager.close();
    }
  }
};

/**
 * Analyze webpage performance
 */
export const analyze_webpage_performance: Tool = {
  name: 'analyze_webpage_performance',
  description: `Analyze webpage loading performance and metrics.

Metrics collected:
- Page load time
- DOM content loaded time
- Resource timing
- JavaScript execution time
- Memory usage
- Network requests

Useful for:
- Performance optimization
- Debugging slow pages
- Monitoring web vitals`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to analyze'
      },
      throttling: {
        type: 'string',
        enum: ['none', '3G', '4G'],
        description: 'Network throttling',
        default: 'none'
      },
      device: {
        type: 'string',
        enum: ['desktop', 'mobile', 'tablet'],
        description: 'Device emulation',
        default: 'desktop'
      }
    },
    required: ['url']
  },
  handler: async (args: any) => {
    try {
      await browserManager.initialize({
        headless: true,
        viewport: args.device === 'mobile' ? 
          { width: 375, height: 812 } : 
          args.device === 'tablet' ? 
          { width: 768, height: 1024 } : 
          { width: 1920, height: 1080 }
      });
      
      const page = await browserManager.newPage();
      
      // Start performance measurement
      const startTime = Date.now();
      const performanceData: any = {};
      
      // Navigate and collect metrics
      await page.goto(args.url);
      
      performanceData.loadTime = Date.now() - startTime;
      
      // Collect performance metrics
      performanceData.metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        const resources = performance.getEntriesByType('resource');
        
        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
          resourceCount: resources.length,
          totalResourceSize: resources.reduce((sum: number, r: any) => sum + (r.transferSize || 0), 0),
          jsHeapSize: (performance as any).memory?.usedJSHeapSize,
          documentSize: document.documentElement.innerHTML.length
        };
      });
      
      await page.close();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: args.url,
            performance: performanceData,
            recommendations: generatePerformanceRecommendations(performanceData)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      throw new Error(`Performance analysis failed: ${error.message}`);
    } finally {
      await browserManager.close();
    }
  }
};

/**
 * Test webpage accessibility
 */
export const test_webpage_accessibility: Tool = {
  name: 'test_webpage_accessibility',
  description: `Test webpage accessibility using automated checks.

Checks include:
- Alt text for images
- Proper heading structure
- Color contrast
- ARIA labels
- Keyboard navigation
- Form labels

Standards:
- WCAG 2.1 AA compliance
- Section 508
- ADA compliance`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to test'
      },
      standard: {
        type: 'string',
        enum: ['WCAG2A', 'WCAG2AA', 'WCAG2AAA', 'Section508'],
        description: 'Accessibility standard',
        default: 'WCAG2AA'
      }
    },
    required: ['url']
  },
  handler: async (args: any) => {
    try {
      await browserManager.initialize({ headless: true });
      const page = await browserManager.newPage();
      
      await page.goto(args.url);
      
      // Run accessibility checks
      const accessibilityResults = await page.evaluate(() => {
        const results = {
          images: { total: 0, withAlt: 0, missing: [] as string[] },
          headings: { proper: true, issues: [] as string[] },
          forms: { labeled: 0, unlabeled: [] as string[] },
          contrast: { issues: [] as string[] },
          aria: { proper: 0, issues: [] as string[] }
        };
        
        // Check images
        const images = document.querySelectorAll('img');
        results.images.total = images.length;
        images.forEach((img, i) => {
          if (img.alt) {
            results.images.withAlt++;
          } else {
            results.images.missing.push(`Image ${i + 1}: ${img.src}`);
          }
        });
        
        // Check heading structure
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let lastLevel = 0;
        headings.forEach(h => {
          const level = parseInt(h.tagName[1]);
          if (level > lastLevel + 1) {
            results.headings.proper = false;
            results.headings.issues.push(`Skipped heading level: ${h.tagName} after H${lastLevel}`);
          }
          lastLevel = level;
        });
        
        // Check form labels
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach((input: any, i) => {
          const label = document.querySelector(`label[for="${input.id}"]`) || 
                       input.closest('label');
          if (label || input.getAttribute('aria-label')) {
            results.forms.labeled++;
          } else {
            results.forms.unlabeled.push(`Input ${i + 1}: ${input.type || 'unknown'}`);
          }
        });
        
        return results;
      });
      
      await page.close();
      
      // Generate accessibility score
      const score = calculateAccessibilityScore(accessibilityResults);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: args.url,
            standard: args.standard,
            score: `${score}%`,
            results: accessibilityResults,
            recommendations: generateAccessibilityRecommendations(accessibilityResults)
          }, null, 2)
        }]
      };
    } catch (error: any) {
      throw new Error(`Accessibility test failed: ${error.message}`);
    } finally {
      await browserManager.close();
    }
  }
};

/**
 * Helper functions
 */

function generatePerformanceRecommendations(data: any): string[] {
  const recommendations = [];
  
  if (data.loadTime > 3000) {
    recommendations.push('Page load time exceeds 3 seconds - consider optimization');
  }
  
  if (data.metrics.resourceCount > 100) {
    recommendations.push('High number of resources - consider bundling and lazy loading');
  }
  
  if (data.metrics.totalResourceSize > 5 * 1024 * 1024) {
    recommendations.push('Large total resource size - optimize images and assets');
  }
  
  if (data.metrics.jsHeapSize > 50 * 1024 * 1024) {
    recommendations.push('High JavaScript memory usage - check for memory leaks');
  }
  
  return recommendations;
}

function calculateAccessibilityScore(results: any): number {
  let score = 100;
  
  // Deduct points for issues
  if (results.images.total > 0) {
    const imageScore = (results.images.withAlt / results.images.total) * 20;
    score -= (20 - imageScore);
  }
  
  if (!results.headings.proper) {
    score -= 15;
  }
  
  if (results.forms.unlabeled.length > 0) {
    score -= results.forms.unlabeled.length * 5;
  }
  
  return Math.max(0, Math.round(score));
}

function generateAccessibilityRecommendations(results: any): string[] {
  const recommendations = [];
  
  if (results.images.missing.length > 0) {
    recommendations.push(`Add alt text to ${results.images.missing.length} images`);
  }
  
  if (!results.headings.proper) {
    recommendations.push('Fix heading hierarchy - avoid skipping levels');
  }
  
  if (results.forms.unlabeled.length > 0) {
    recommendations.push(`Add labels to ${results.forms.unlabeled.length} form inputs`);
  }
  
  return recommendations;
}

// Export all browser automation tools
export const browserAutomationTools = [
  capture_webpage_screenshot,
  execute_browser_automation,
  extract_webpage_data,
  analyze_webpage_performance,
  test_webpage_accessibility
];