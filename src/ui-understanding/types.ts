/**
 * UI Understanding and Visual Analysis Types
 * 
 * This module provides comprehensive UI/UX analysis capabilities
 * using Google Gemini 2.5 Flash for visual understanding
 */

export interface ScreenshotOptions {
  url?: string;
  filePath?: string;
  viewport?: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
  waitForSelector?: string;
  waitTime?: number;
  tileSize?: number; // Default: 1072 for Claude Vision API
  overlap?: number; // Pixel overlap between tiles
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-100 for jpeg/webp
}

export interface ScreenshotTile {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: string; // Base64 encoded image
  metadata: {
    pageUrl: string;
    capturedAt: Date;
    viewport: { width: number; height: number };
  };
}

export interface UIElement {
  id: string;
  type: 'button' | 'input' | 'link' | 'image' | 'text' | 'heading' | 'navigation' | 'form' | 'card' | 'modal' | 'menu' | 'other';
  selector?: string;
  xpath?: string;
  text?: string;
  label?: string;
  ariaLabel?: string;
  role?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styles?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
  };
  interactive: boolean;
  visible: boolean;
  children?: UIElement[];
  parentId?: string;
}

export interface DesignSystem {
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
    semantic: {
      success: string[];
      warning: string[];
      error: string[];
      info: string[];
    };
  };
  typography: {
    fonts: string[];
    headingSizes: string[];
    bodySizes: string[];
    lineHeights: string[];
    fontWeights: string[];
  };
  spacing: {
    unit: number;
    scale: number[];
  };
  borders: {
    radii: string[];
    widths: string[];
    styles: string[];
  };
  shadows: string[];
  animations: {
    durations: string[];
    easings: string[];
  };
}

export interface UIAnalysis {
  url?: string;
  timestamp: Date;
  screenshots: ScreenshotTile[];
  elements: UIElement[];
  designSystem: DesignSystem;
  layout: {
    type: 'grid' | 'flex' | 'absolute' | 'mixed';
    columns?: number;
    containerWidth?: number;
    breakpoints?: number[];
  };
  accessibility: {
    score: number;
    issues: AccessibilityIssue[];
    recommendations: string[];
  };
  usability: {
    score: number;
    patterns: UsabilityPattern[];
    improvements: string[];
  };
  brand: {
    consistency: number;
    personality: string[];
    tone: string[];
  };
  components: ComponentAnalysis[];
  navigation: NavigationAnalysis;
  content: ContentAnalysis;
  performance: {
    visualStability: number;
    interactionReadiness: number;
    perceivedSpeed: number;
  };
}

export interface AccessibilityIssue {
  type: 'contrast' | 'alt-text' | 'aria' | 'keyboard' | 'structure' | 'other';
  severity: 'critical' | 'major' | 'minor';
  element?: UIElement;
  description: string;
  recommendation: string;
  wcagCriteria?: string;
}

export interface UsabilityPattern {
  name: string;
  type: 'good' | 'bad' | 'neutral';
  description: string;
  elements: UIElement[];
  impact: 'high' | 'medium' | 'low';
}

export interface ComponentAnalysis {
  name: string;
  type: string;
  instances: number;
  consistency: number;
  variants: ComponentVariant[];
  usage: string[];
}

export interface ComponentVariant {
  id: string;
  name: string;
  properties: Record<string, any>;
  screenshot?: string;
  usage: number;
}

export interface NavigationAnalysis {
  structure: 'linear' | 'hierarchical' | 'network' | 'mixed';
  primaryNav?: UIElement;
  secondaryNav?: UIElement[];
  breadcrumbs?: UIElement;
  sitemap: NavigationNode[];
  userFlow: UserFlow[];
}

export interface NavigationNode {
  label: string;
  url?: string;
  level: number;
  children: NavigationNode[];
}

export interface UserFlow {
  name: string;
  steps: FlowStep[];
  complexity: number;
  completionRate?: number;
}

export interface FlowStep {
  action: string;
  element?: UIElement;
  screenshot?: string;
  nextSteps: string[];
}

export interface ContentAnalysis {
  readability: {
    score: number;
    level: string;
    avgSentenceLength: number;
    avgWordLength: number;
  };
  structure: {
    headings: number[];
    paragraphs: number;
    lists: number;
    images: number;
    videos: number;
  };
  tone: string[];
  keywords: string[];
  callToActions: {
    element: UIElement;
    text: string;
    prominence: number;
  }[];
}

export interface UIComparisonResult {
  similarity: number;
  differences: {
    layout: LayoutDifference[];
    design: DesignDifference[];
    content: ContentDifference[];
    functionality: FunctionalityDifference[];
  };
  recommendations: string[];
}

export interface LayoutDifference {
  type: 'position' | 'size' | 'structure' | 'spacing';
  element1?: UIElement;
  element2?: UIElement;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface DesignDifference {
  type: 'color' | 'typography' | 'style' | 'imagery';
  description: string;
  visual1?: string;
  visual2?: string;
}

export interface ContentDifference {
  type: 'text' | 'image' | 'video' | 'structure';
  description: string;
  before?: string;
  after?: string;
}

export interface FunctionalityDifference {
  type: 'interaction' | 'navigation' | 'feature' | 'behavior';
  description: string;
  impact: string;
}

export interface DesignGuidelineViolation {
  guideline: string;
  severity: 'error' | 'warning' | 'info';
  element?: UIElement;
  description: string;
  fix: string;
}

export interface UIImprovementSuggestion {
  category: 'accessibility' | 'usability' | 'performance' | 'aesthetics' | 'conversion';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
  examples?: string[];
  metrics?: string[];
}