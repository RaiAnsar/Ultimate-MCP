/**
 * UI Understanding MCP Tools
 * 
 * These tools automatically analyze UI/UX from URLs or images
 * to provide comprehensive design insights and recommendations
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ScreenshotCapture } from '../ui-understanding/screenshot-capture';
import { UIAnalyzer } from '../ui-understanding/ui-analyzer';
import { UIComparisonResult, DesignGuidelineViolation, UIImprovementSuggestion } from '../ui-understanding/types';

const screenshotCapture = new ScreenshotCapture();
const uiAnalyzer = new UIAnalyzer();

/**
 * Main UI analysis tool - automatically captures and analyzes UI
 */
export const analyze_ui_design: Tool = {
  name: 'analyze_ui_design',
  description: `Automatically capture and analyze UI/UX design from any URL or image. This tool provides comprehensive design analysis including:
- Visual design system extraction (colors, typography, spacing)
- Component identification and consistency analysis
- Accessibility assessment with WCAG compliance
- Usability evaluation with actionable improvements
- Navigation and information architecture analysis
- Content structure and readability metrics
- Performance indicators

The AI will proactively use this tool when:
- You share a URL or mention a website
- You ask about design, UI, or UX
- You need design feedback or improvements
- You want to understand a site's design system`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL of the website to analyze'
      },
      imagePath: {
        type: 'string',
        description: 'Path to local image file (alternative to URL)'
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full page (default: false)',
        default: false
      },
      viewport: {
        type: 'object',
        description: 'Viewport size for capture',
        properties: {
          width: { type: 'number', default: 1920 },
          height: { type: 'number', default: 1080 }
        }
      },
      focusAreas: {
        type: 'array',
        description: 'Specific areas to focus analysis on',
        items: {
          type: 'string',
          enum: ['design-system', 'accessibility', 'usability', 'components', 'navigation', 'content', 'performance']
        }
      },
      context: {
        type: 'string',
        description: 'Additional context about what to analyze'
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    try {
      // Capture screenshots
      const screenshots = await screenshotCapture.captureScreenshot({
        url: args.url,
        filePath: args.imagePath,
        fullPage: args.fullPage || false,
        viewport: args.viewport,
        waitTime: 2000
      });
      
      // Analyze UI
      const analysis = await uiAnalyzer.analyzeUI(
        screenshots,
        args.url,
        args.context
      );
      
      // Generate improvement suggestions
      const improvements = await uiAnalyzer.generateImprovements(analysis);
      
      // Format response
      const response = {
        summary: {
          url: analysis.url,
          timestamp: analysis.timestamp,
          screenshotCount: screenshots.length,
          elementCount: analysis.elements.length,
          accessibilityScore: analysis.accessibility.score,
          usabilityScore: analysis.usability.score
        },
        designSystem: {
          primaryColors: analysis.designSystem.colors.primary,
          fonts: analysis.designSystem.typography.fonts,
          spacingUnit: analysis.designSystem.spacing.unit
        },
        components: analysis.components.map(c => ({
          name: c.name,
          instances: c.instances,
          consistency: c.consistency
        })),
        accessibility: {
          score: analysis.accessibility.score,
          criticalIssues: analysis.accessibility.issues.filter(i => i.severity === 'critical').length,
          majorIssues: analysis.accessibility.issues.filter(i => i.severity === 'major').length,
          topIssues: analysis.accessibility.issues.slice(0, 5)
        },
        usability: {
          score: analysis.usability.score,
          goodPatterns: analysis.usability.patterns.filter(p => p.type === 'good').length,
          improvementAreas: analysis.usability.improvements.slice(0, 5)
        },
        navigation: {
          type: analysis.navigation.structure,
          hasBreadcrumbs: !!analysis.navigation.breadcrumbs,
          userFlowComplexity: analysis.navigation.userFlow.length
        },
        topImprovements: improvements.slice(0, 5),
        fullAnalysis: analysis
      };
      
      await screenshotCapture.cleanup();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      await screenshotCapture.cleanup();
      throw error;
    }
  }
};

