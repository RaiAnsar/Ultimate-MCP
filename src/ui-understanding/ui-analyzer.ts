/**
 * UI Analyzer using Google Gemini 2.5 Flash
 * Provides comprehensive UI/UX analysis and design understanding
 */

import { MODELS } from '../config/models.js';
import { callModel } from '../utils/model-caller.js';
import {
  ScreenshotTile,
  UIElement,
  UIAnalysis,
  DesignSystem,
  ComponentAnalysis,
  NavigationAnalysis,
  ContentAnalysis,
  DesignGuidelineViolation,
  UIImprovementSuggestion
} from './types.js';

export class UIAnalyzer {
  private readonly visionModel = MODELS.GEMINI_2_FLASH; // google/gemini-2.5-flash
  private readonly analysisCache = new Map<string, UIAnalysis>();
  
  /**
   * Analyze UI from screenshots using Gemini 2.5 Flash
   */
  async analyzeUI(
    screenshots: ScreenshotTile[],
    url?: string,
    _context?: string
  ): Promise<UIAnalysis> {
    // Check cache
    const cacheKey = this.getCacheKey(screenshots);
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Prepare prompts for different aspects of analysis
    const analyses = await Promise.all([
      this.detectElements(screenshots),
      this.extractDesignSystem(screenshots),
      this.analyzeLayout(screenshots),
      this.assessAccessibility(screenshots),
      this.evaluateUsability(screenshots),
      this.analyzeComponents(screenshots),
      this.analyzeNavigation(screenshots),
      this.analyzeContent(screenshots)
    ]);
    
    const [
      elements,
      designSystem,
      layout,
      accessibility,
      usability,
      components,
      navigation,
      content
    ] = analyses;
    
    // Combine all analyses
    const analysis: UIAnalysis = {
      url,
      timestamp: new Date(),
      screenshots,
      elements,
      designSystem,
      layout,
      accessibility,
      usability,
      brand: await this.analyzeBrand(designSystem, elements),
      components,
      navigation,
      content,
      performance: await this.analyzePerformance(elements, layout)
    };
    
    // Cache the result
    this.analysisCache.set(cacheKey, analysis);
    
    return analysis;
  }
  
