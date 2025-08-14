import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { AIOrchestrator } from '../providers/orchestrator.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('PromptEnhancementTools');

// Prompt enhancement strategies
export interface PromptEnhancementStrategy {
  name: string;
  description: string;
  enhance: (prompt: string, context?: any) => Promise<string>;
}

// Built-in enhancement strategies
class ClarityEnhancer implements PromptEnhancementStrategy {
  name = 'clarity';
  description = 'Improve prompt clarity and specificity';
  
  async enhance(prompt: string): Promise<string> {
    const enhancements = [];
    
    // Add specificity if too vague
    if (prompt.length < 50 && !prompt.includes('?')) {
      enhancements.push('Please provide specific details about what you need.');
    }
    
    // Add context if missing
    if (!prompt.match(/context|background|situation/i)) {
      enhancements.push('Include relevant context or background information.');
    }
    
    // Add expected output format
    if (!prompt.match(/format|structure|example/i)) {
      enhancements.push('Specify the desired output format or structure.');
    }
    
    const enhanced = enhancements.length > 0
      ? `${prompt}\n\nAdditional details:\n${enhancements.join('\n')}`
      : prompt;
      
    return enhanced;
  }
}

class TechnicalEnhancer implements PromptEnhancementStrategy {
  name = 'technical';
  description = 'Enhance prompts for technical/coding tasks';
  
  async enhance(prompt: string): Promise<string> {
    const additions = [];
    
    // Add language specification
    if (prompt.match(/code|function|class|implement/i) && !prompt.match(/javascript|python|java|typescript|rust|go/i)) {
      additions.push('Programming language: [Please specify]');
    }
    
    // Add requirements
    if (!prompt.match(/requirement|constraint|must|should/i)) {
      additions.push('Requirements:\n- Error handling\n- Edge cases\n- Performance considerations');
    }
    
    // Add example format
    if (!prompt.match(/example|sample|format/i)) {
      additions.push('Please include example usage or expected input/output');
    }
    
    return additions.length > 0
      ? `${prompt}\n\n${additions.join('\n\n')}`
      : prompt;
  }
}

class CreativeEnhancer implements PromptEnhancementStrategy {
  name = 'creative';
  description = 'Enhance prompts for creative tasks';
  
  async enhance(prompt: string): Promise<string> {
    const suggestions = [];
    
    // Add style/tone
    if (!prompt.match(/style|tone|voice|mood/i)) {
      suggestions.push('Style/Tone: [casual, formal, playful, serious, etc.]');
    }
    
    // Add audience
    if (!prompt.match(/audience|reader|viewer|user/i)) {
      suggestions.push('Target audience: [general, technical, children, professionals, etc.]');
    }
    
    // Add constraints
    if (!prompt.match(/length|word|limit|constraint/i)) {
      suggestions.push('Length/Format constraints: [word count, paragraphs, sections, etc.]');
    }
    
    return suggestions.length > 0
      ? `${prompt}\n\nConsiderations:\n${suggestions.join('\n')}`
      : prompt;
  }
}

class AnalyticalEnhancer implements PromptEnhancementStrategy {
  name = 'analytical';
  description = 'Enhance prompts for analysis and research tasks';
  
  async enhance(prompt: string): Promise<string> {
    const components = [];
    
    // Add scope
    if (!prompt.match(/scope|focus|aspect|dimension/i)) {
      components.push('Scope: [What specific aspects to analyze?]');
    }
    
    // Add methodology
    if (!prompt.match(/method|approach|framework|model/i)) {
      components.push('Methodology: [Analytical framework or approach to use]');
    }
    
    // Add depth
    if (!prompt.match(/depth|detail|comprehensive|thorough/i)) {
      components.push('Depth of analysis: [High-level overview or detailed examination?]');
    }
    
    // Add output structure
    if (!prompt.match(/structure|format|organize|present/i)) {
      components.push('Output structure: [Summary, detailed report, comparison table, etc.]');
    }
    
    return components.length > 0
      ? `${prompt}\n\nAnalysis parameters:\n${components.join('\n')}`
      : prompt;
  }
}

// Strategy manager
class PromptEnhancementManager {
  private strategies = new Map<string, PromptEnhancementStrategy>();
  
  constructor() {
    this.registerStrategy(new ClarityEnhancer());
    this.registerStrategy(new TechnicalEnhancer());
    this.registerStrategy(new CreativeEnhancer());
    this.registerStrategy(new AnalyticalEnhancer());
  }
  