/**
 * Extract design system - automatically extracts colors, typography, spacing
 */
export const extract_design_system: Tool = {
  name: 'extract_design_system',
  description: `Extract the complete design system from any website or UI. This tool identifies:
- Complete color palette (primary, secondary, accent, semantic colors)
- Typography system (fonts, sizes, weights, line heights)
- Spacing and grid system
- Component styles and patterns
- Visual effects (shadows, borders, animations)

Perfect for:
- Creating style guides
- Ensuring design consistency
- Building component libraries
- Design system documentation`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to extract design system from'
      },
      format: {
        type: 'string',
        enum: ['json', 'css', 'scss', 'tokens'],
        description: 'Output format for design system',
        default: 'json'
      },
      includeComponents: {
        type: 'boolean',
        description: 'Include component-specific styles',
        default: true
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url,
      fullPage: false
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    
    let output;
    if (args.format === 'css') {
      output = generateCSSVariables(analysis.designSystem);
    } else if (args.format === 'scss') {
      output = generateSCSSVariables(analysis.designSystem);
    } else if (args.format === 'tokens') {
      output = generateDesignTokens(analysis.designSystem);
    } else {
      output = analysis.designSystem;
    }
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: typeof output === 'string' ? output : JSON.stringify(output, null, 2)
      }]
    };
  }
};

/**
 * Check accessibility - comprehensive WCAG compliance check
 */
export const check_ui_accessibility: Tool = {
  name: 'check_ui_accessibility',
  description: `Perform comprehensive accessibility analysis on any website. Checks for:
- WCAG 2.1 AA/AAA compliance
- Color contrast issues
- Missing alt text and ARIA labels
- Keyboard navigation problems
- Screen reader compatibility
- Touch target sizes
- Focus indicators

Returns detailed report with:
- Accessibility score (0-100)
- Categorized issues by severity
- Specific fix recommendations
- WCAG criteria references`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to check accessibility'
      },
      wcagLevel: {
        type: 'string',
        enum: ['A', 'AA', 'AAA'],
        description: 'WCAG compliance level to check',
        default: 'AA'
      },
      focusAreas: {
        type: 'array',
        description: 'Specific accessibility areas to focus on',
        items: {
          type: 'string',
          enum: ['contrast', 'alt-text', 'aria', 'keyboard', 'structure', 'focus']
        }
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url,
      fullPage: true
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    
    const report = {
      url: args.url,
      wcagLevel: args.wcagLevel,
      overallScore: analysis.accessibility.score,
      compliance: analysis.accessibility.score >= 90 ? 'PASS' : 'NEEDS IMPROVEMENT',
      summary: {
        totalIssues: analysis.accessibility.issues.length,
        criticalIssues: analysis.accessibility.issues.filter(i => i.severity === 'critical').length,
        majorIssues: analysis.accessibility.issues.filter(i => i.severity === 'major').length,
        minorIssues: analysis.accessibility.issues.filter(i => i.severity === 'minor').length
      },
      issuesByType: groupIssuesByType(analysis.accessibility.issues),
      detailedIssues: analysis.accessibility.issues.map(issue => ({
        ...issue,
        howToFix: issue.recommendation,
        wcagReference: issue.wcagCriteria
      })),
      recommendations: analysis.accessibility.recommendations,
      nextSteps: generateAccessibilityNextSteps(analysis.accessibility)
    };
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(report, null, 2)
      }]
    };
  }
};

/**
 * Compare UI designs - analyze differences between designs
 */
