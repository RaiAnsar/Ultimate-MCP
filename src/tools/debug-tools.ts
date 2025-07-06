import { ToolDefinition } from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { analyzeCode } from "../utils/code-analyzer.js";
import { searchStackOverflow, searchGitHubIssues } from "../utils/web-search.js";

const logger = new Logger("DebugTools");

export const analyzeError: ToolDefinition = {
  name: "analyze_error",
  description: "Analyze an error message and provide debugging suggestions with potential fixes",
  inputSchema: {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "The error message or stack trace",
      },
      code: {
        type: "string",
        description: "The code that caused the error (optional)",
      },
      language: {
        type: "string",
        description: "Programming language (optional)",
        enum: ["javascript", "typescript", "python", "java", "go", "rust"],
      },
    },
    required: ["error"],
  },
  handler: async ({ error, code, language }) => {
    logger.info("Analyzing error:", { error: error.substring(0, 100) });

    const analysis = {
      error: error,
      type: detectErrorType(error),
      commonCauses: [] as string[],
      suggestedFixes: [] as string[],
      relatedIssues: [] as any[],
      codeAnalysis: null as any,
    };

    // Analyze error type and common causes
    if (analysis.type === "TypeError") {
      analysis.commonCauses = [
        "Accessing property of undefined/null",
        "Incorrect function arguments",
        "Type mismatch",
      ];
      analysis.suggestedFixes = [
        "Add null/undefined checks",
        "Verify function signatures",
        "Use TypeScript for type safety",
      ];
    } else if (analysis.type === "SyntaxError") {
      analysis.commonCauses = [
        "Missing brackets or parentheses",
        "Incorrect syntax for language version",
        "Typos in keywords",
      ];
      analysis.suggestedFixes = [
        "Check bracket matching",
        "Verify language version compatibility",
        "Use a linter",
      ];
    }

    // Analyze provided code
    if (code) {
      analysis.codeAnalysis = await analyzeCode(code, language || "javascript");
    }

    // Search for similar issues
    try {
      const stackOverflowResults = await searchStackOverflow(error);
      const githubIssues = await searchGitHubIssues(error);
      
      analysis.relatedIssues = [
        ...stackOverflowResults.slice(0, 3),
        ...githubIssues.slice(0, 2),
      ];
    } catch (searchError) {
      logger.warn("Failed to search for related issues:", searchError);
    }

    return analysis;
  },
  tags: ["debugging", "error-analysis"],
};

export const explainCode: ToolDefinition = {
  name: "explain_code",
  description: "Explain how a piece of code works with detailed breakdown",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code to explain",
      },
      language: {
        type: "string",
        description: "Programming language",
        enum: ["javascript", "typescript", "python", "java", "go", "rust", "cpp"],
      },
      level: {
        type: "string",
        description: "Explanation level",
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate",
      },
    },
    required: ["code"],
  },
  handler: async ({ code, language, level = "intermediate" }) => {
    const analysis = await analyzeCode(code, language || "javascript");
    
    const explanation = {
      summary: analysis.summary,
      complexity: analysis.complexity,
      breakdown: [] as any[],
      concepts: analysis.concepts,
      bestPractices: [],
      improvements: analysis.suggestions,
    };

    // Break down code into logical sections
    const lines = code.split("\n");
    let currentSection = { lines: [] as string[], description: "" };
    
    for (const line of lines) {
      if (isSignificantLine(line)) {
        if (currentSection.lines.length > 0) {
          explanation.breakdown.push({
            code: currentSection.lines.join("\n"),
            explanation: generateExplanation(currentSection.lines, level),
          });
        }
        currentSection = { lines: [line], description: "" };
      } else {
        currentSection.lines.push(line);
      }
    }

    // Add last section
    if (currentSection.lines.length > 0) {
      explanation.breakdown.push({
        code: currentSection.lines.join("\n"),
        explanation: generateExplanation(currentSection.lines, level),
      });
    }

    return explanation;
  },
  tags: ["education", "code-analysis"],
};

export const suggestOptimizations: ToolDefinition = {
  name: "suggest_optimizations",
  description: "Analyze code and suggest performance optimizations",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code to optimize",
      },
      language: {
        type: "string",
        description: "Programming language",
      },
      focus: {
        type: "string",
        description: "Optimization focus",
        enum: ["performance", "memory", "readability", "all"],
        default: "all",
      },
    },
    required: ["code"],
  },
  handler: async ({ code, language, focus = "all" }) => {
    const analysis = await analyzeCode(code, language || "javascript");
    
    const optimizations = {
      current: analysis,
      suggestions: [] as any[],
      benchmarks: {},
    };

    // Performance optimizations
    if (focus === "performance" || focus === "all") {
      optimizations.suggestions.push(...getPerformanceOptimizations(code));
    }

    // Memory optimizations
    if (focus === "memory" || focus === "all") {
      optimizations.suggestions.push(...getMemoryOptimizations(code));
    }

    // Readability improvements
    if (focus === "readability" || focus === "all") {
      optimizations.suggestions.push(...getReadabilityImprovements(code));
    }

    // Sort by impact
    optimizations.suggestions.sort((a, b) => b.impact - a.impact);

    return optimizations;
  },
  tags: ["optimization", "performance"],
};