  registerStrategy(strategy: PromptEnhancementStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }
  
  getStrategy(name: string): PromptEnhancementStrategy | undefined {
    return this.strategies.get(name);
  }
  
  getAllStrategies(): PromptEnhancementStrategy[] {
    return Array.from(this.strategies.values());
  }
}

const enhancementManager = new PromptEnhancementManager();

// Tool definitions

export const enhancePrompt: ToolDefinition = {
  name: 'enhance_prompt',
  description: 'Enhance a prompt using various strategies to improve clarity and effectiveness',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt to enhance'),
    strategy: z.enum(['clarity', 'technical', 'creative', 'analytical', 'auto'])
      .optional()
      .default('auto')
      .describe('Enhancement strategy to use'),
    context: z.record(z.any()).optional().describe('Additional context for enhancement')
  }).strict() as any,
  handler: async (args) => {
    const { prompt, strategy, context } = args;
    
    if (strategy === 'auto') {
      // Auto-detect best strategy based on prompt content
      const strategies = [];
      
      if (prompt.match(/code|function|implement|algorithm|debug/i)) {
        strategies.push('technical');
      }
      if (prompt.match(/write|create|design|story|content/i)) {
        strategies.push('creative');
      }
      if (prompt.match(/analyze|compare|evaluate|assess|research/i)) {
        strategies.push('analytical');
      }
      
      // Always include clarity
      strategies.push('clarity');
      
      // Apply all detected strategies
      let enhanced = prompt;
      for (const strategyName of strategies) {
        const enhancer = enhancementManager.getStrategy(strategyName);
        if (enhancer) {
          enhanced = await enhancer.enhance(enhanced, context);
        }
      }
      
      return {
        original: prompt,
        enhanced,
        strategiesApplied: strategies,
        improvements: strategies.length
      };
    } else {
      const enhancer = enhancementManager.getStrategy(strategy);
      if (!enhancer) {
        throw new Error(`Unknown strategy: ${strategy}`);
      }
      
      const enhanced = await enhancer.enhance(prompt, context);
      
      return {
        original: prompt,
        enhanced,
        strategiesApplied: [strategy],
        improvements: enhanced !== prompt ? 1 : 0
      };
    }
  }
};

export const analyzePrompt: ToolDefinition = {
  name: 'analyze_prompt',
  description: 'Analyze a prompt and provide improvement suggestions',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt to analyze'),
    verbose: z.boolean().optional().default(false).describe('Include detailed analysis')
  }).strict() as any,
  handler: async (args) => {
    const { prompt, verbose } = args;
    const analysis = {
      length: prompt.length,
      wordCount: prompt.split(/\s+/).length,
      hasQuestion: prompt.includes('?'),
      clarity: {
        score: 0,
        issues: [] as string[]
      },
      specificity: {
        score: 0,
        issues: [] as string[]
      },
      structure: {
        score: 0,
        issues: [] as string[]
      },
      suggestions: [] as string[]
    };
    
    // Clarity analysis
    if (prompt.length < 20) {
      analysis.clarity.issues.push('Prompt is too short');
      analysis.suggestions.push('Provide more detail about what you need');
    } else {
      analysis.clarity.score += 1;
    }
    
    if (!prompt.match(/[.?!]$/)) {
      analysis.clarity.issues.push('No clear sentence ending');
    } else {
      analysis.clarity.score += 1;
    }
    
    // Specificity analysis
    const vagueWords = ['something', 'stuff', 'thing', 'whatever', 'somehow'];
    const foundVague = vagueWords.filter(word => 
      prompt.toLowerCase().includes(word)
    );
    if (foundVague.length > 0) {
      analysis.specificity.issues.push(`Contains vague words: ${foundVague.join(', ')}`);
      analysis.suggestions.push('Replace vague words with specific terms');
    } else {
      analysis.specificity.score += 1;
    }
    
    // Structure analysis
    if (prompt.includes('\n')) {
      analysis.structure.score += 1;
    }
    
    if (prompt.match(/\d\.|•|-\s/)) {
      analysis.structure.score += 1;
    } else if (prompt.length > 100) {
      analysis.structure.issues.push('Long prompt without structure');
      analysis.suggestions.push('Consider using bullet points or numbered lists');
    }
    
    // Calculate overall score
    const totalScore = analysis.clarity.score + analysis.specificity.score + analysis.structure.score;
    const maxScore = 5;
    const overallScore = (totalScore / maxScore) * 100;
    
    // Generate recommendations
    if (overallScore < 60) {
      analysis.suggestions.push('This prompt would benefit from enhancement');
    }
    
    return {
      prompt: verbose ? prompt : prompt.substring(0, 100) + '...',
      analysis: {
        overallScore: Math.round(overallScore),
        clarity: analysis.clarity,
        specificity: analysis.specificity,
        structure: analysis.structure
      },
      suggestions: analysis.suggestions,
      recommendedStrategies: [
        analysis.clarity.issues.length > 0 && 'clarity',
        prompt.match(/code|function|implement/i) && 'technical',
        prompt.match(/write|create|design/i) && 'creative',
        prompt.match(/analyze|compare|evaluate/i) && 'analytical'
      ].filter(Boolean)
    };
  }
};