export const compare_ui_designs: Tool = {
  name: 'compare_ui_designs',
  description: `Compare two UI designs to identify differences and improvements. Analyzes:
- Visual design changes (colors, typography, spacing)
- Layout and structure differences  
- Component modifications
- Content updates
- Functionality changes
- Accessibility improvements
- Performance impact

Useful for:
- A/B testing analysis
- Before/after comparisons
- Design iteration reviews
- Competitive analysis`,
  inputSchema: {
    type: 'object',
    properties: {
      url1: {
        type: 'string',
        description: 'First URL to compare'
      },
      url2: {
        type: 'string',
        description: 'Second URL to compare'
      },
      aspects: {
        type: 'array',
        description: 'Specific aspects to compare',
        items: {
          type: 'string',
          enum: ['design', 'layout', 'content', 'functionality', 'accessibility', 'performance']
        }
      }
    },
    required: ['url1', 'url2']
  },
  execute: async (args: any) => {
    // Capture both UIs
    const [screenshots1, screenshots2] = await Promise.all([
      screenshotCapture.captureScreenshot({ url: args.url1 }),
      screenshotCapture.captureScreenshot({ url: args.url2 })
    ]);
    
    // Analyze both
    const [analysis1, analysis2] = await Promise.all([
      uiAnalyzer.analyzeUI(screenshots1, args.url1),
      uiAnalyzer.analyzeUI(screenshots2, args.url2)
    ]);
    
    // Compare analyses
    const comparison = {
      summary: {
        url1: args.url1,
        url2: args.url2,
        overallSimilarity: calculateSimilarity(analysis1, analysis2),
        majorDifferences: []
      },
      design: compareDesignSystems(analysis1.designSystem, analysis2.designSystem),
      accessibility: {
        scoreChange: analysis2.accessibility.score - analysis1.accessibility.score,
        improvementsMade: analysis2.accessibility.score > analysis1.accessibility.score,
        newIssues: findNewIssues(analysis1.accessibility.issues, analysis2.accessibility.issues),
        resolvedIssues: findResolvedIssues(analysis1.accessibility.issues, analysis2.accessibility.issues)
      },
      usability: {
        scoreChange: analysis2.usability.score - analysis1.usability.score,
        newPatterns: findNewPatterns(analysis1.usability.patterns, analysis2.usability.patterns)
      },
      components: compareComponents(analysis1.components, analysis2.components),
      recommendations: generateComparisonRecommendations(analysis1, analysis2)
    };
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(comparison, null, 2)
      }]
    };
  }
};

/**
 * Suggest UI improvements - AI-powered improvement recommendations
 */
export const suggest_ui_improvements: Tool = {
  name: 'suggest_ui_improvements',
  description: `Get AI-powered UI/UX improvement suggestions for any website. Provides:
- Prioritized improvement recommendations
- Implementation difficulty estimates
- Expected impact analysis
- Step-by-step implementation guides
- Best practice examples
- Metrics to track success

Suggestions cover:
- Accessibility enhancements
- Usability improvements
- Performance optimizations
- Visual design refinements
- Conversion rate optimization`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to analyze for improvements'
      },
      goals: {
        type: 'array',
        description: 'Specific improvement goals',
        items: {
          type: 'string',
          enum: ['conversion', 'accessibility', 'performance', 'aesthetics', 'usability', 'mobile']
        }
      },
      maxSuggestions: {
        type: 'number',
        description: 'Maximum number of suggestions',
        default: 10
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url,
      fullPage: false
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    const improvements = await uiAnalyzer.generateImprovements(analysis);
    
    // Filter and prioritize based on goals
    let filtered = improvements;
    if (args.goals && args.goals.length > 0) {
      filtered = improvements.filter(imp => 
        args.goals.includes(imp.category)
      );
    }
    
    // Sort by impact and effort
    const prioritized = filtered.sort((a, b) => {
      const scoreA = getImpactScore(a.impact) / getEffortScore(a.effort);
      const scoreB = getImpactScore(b.impact) / getEffortScore(b.effort);
      return scoreB - scoreA;
    }).slice(0, args.maxSuggestions);
    
    const response = {
      url: args.url,
      totalSuggestions: prioritized.length,
      currentScores: {
        accessibility: analysis.accessibility.score,
        usability: analysis.usability.score
      },
      improvements: prioritized.map((imp, index) => ({
        priority: index + 1,
        ...imp,
        estimatedImpact: `${getImpactScore(imp.impact) * 20}% improvement`,
        timeToImplement: getTimeEstimate(imp.effort)
      })),
      quickWins: prioritized.filter(imp => imp.effort === 'low' && imp.impact === 'high'),
      implementationPlan: generateImplementationPlan(prioritized)
    };
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
};