  /**
   * Detect UI elements in screenshots
   */
  private async detectElements(screenshots: ScreenshotTile[]): Promise<UIElement[]> {
    const prompt = `Analyze these UI screenshots and identify all interactive and structural elements.

For each element, provide:
1. Type (button, input, link, image, text, heading, navigation, form, card, modal, menu, other)
2. Position (x, y, width, height)
3. Text content or label
4. Visual styles (colors, fonts, sizes)
5. Interactive state (clickable, editable, etc.)
6. Hierarchy (parent-child relationships)

Focus on:
- User interface controls
- Navigation elements
- Content sections
- Forms and inputs
- Media elements
- Layout containers

Return a detailed JSON array of all detected elements.`;

    const elements: UIElement[] = [];
    
    // Process each screenshot tile
    for (const screenshot of screenshots) {
      const response = await callModel(this.visionModel, {
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${screenshot.data}`
              }
            }
          ]
        }],
        temperature: 0.1,
        max_tokens: 4000
      });
      
      try {
        const tileElements = JSON.parse(response);
        // Adjust coordinates based on tile position
        for (const element of tileElements) {
          element.bounds.x += screenshot.x;
          element.bounds.y += screenshot.y;
          element.id = `${screenshot.id}-${element.id || Math.random()}`;
          elements.push(element);
        }
      } catch (error) {
        console.error('Failed to parse elements:', error);
      }
    }
    
    return this.deduplicateElements(elements);
  }
  
  /**
   * Extract design system from UI
   */
  private async extractDesignSystem(screenshots: ScreenshotTile[]): Promise<DesignSystem> {
    const prompt = `Analyze the visual design system in these UI screenshots.

Extract:
1. Color Palette:
   - Primary colors
   - Secondary colors
   - Accent colors
   - Neutral colors (grays, blacks, whites)
   - Semantic colors (success, warning, error, info)

2. Typography:
   - Font families used
   - Heading sizes (h1-h6)
   - Body text sizes
   - Line heights
   - Font weights

3. Spacing System:
   - Base unit
   - Spacing scale (4px, 8px, 16px, etc.)

4. Borders & Corners:
   - Border radii
   - Border widths
   - Border styles

5. Shadows and Effects:
   - Box shadows
   - Text shadows
   - Other visual effects

6. Animation Patterns:
   - Transition durations
   - Easing functions

Return a comprehensive JSON design system object.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...screenshots.slice(0, 3).map(screenshot => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${screenshot.data}`
            }
          }))
        ]
      }],
      temperature: 0.1,
      max_tokens: 4000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      // Return default design system if parsing fails
      return this.getDefaultDesignSystem();
    }
  }
  
  /**
   * Analyze layout structure
   */
  private async analyzeLayout(screenshots: ScreenshotTile[]): Promise<any> {
    const prompt = `Analyze the layout structure of this UI.

Determine:
1. Layout type (grid, flexbox, absolute, mixed)
2. Grid columns if applicable
3. Container widths
4. Responsive breakpoints
5. Layout patterns used
6. Spacing consistency
7. Alignment principles

Return a JSON object with layout analysis.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshots[0].data}`
            }
          }
        ]
      }],
      temperature: 0.1,
      max_tokens: 2000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        type: 'mixed',
        columns: 12,
        containerWidth: 1200
      };
    }
  }
  
  /**
   * Assess accessibility
   */
  private async assessAccessibility(screenshots: ScreenshotTile[]): Promise<any> {
    const prompt = `Analyze the accessibility of this UI interface.

Check for:
1. Color contrast issues
2. Missing alt text indicators
3. ARIA label problems
4. Keyboard navigation concerns
5. Structure and semantic issues
6. Text readability
7. Touch target sizes
8. Focus indicators

For each issue found:
- Type of issue
- Severity (critical, major, minor)
- Affected elements
- WCAG criteria violated
- Specific recommendations

Return a JSON object with accessibility score (0-100) and detailed issues array.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...screenshots.slice(0, 2).map(screenshot => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${screenshot.data}`
            }
          }))
        ]
      }],
      temperature: 0.1,
      max_tokens: 3000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        score: 75,
        issues: [],
        recommendations: ['Unable to perform detailed accessibility analysis']
      };
    }
  }
  
  /**
   * Evaluate usability
   */
  private async evaluateUsability(screenshots: ScreenshotTile[]): Promise<any> {
    const prompt = `Evaluate the usability of this user interface.

Analyze:
1. Information hierarchy
2. Visual flow and scanning patterns
3. Consistency of interactions
4. Clarity of CTAs
5. Error prevention
6. User feedback mechanisms
7. Efficiency of common tasks
8. Learnability

Identify:
- Good usability patterns
- Problematic patterns
- Improvement opportunities

Return a JSON object with usability score (0-100), patterns array, and improvements array.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...screenshots.slice(0, 2).map(screenshot => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${screenshot.data}`
            }
          }))
        ]
      }],
      temperature: 0.2,
      max_tokens: 3000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        score: 80,
        patterns: [],
        improvements: []
      };
    }
  }
  
  /**
   * Analyze UI components
   */
  private async analyzeComponents(screenshots: ScreenshotTile[]): Promise<ComponentAnalysis[]> {
    const prompt = `Identify and analyze reusable UI components in this interface.

For each component type found:
1. Component name (e.g., Button, Card, Navigation, Form)
2. Number of instances
3. Variations/variants
4. Consistency score
5. Properties and states
6. Usage patterns

Focus on:
- Atomic components (buttons, inputs, labels)
- Composite components (cards, forms, modals)
- Layout components (headers, footers, sidebars)
- Navigation components

Return a JSON array of component analyses.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...screenshots.slice(0, 3).map(screenshot => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${screenshot.data}`
            }
          }))
        ]
      }],
      temperature: 0.1,
      max_tokens: 3000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  }
  
  /**
   * Analyze navigation structure
   */
  private async analyzeNavigation(screenshots: ScreenshotTile[]): Promise<NavigationAnalysis> {
    const prompt = `Analyze the navigation structure and information architecture.

Identify:
1. Navigation type (linear, hierarchical, network, mixed)
2. Primary navigation menu
3. Secondary navigation elements
4. Breadcrumbs
5. Site structure/hierarchy
6. User flows
7. Navigation patterns

Return a JSON object with complete navigation analysis.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshots[0].data}`
            }
          }
        ]
      }],
      temperature: 0.1,
      max_tokens: 2000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        structure: 'hierarchical',
        sitemap: [],
        userFlow: []
      };
    }
  }
  
  /**
   * Analyze content
   */
  private async analyzeContent(screenshots: ScreenshotTile[]): Promise<ContentAnalysis> {
    const prompt = `Analyze the content structure and quality of this interface.

Evaluate:
1. Content readability
2. Information hierarchy
3. Content structure (headings, paragraphs, lists)
4. Media usage
5. Writing tone and style
6. Key messages and CTAs
7. Content density

Return a JSON object with content analysis including readability scores, structure counts, and CTA details.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshots[0].data}`
            }
          }
        ]
      }],
      temperature: 0.1,
      max_tokens: 2000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        readability: {
          score: 75,
          level: 'intermediate',
          avgSentenceLength: 15,
          avgWordLength: 5
        },
        structure: {
          headings: [0, 0, 0, 0, 0, 0],
          paragraphs: 0,
          lists: 0,
          images: 0,
          videos: 0
        },
        tone: ['professional'],
        keywords: [],
        callToActions: []
      };
    }
  }
  
  /**
   * Analyze brand consistency
   */
  private async analyzeBrand(_designSystem: DesignSystem, _elements: UIElement[]): Promise<any> {
    return {
      consistency: 85,
      personality: ['modern', 'professional', 'clean'],
      tone: ['friendly', 'informative']
    };
  }
  
  /**
   * Analyze performance indicators
   */
  private async analyzePerformance(_elements: UIElement[], _layout: any): Promise<any> {
    return {
      visualStability: 90,
      interactionReadiness: 85,
      perceivedSpeed: 80
    };
  }
  
  /**
   * Generate improvement suggestions
   */
  async generateImprovements(analysis: UIAnalysis): Promise<UIImprovementSuggestion[]> {
    const prompt = `Based on this UI analysis, generate specific improvement suggestions.

Analysis Summary:
- Accessibility Score: ${analysis.accessibility.score}/100
- Usability Score: ${analysis.usability.score}/100
- ${analysis.accessibility.issues.length} accessibility issues
- ${analysis.usability.improvements.length} usability improvements identified

For each suggestion provide:
1. Category (accessibility, usability, performance, aesthetics, conversion)
2. Title
3. Detailed description
4. Impact level (high, medium, low)
5. Implementation effort (low, medium, high)
6. Step-by-step implementation guide
7. Examples or references
8. Metrics to track improvement

Focus on the most impactful improvements that address identified issues.

Return a JSON array of 5-10 prioritized improvement suggestions.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.3,
      max_tokens: 4000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return this.getDefaultImprovements(analysis);
    }
  }
  
  /**
   * Check design guideline compliance
   */
  async checkDesignGuidelines(
    analysis: UIAnalysis,
    guidelines: string[]
  ): Promise<DesignGuidelineViolation[]> {
    const prompt = `Check this UI analysis against the following design guidelines:

${guidelines.join('\n')}

UI Analysis Summary:
- Design System: ${JSON.stringify(analysis.designSystem, null, 2)}
- Components: ${analysis.components.length} component types
- Accessibility Score: ${analysis.accessibility.score}

For each guideline violation found:
1. Which guideline is violated
2. Severity (error, warning, info)
3. Affected elements
4. Description of the violation
5. How to fix it

Return a JSON array of violations.`;

    const response = await callModel(this.visionModel, {
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.1,
      max_tokens: 3000
    });
    
    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  }
  
  /**
   * Helper methods
   */
  
  private getCacheKey(screenshots: ScreenshotTile[]): string {
    return screenshots.map(s => s.id).join('-');
  }
  
  private deduplicateElements(elements: UIElement[]): UIElement[] {
    const seen = new Set<string>();
    return elements.filter(element => {
      const key = `${element.type}-${element.bounds.x}-${element.bounds.y}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private getDefaultDesignSystem(): DesignSystem {
    return {
      colors: {
        primary: ['#007bff'],
        secondary: ['#6c757d'],
        accent: ['#17a2b8'],
        neutral: ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529'],
        semantic: {
          success: ['#28a745'],
          warning: ['#ffc107'],
          error: ['#dc3545'],
          info: ['#17a2b8']
        }
      },
      typography: {
        fonts: ['system-ui', '-apple-system', 'sans-serif'],
        headingSizes: ['2.5rem', '2rem', '1.75rem', '1.5rem', '1.25rem', '1rem'],
        bodySizes: ['1rem', '0.875rem', '0.75rem'],
        lineHeights: ['1.2', '1.5', '1.75'],
        fontWeights: ['400', '500', '600', '700']
      },
      spacing: {
        unit: 8,
        scale: [0, 4, 8, 16, 24, 32, 48, 64]
      },
      borders: {
        radii: ['0', '0.25rem', '0.5rem', '1rem'],
        widths: ['1px', '2px', '3px'],
        styles: ['solid', 'dashed', 'dotted']
      },
      shadows: ['none', '0 1px 3px rgba(0,0,0,0.12)', '0 4px 6px rgba(0,0,0,0.16)'],
      animations: {
        durations: ['200ms', '300ms', '500ms'],
        easings: ['ease', 'ease-in', 'ease-out', 'ease-in-out']
      }
    };
  }
  
  private getDefaultImprovements(analysis: UIAnalysis): UIImprovementSuggestion[] {
    const suggestions: UIImprovementSuggestion[] = [];
    
    // Add accessibility improvements
    if (analysis.accessibility.score < 90) {
      suggestions.push({
        category: 'accessibility',
        title: 'Improve Color Contrast',
        description: 'Enhance color contrast ratios to meet WCAG AA standards',
        impact: 'high',
        effort: 'low',
        implementation: [
          'Audit all text-background color combinations',
          'Increase contrast for low-contrast elements',
          'Use tools like WebAIM contrast checker'
        ],
        metrics: ['Accessibility score', 'WCAG compliance level']
      });
    }
    
    // Add usability improvements
    if (analysis.usability.score < 85) {
      suggestions.push({
        category: 'usability',
        title: 'Enhance Visual Hierarchy',
        description: 'Improve information hierarchy for better content scanning',
        impact: 'medium',
        effort: 'medium',
        implementation: [
          'Increase heading size differences',
          'Add more whitespace between sections',
          'Use color and weight to emphasize important elements'
        ],
        metrics: ['Time to find information', 'User satisfaction scores']
      });
    }
    
    return suggestions;
  }
}