export const generatePromptTemplate: ToolDefinition = {
  name: 'generate_prompt_template',
  description: 'Generate a reusable prompt template for common tasks',
  inputSchema: z.object({
    taskType: z.enum([
      'code_generation',
      'bug_fix',
      'code_review',
      'documentation',
      'analysis',
      'creative_writing',
      'translation',
      'summarization',
      'question_answering',
      'data_extraction'
    ]).describe('Type of task the template is for'),
    customFields: z.array(z.string()).optional()
      .describe('Additional custom fields to include in template')
  }).strict() as any,
  handler: async (args) => {
    const { taskType, customFields = [] } = args;
    
    const templates: Record<string, any> = {
      code_generation: {
        template: `Generate [LANGUAGE] code that:

**Purpose**: [WHAT_IT_SHOULD_DO]

**Requirements**:
- [REQUIREMENT_1]
- [REQUIREMENT_2]
- Error handling for [EDGE_CASES]

**Input/Output**:
- Input: [INPUT_FORMAT]
- Output: [OUTPUT_FORMAT]

**Constraints**:
- [PERFORMANCE_REQUIREMENTS]
- [CODING_STYLE]

**Example usage**:
\`\`\`[LANGUAGE]
[EXAMPLE_CODE]
\`\`\``,
        fields: ['LANGUAGE', 'WHAT_IT_SHOULD_DO', 'REQUIREMENT_1', 'REQUIREMENT_2', 
                 'EDGE_CASES', 'INPUT_FORMAT', 'OUTPUT_FORMAT', 'PERFORMANCE_REQUIREMENTS',
                 'CODING_STYLE', 'EXAMPLE_CODE'],
        description: 'Template for generating new code with clear specifications'
      },
      
      bug_fix: {
        template: `Fix the following bug:

**Problem Description**: [WHAT_IS_BROKEN]

**Expected Behavior**: [WHAT_SHOULD_HAPPEN]

**Actual Behavior**: [WHAT_ACTUALLY_HAPPENS]

**Error Message/Stack Trace**:
\`\`\`
[ERROR_OUTPUT]
\`\`\`

**Code Context**:
\`\`\`[LANGUAGE]
[RELEVANT_CODE]
\`\`\`

**Steps to Reproduce**:
1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Environment**: [ENVIRONMENT_DETAILS]`,
        fields: ['WHAT_IS_BROKEN', 'WHAT_SHOULD_HAPPEN', 'WHAT_ACTUALLY_HAPPENS',
                 'ERROR_OUTPUT', 'LANGUAGE', 'RELEVANT_CODE', 'STEP_1', 'STEP_2', 
                 'STEP_3', 'ENVIRONMENT_DETAILS'],
        description: 'Template for describing and fixing bugs'
      },
      
      code_review: {
        template: `Review the following code:

**Code to Review**:
\`\`\`[LANGUAGE]
[CODE_TO_REVIEW]
\`\`\`

**Review Focus**:
- [ ] Correctness
- [ ] Performance
- [ ] Security
- [ ] Readability
- [ ] Best Practices
- [ ] [CUSTOM_FOCUS]

**Context**: [CODE_PURPOSE]

**Specific Concerns**: [SPECIFIC_CONCERNS]`,
        fields: ['LANGUAGE', 'CODE_TO_REVIEW', 'CUSTOM_FOCUS', 'CODE_PURPOSE', 'SPECIFIC_CONCERNS'],
        description: 'Template for requesting code reviews'
      },
      
      documentation: {
        template: `Create documentation for:

**Component/Feature**: [COMPONENT_NAME]

**Purpose**: [WHAT_IT_DOES]

**Target Audience**: [WHO_WILL_READ_THIS]

**Documentation Sections**:
1. Overview
2. [CUSTOM_SECTION_1]
3. [CUSTOM_SECTION_2]
4. Examples
5. API Reference (if applicable)
6. Troubleshooting

**Key Points to Cover**:
- [KEY_POINT_1]
- [KEY_POINT_2]
- [KEY_POINT_3]

**Code Examples**: [INCLUDE_EXAMPLES]`,
        fields: ['COMPONENT_NAME', 'WHAT_IT_DOES', 'WHO_WILL_READ_THIS',
                 'CUSTOM_SECTION_1', 'CUSTOM_SECTION_2', 'KEY_POINT_1',
                 'KEY_POINT_2', 'KEY_POINT_3', 'INCLUDE_EXAMPLES'],
        description: 'Template for creating documentation'
      },
      
      analysis: {
        template: `Analyze [SUBJECT]:

**Analysis Scope**: [WHAT_TO_ANALYZE]

**Key Questions**:
1. [QUESTION_1]
2. [QUESTION_2]
3. [QUESTION_3]

**Data/Context**:
[RELEVANT_DATA]

**Analysis Framework**: [METHODOLOGY]

**Expected Output**:
- [OUTPUT_FORMAT]
- Depth: [DETAIL_LEVEL]
- Include: [SPECIFIC_INCLUSIONS]`,
        fields: ['SUBJECT', 'WHAT_TO_ANALYZE', 'QUESTION_1', 'QUESTION_2',
                 'QUESTION_3', 'RELEVANT_DATA', 'METHODOLOGY', 'OUTPUT_FORMAT',
                 'DETAIL_LEVEL', 'SPECIFIC_INCLUSIONS'],
        description: 'Template for analytical tasks'
      }
    };
    
    // Add more templates for other task types...
    const template = templates[taskType] || {
      template: `[TASK_TYPE] Task:\n\n[DESCRIPTION]\n\n[REQUIREMENTS]`,
      fields: ['TASK_TYPE', 'DESCRIPTION', 'REQUIREMENTS'],
      description: 'Generic task template'
    };
    
    // Add custom fields
    if (customFields.length > 0) {
      template.fields.push(...customFields);
      template.template += '\n\n**Additional Information**:\n' + 
        customFields.map((field: any) => `- ${field}: [${field}]`).join('\n');
    }
    
    return {
      taskType,
      template: template.template,
      fields: template.fields,
      description: template.description,
      usage: `Replace the [FIELD_NAME] placeholders with your specific information`,
      example: template.fields.slice(0, 3).reduce((acc: any, field: any) => {
        acc[field] = `Example value for ${field}`;
        return acc;
      }, {} as Record<string, string>)
    };
  }
};