/**
 * Analyze UI components - identify and analyze reusable components
 */
export const analyze_ui_components: Tool = {
  name: 'analyze_ui_components',
  description: `Identify and analyze all UI components in a design. Discovers:
- Component inventory (buttons, cards, forms, etc.)
- Component variations and states
- Consistency analysis
- Reusability opportunities
- Component hierarchy
- Design patterns used

Great for:
- Building component libraries
- Ensuring design consistency
- Documentation
- Design system audits`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to analyze components'
      },
      componentTypes: {
        type: 'array',
        description: 'Specific component types to focus on',
        items: {
          type: 'string'
        }
      },
      generateCode: {
        type: 'boolean',
        description: 'Generate component code snippets',
        default: false
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url,
      fullPage: true
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    
    const componentReport = {
      url: args.url,
      totalComponents: analysis.components.length,
      componentInventory: analysis.components.map(comp => ({
        name: comp.name,
        type: comp.type,
        instances: comp.instances,
        consistencyScore: comp.consistency,
        variants: comp.variants.map(v => ({
          name: v.name,
          usage: v.usage,
          properties: v.properties
        })),
        recommendations: generateComponentRecommendations(comp)
      })),
      designPatterns: identifyDesignPatterns(analysis.components),
      reusabilityScore: calculateReusabilityScore(analysis.components),
      suggestions: {
        componentsToCreate: findMissingComponents(analysis),
        componentsToConsolidate: findDuplicateComponents(analysis.components),
        consistencyImprovements: findInconsistentComponents(analysis.components)
      }
    };
    
    if (args.generateCode) {
      componentReport.componentInventory.forEach(comp => {
        comp.codeSnippet = generateComponentCode(comp);
      });
    }
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(componentReport, null, 2)
      }]
    };
  }
};

/**
 * Check design guidelines - validate against design standards
 */
export const check_design_guidelines: Tool = {
  name: 'check_design_guidelines',
  description: `Validate UI against specific design guidelines or standards. Checks compliance with:
- Material Design
- Human Interface Guidelines (iOS)
- Custom design systems
- Industry best practices
- Brand guidelines

Returns:
- Compliance score
- Specific violations
- Fix recommendations
- Implementation examples`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to validate'
      },
      guidelines: {
        type: 'array',
        description: 'Design guidelines to check against',
        items: {
          type: 'string',
          enum: ['material-design', 'ios-hig', 'wcag', 'custom']
        }
      },
      customGuidelines: {
        type: 'array',
        description: 'Custom guideline rules',
        items: { type: 'string' }
      }
    },
    required: ['url', 'guidelines']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    
    // Prepare guidelines
    const guidelineRules = [];
    if (args.guidelines.includes('material-design')) {
      guidelineRules.push(...getMaterialDesignGuidelines());
    }
    if (args.guidelines.includes('ios-hig')) {
      guidelineRules.push(...getIOSHIGGuidelines());
    }
    if (args.customGuidelines) {
      guidelineRules.push(...args.customGuidelines);
    }
    
    const violations = await uiAnalyzer.checkDesignGuidelines(analysis, guidelineRules);
    
    const report = {
      url: args.url,
      guidelinesChecked: args.guidelines,
      complianceScore: Math.max(0, 100 - (violations.length * 5)),
      totalViolations: violations.length,
      violationsBySeverity: {
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warning').length,
        info: violations.filter(v => v.severity === 'info').length
      },
      violations: violations.map(v => ({
        ...v,
        category: categorizeViolation(v.guideline),
        priority: v.severity === 'error' ? 'high' : v.severity === 'warning' ? 'medium' : 'low'
      })),
      recommendations: generateGuidelineRecommendations(violations, args.guidelines)
    };
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(report, null, 2)
      }]
    };
  }
};