export const debuggingSession: ToolDefinition = {
  name: "debugging_session",
  description: "Start an interactive debugging session with step-by-step guidance",
  inputSchema: {
    type: "object",
    properties: {
      problem: {
        type: "string",
        description: "Description of the problem",
      },
      code: {
        type: "string",
        description: "The problematic code",
      },
      expected: {
        type: "string",
        description: "Expected behavior",
      },
      actual: {
        type: "string",
        description: "Actual behavior",
      },
    },
    required: ["problem"],
  },
  handler: async ({ problem, code, expected, actual }) => {
    const session = {
      id: generateSessionId(),
      problem,
      hypothesis: [] as any[],
      steps: [] as Array<{hypothesis: string; test: string; verification: string}>,
      solution: null as string | null,
    };

    // Generate initial hypotheses
    const generatedHypotheses = generateHypotheses(problem, code, expected, actual);
    session.hypothesis = generatedHypotheses;

    // Create debugging steps
    for (const hypothesis of generatedHypotheses) {
      session.steps.push({
        hypothesis: hypothesis.description,
        test: hypothesis.test,
        verification: hypothesis.verification,
      });
    }

    // Add systematic debugging steps
    session.steps.push(
      {
        hypothesis: "Input validation",
        test: "Log all inputs at function entry",
        verification: "Check if inputs match expected types and ranges",
      },
      {
        hypothesis: "State inspection",
        test: "Add breakpoints at key state changes",
        verification: "Verify state transitions are correct",
      },
      {
        hypothesis: "Edge cases",
        test: "Test with boundary values and special cases",
        verification: "Ensure all edge cases are handled",
      }
    );

    return session;
  },
  tags: ["debugging", "interactive"],
};

// Helper functions
function detectErrorType(error: string): string {
  if (error.includes("TypeError")) return "TypeError";
  if (error.includes("SyntaxError")) return "SyntaxError";
  if (error.includes("ReferenceError")) return "ReferenceError";
  if (error.includes("RangeError")) return "RangeError";
  return "UnknownError";
}

function isSignificantLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("function") ||
    trimmed.startsWith("class") ||
    trimmed.startsWith("const") ||
    trimmed.startsWith("let") ||
    trimmed.startsWith("if") ||
    trimmed.startsWith("for") ||
    trimmed.startsWith("while") ||
    trimmed.includes("=>")
  );
}

function generateExplanation(_lines: string[], level: string): string {
  // Simplified explanation generation
  // const code = lines.join("\n");
  
  if (level === "beginner") {
    return `This code section performs a specific task. Let me break it down in simple terms...`;
  } else if (level === "advanced") {
    return `This implementation uses advanced patterns. Here's a detailed analysis...`;
  }
  
  return `This code implements functionality as follows...`;
}

function getPerformanceOptimizations(code: string): any[] {
  const optimizations = [];
  
  // Check for common performance issues
  if (code.includes("for") && code.includes("for", code.indexOf("for") + 1)) {
    optimizations.push({
      type: "performance",
      issue: "Nested loops detected",
      suggestion: "Consider using more efficient algorithms or data structures",
      impact: 8,
    });
  }
  
  if (code.includes(".forEach") || code.includes(".map")) {
    optimizations.push({
      type: "performance",
      issue: "Array iteration methods",
      suggestion: "For performance-critical code, consider using traditional for loops",
      impact: 3,
    });
  }
  
  return optimizations;
}

function getMemoryOptimizations(code: string): any[] {
  const optimizations: any[] = [];
  
  if (code.includes("push") && !code.includes("length")) {
    optimizations.push({
      type: "memory",
      issue: "Unbounded array growth",
      suggestion: "Consider pre-allocating array size or implementing size limits",
      impact: 6,
    });
  }
  
  return optimizations;
}

function getReadabilityImprovements(code: string): any[] {
  const improvements: any[] = [];
  
  // Check line length
  const lines = code.split("\n");
  const longLines = lines.filter(line => line.length > 80);
  
  if (longLines.length > 0) {
    improvements.push({
      type: "readability",
      issue: "Long lines detected",
      suggestion: "Break long lines for better readability",
      impact: 4,
    });
  }
  
  return improvements;
}

function generateHypotheses(problem: string, _code?: string, _expected?: string, _actual?: string): any[] {
  const hypotheses: any[] = [];
  
  if (problem.toLowerCase().includes("undefined")) {
    hypotheses.push({
      description: "Variable or property is undefined",
      test: "Add console.log before the error line",
      verification: "Check if the value exists",
    });
  }
  
  if (problem.toLowerCase().includes("not work")) {
    hypotheses.push({
      description: "Logic error in implementation",
      test: "Step through the code with a debugger",
      verification: "Compare actual vs expected execution path",
    });
  }
  
  return hypotheses;
}

function generateSessionId(): string {
  return `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}