export const refinePrompt: ToolDefinition = {
  name: 'refine_prompt',
  description: 'Iteratively refine a prompt using AI feedback',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt to refine'),
    goal: z.string().describe('What you want to achieve with this prompt'),
    iterations: z.number().min(1).max(5).optional().default(3)
      .describe('Number of refinement iterations'),
    model: z.string().optional().describe('AI model to use for refinement')
  }).strict() as any,
  handler: async (args, orchestrator?: AIOrchestrator) => {
    if (!orchestrator) {
      throw new Error('AI orchestrator required for prompt refinement');
    }
    
    const { prompt, goal, iterations, model } = args;
    const refinements = [];
    let currentPrompt = prompt;
    
    for (let i = 0; i < iterations; i++) {
      const refinementPrompt = `Improve this prompt to better achieve the goal.

Current Prompt: "${currentPrompt}"

Goal: ${goal}

Provide an improved version that is more:
1. Clear and specific
2. Structured and organized  
3. Actionable with concrete outputs
4. Complete with necessary context

Return ONLY the improved prompt, no explanations.`;

      const result = await orchestrator.orchestrate({
        prompt: refinementPrompt,
        strategy: 'specialist' as any,
        models: model ? [model] : undefined,
        options: { temperature: 0.7 }
      });
      
      const refined = result.responses[0]?.response || currentPrompt;
      
      refinements.push({
        iteration: i + 1,
        prompt: refined,
        changes: refined !== currentPrompt
      });
      
      currentPrompt = refined;
    }
    
    return {
      original: prompt,
      final: currentPrompt,
      goal,
      refinements,
      improvement: currentPrompt !== prompt,
      totalIterations: iterations
    };
  }
};

// Export all prompt enhancement tools
export const promptEnhancementTools: ToolDefinition[] = [
  enhancePrompt,
  analyzePrompt,
  generatePromptTemplate,
  refinePrompt
];