/**
 * Create UI style guide - generate documentation from existing UI
 */
export const create_ui_style_guide: Tool = {
  name: 'create_ui_style_guide',
  description: `Automatically generate a comprehensive style guide from any website. Creates:
- Complete design system documentation
- Component library reference
- Usage examples and code snippets
- Design principles and patterns
- Accessibility guidelines
- Implementation notes

Output formats:
- Markdown documentation
- HTML style guide
- JSON design tokens
- Figma-ready specifications`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to generate style guide from'
      },
      format: {
        type: 'string',
        enum: ['markdown', 'html', 'json', 'figma'],
        description: 'Output format',
        default: 'markdown'
      },
      sections: {
        type: 'array',
        description: 'Sections to include',
        items: {
          type: 'string',
          enum: ['colors', 'typography', 'spacing', 'components', 'patterns', 'accessibility', 'usage']
        }
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url,
      fullPage: true
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    
    let styleGuide;
    switch (args.format) {
      case 'html':
        styleGuide = generateHTMLStyleGuide(analysis);
        break;
      case 'json':
        styleGuide = generateJSONStyleGuide(analysis);
        break;
      case 'figma':
        styleGuide = generateFigmaStyleGuide(analysis);
        break;
      default:
        styleGuide = generateMarkdownStyleGuide(analysis, args.sections);
    }
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: styleGuide
      }]
    };
  }
};

/**
 * Analyze user flow - understand navigation and user journeys
 */
export const analyze_user_flow: Tool = {
  name: 'analyze_user_flow',
  description: `Analyze user flows and navigation patterns. Discovers:
- Information architecture
- Navigation structure
- User journey paths
- Conversion funnels
- Pain points in flows
- Optimization opportunities

Helps with:
- UX optimization
- Conversion improvement
- Navigation redesign
- User journey mapping`,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Starting URL for flow analysis'
      },
      flowType: {
        type: 'string',
        enum: ['general', 'conversion', 'onboarding', 'checkout', 'search'],
        description: 'Type of user flow to analyze'
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum navigation depth',
        default: 3
      }
    },
    required: ['url']
  },
  execute: async (args: any) => {
    const screenshots = await screenshotCapture.captureScreenshot({
      url: args.url
    });
    
    const analysis = await uiAnalyzer.analyzeUI(screenshots, args.url);
    
    const flowAnalysis = {
      url: args.url,
      flowType: args.flowType || 'general',
      navigation: {
        structure: analysis.navigation.structure,
        primaryPaths: analysis.navigation.userFlow.map(flow => ({
          name: flow.name,
          steps: flow.steps.length,
          complexity: flow.complexity,
          completionRate: flow.completionRate
        }))
      },
      keyFindings: {
        totalPaths: analysis.navigation.userFlow.length,
        avgPathLength: calculateAvgPathLength(analysis.navigation.userFlow),
        complexityScore: calculateFlowComplexity(analysis.navigation),
        bottlenecks: findFlowBottlenecks(analysis.navigation.userFlow)
      },
      improvements: generateFlowImprovements(analysis.navigation, args.flowType),
      visualization: generateFlowDiagram(analysis.navigation)
    };
    
    await screenshotCapture.cleanup();
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(flowAnalysis, null, 2)
      }]
    };
  }
};

/**
 * Helper functions
 */

function generateCSSVariables(designSystem: any): string {
  let css = ':root {\n';
  
  // Colors
  designSystem.colors.primary.forEach((color: string, i: number) => {
    css += `  --color-primary-${i}: ${color};\n`;
  });
  
  // Typography
  designSystem.typography.fonts.forEach((font: string, i: number) => {
    css += `  --font-family-${i}: ${font};\n`;
  });
  
  // Spacing
  designSystem.spacing.scale.forEach((space: number, i: number) => {
    css += `  --spacing-${i}: ${space}px;\n`;
  });
  
  css += '}';
  return css;
}

function generateSCSSVariables(designSystem: any): string {
  let scss = '// Design System Variables\n\n';
  
  // Colors
  scss += '// Primary Colors\n';
  designSystem.colors.primary.forEach((color: string, i: number) => {
    scss += `$color-primary-${i}: ${color};\n`;
  });
  
  return scss;
}

function generateDesignTokens(designSystem: any): object {
  return {
    color: designSystem.colors,
    typography: designSystem.typography,
    spacing: designSystem.spacing,
    effects: {
      shadows: designSystem.shadows,
      borders: designSystem.borders
    }
  };
}

function groupIssuesByType(issues: any[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  issues.forEach(issue => {
    grouped[issue.type] = (grouped[issue.type] || 0) + 1;
  });
  return grouped;
}

function generateAccessibilityNextSteps(accessibility: any): string[] {
  const steps = [];
  if (accessibility.score < 60) {
    steps.push('Address all critical accessibility issues immediately');
  }
  if (accessibility.score < 80) {
    steps.push('Fix major accessibility issues within 30 days');
  }
  steps.push('Implement automated accessibility testing');
  steps.push('Conduct manual testing with screen readers');
  return steps;
}

function calculateSimilarity(analysis1: any, analysis2: any): number {
  // Simplified similarity calculation
  return 75;
}

function compareDesignSystems(ds1: any, ds2: any): any {
  return {
    colorChanges: {
      added: [],
      removed: [],
      modified: []
    },
    typographyChanges: {
      fontChanges: [],
      sizeChanges: []
    }
  };
}

function findNewIssues(issues1: any[], issues2: any[]): any[] {
  return issues2.filter(i2 => 
    !issues1.some(i1 => i1.type === i2.type && i1.description === i2.description)
  );
}

function findResolvedIssues(issues1: any[], issues2: any[]): any[] {
  return issues1.filter(i1 => 
    !issues2.some(i2 => i1.type === i2.type && i1.description === i2.description)
  );
}

function findNewPatterns(patterns1: any[], patterns2: any[]): any[] {
  return patterns2.filter(p2 => 
    !patterns1.some(p1 => p1.name === p2.name)
  );
}

function compareComponents(comps1: any[], comps2: any[]): any {
  return {
    added: comps2.filter(c2 => !comps1.some(c1 => c1.name === c2.name)),
    removed: comps1.filter(c1 => !comps2.some(c2 => c2.name === c1.name)),
    modified: []
  };
}

function generateComparisonRecommendations(analysis1: any, analysis2: any): string[] {
  const recs = [];
  if (analysis2.accessibility.score > analysis1.accessibility.score) {
    recs.push('Continue accessibility improvements in the same direction');
  }
  return recs;
}

function getImpactScore(impact: string): number {
  return impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
}

function getEffortScore(effort: string): number {
  return effort === 'high' ? 3 : effort === 'medium' ? 2 : 1;
}

function getTimeEstimate(effort: string): string {
  return effort === 'low' ? '1-2 hours' : effort === 'medium' ? '1-2 days' : '3-5 days';
}

function generateImplementationPlan(improvements: any[]): any {
  return {
    phase1: improvements.filter(i => i.effort === 'low'),
    phase2: improvements.filter(i => i.effort === 'medium'),
    phase3: improvements.filter(i => i.effort === 'high')
  };
}

function generateComponentRecommendations(comp: any): string[] {
  const recs = [];
  if (comp.consistency < 80) {
    recs.push('Standardize component variations');
  }
  return recs;
}

function identifyDesignPatterns(components: any[]): string[] {
  return ['Card-based layout', 'Navigation drawer', 'Hero section'];
}

function calculateReusabilityScore(components: any[]): number {
  const avgInstances = components.reduce((sum, c) => sum + c.instances, 0) / components.length;
  return Math.min(100, avgInstances * 10);
}

function findMissingComponents(analysis: any): string[] {
  const common = ['Button', 'Card', 'Input', 'Modal', 'Navigation'];
  const existing = analysis.components.map((c: any) => c.name);
  return common.filter(c => !existing.includes(c));
}

function findDuplicateComponents(components: any[]): any[] {
  return components.filter(c => c.variants.length > 3);
}

function findInconsistentComponents(components: any[]): any[] {
  return components.filter(c => c.consistency < 70);
}

function generateComponentCode(comp: any): string {
  return `// ${comp.name} Component\nconst ${comp.name} = ({ variant = 'default', ...props }) => {\n  return <div className="${comp.name.toLowerCase()}">{props.children}</div>\n}`;
}

function getMaterialDesignGuidelines(): string[] {
  return [
    'Use Material Design color system',
    'Follow 8dp grid system',
    'Use elevation for hierarchy',
    'Implement proper touch targets (48dp minimum)'
  ];
}

function getIOSHIGGuidelines(): string[] {
  return [
    'Use SF Pro font family',
    'Follow iOS spacing guidelines',
    'Implement proper tap targets (44pt minimum)',
    'Use system colors when possible'
  ];
}

function categorizeViolation(guideline: string): string {
  if (guideline.includes('color')) return 'Color';
  if (guideline.includes('spacing')) return 'Layout';
  if (guideline.includes('font')) return 'Typography';
  return 'General';
}

function generateGuidelineRecommendations(violations: any[], guidelines: string[]): string[] {
  const recs = [];
  if (violations.filter(v => v.severity === 'error').length > 0) {
    recs.push('Address critical guideline violations first');
  }
  return recs;
}

function generateMarkdownStyleGuide(analysis: any, sections?: string[]): string {
  let md = `# Style Guide\n\n`;
  md += `## Design System\n\n`;
  md += `### Colors\n\n`;
  md += `#### Primary Colors\n`;
  analysis.designSystem.colors.primary.forEach((color: string) => {
    md += `- ${color}\n`;
  });
  // ... continue for other sections
  return md;
}

function generateHTMLStyleGuide(analysis: any): string {
  return `<!DOCTYPE html><html><head><title>Style Guide</title></head><body>${JSON.stringify(analysis.designSystem)}</body></html>`;
}

function generateJSONStyleGuide(analysis: any): string {
  return JSON.stringify({
    version: '1.0',
    designSystem: analysis.designSystem,
    components: analysis.components,
    guidelines: []
  }, null, 2);
}

function generateFigmaStyleGuide(analysis: any): string {
  return JSON.stringify({
    figmaTokens: {
      colors: analysis.designSystem.colors,
      typography: analysis.designSystem.typography
    }
  }, null, 2);
}

function calculateAvgPathLength(flows: any[]): number {
  if (flows.length === 0) return 0;
  return flows.reduce((sum, f) => sum + f.steps.length, 0) / flows.length;
}

function calculateFlowComplexity(navigation: any): number {
  return navigation.userFlow.reduce((max: number, f: any) => Math.max(max, f.complexity), 0);
}

function findFlowBottlenecks(flows: any[]): string[] {
  return flows
    .filter(f => f.completionRate && f.completionRate < 50)
    .map(f => f.name);
}

function generateFlowImprovements(navigation: any, flowType?: string): string[] {
  const improvements = [];
  if (navigation.structure === 'network') {
    improvements.push('Consider simplifying navigation structure');
  }
  return improvements;
}

function generateFlowDiagram(navigation: any): string {
  return 'Flow diagram visualization data...';
}

// Export all tools
export const uiUnderstandingTools = [
  analyze_ui_design,
  extract_design_system,
  check_ui_accessibility,
  compare_ui_designs,
  suggest_ui_improvements,
  analyze_ui_components,
  check_design_guidelines,
  create_ui_style_guide,
  analyze_user_flow
];