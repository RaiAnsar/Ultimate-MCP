import { UltimateMCPServer } from "../core/server.js";
import { PromptDefinition } from "../types/index.js";

export async function registerBuiltInPrompts(server: UltimateMCPServer): Promise<void> {
  // Debug analysis prompt
  const debugAnalysis: PromptDefinition = {
    name: "debug_analysis",
    description: "Comprehensive debugging analysis for code issues",
    arguments: [
      {
        name: "error",
        description: "The error message or issue description",
        required: true,
      },
      {
        name: "code",
        description: "The code that's causing the issue",
        required: false,
      },
      {
        name: "context",
        description: "Additional context about the environment",
        required: false,
      },
    ],
    handler: async ({ error, code, context }) => {
      const messages = [
        {
          role: "system" as const,
          content: `You are an expert debugger and problem solver. Analyze the provided error and code to identify the root cause and provide actionable solutions.`,
        },
        {
          role: "user" as const,
          content: `Error: ${error}\n\n${code ? `Code:\n\`\`\`\n${code}\n\`\`\`\n\n` : ""}${context ? `Context: ${context}` : ""}

Please provide:
1. Root cause analysis
2. Step-by-step debugging approach
3. Potential solutions with code examples
4. Best practices to prevent similar issues`,
        },
      ];

      return { messages };
    },
    tags: ["debugging", "analysis"],
  };

  // Code review prompt
  const codeReview: PromptDefinition = {
    name: "code_review",
    description: "Comprehensive code review with suggestions",
    arguments: [
      {
        name: "code",
        description: "The code to review",
        required: true,
      },
      {
        name: "language",
        description: "Programming language",
        required: false,
        default: "javascript",
      },
      {
        name: "focus",
        description: "Review focus areas",
        required: false,
        default: "all",
      },
    ],
    handler: async ({ code, language, focus }) => {
      const messages = [
        {
          role: "system" as const,
          content: `You are an expert code reviewer. Provide comprehensive feedback on code quality, security, performance, and best practices.`,
        },
        {
          role: "user" as const,
          content: `Please review this ${language} code${focus !== "all" ? ` with focus on ${focus}` : ""}:

\`\`\`${language}
${code}
\`\`\`

Provide feedback on:
1. Code quality and readability
2. Potential bugs or issues
3. Security vulnerabilities
4. Performance optimizations
5. Best practices and patterns
6. Suggested improvements with examples`,
        },
      ];

      return { messages };
    },
    tags: ["code-review", "quality"],
  };

  // Architecture design prompt
  const architectureDesign: PromptDefinition = {
    name: "architecture_design",
    description: "Design software architecture for complex systems",
    arguments: [
      {
        name: "requirements",
        description: "System requirements and goals",
        required: true,
      },
      {
        name: "constraints",
        description: "Technical constraints and limitations",
        required: false,
      },
      {
        name: "scale",
        description: "Expected scale (users, data, etc.)",
        required: false,
      },
    ],
    handler: async ({ requirements, constraints, scale }) => {
      const messages = [
        {
          role: "system" as const,
          content: `You are a senior software architect. Design robust, scalable architectures that balance complexity with maintainability.`,
        },
        {
          role: "user" as const,
          content: `Design a software architecture for:

Requirements: ${requirements}
${constraints ? `\nConstraints: ${constraints}` : ""}
${scale ? `\nExpected Scale: ${scale}` : ""}

Please provide:
1. High-level architecture overview
2. Key components and their responsibilities
3. Technology stack recommendations
4. Data flow and storage design
5. Security considerations
6. Scalability strategy
7. Monitoring and observability approach
8. Potential challenges and mitigation strategies`,
        },
      ];

      return { messages };
    },
    tags: ["architecture", "design"],
  };

  // Problem solving prompt
  const problemSolving: PromptDefinition = {
    name: "problem_solving",
    description: "Systematic problem-solving approach for complex challenges",
    arguments: [
      {
        name: "problem",
        description: "The problem to solve",
        required: true,
      },
      {
        name: "constraints",
        description: "Any constraints or limitations",
        required: false,
      },
      {
        name: "resources",
        description: "Available resources",
        required: false,
      },
    ],
    handler: async ({ problem, constraints, resources }) => {
      const messages = [
        {
          role: "system" as const,
          content: `You are an expert problem solver. Use systematic thinking to break down complex problems and find optimal solutions.`,
        },
        {
          role: "user" as const,
          content: `Problem: ${problem}
${constraints ? `\nConstraints: ${constraints}` : ""}
${resources ? `\nAvailable Resources: ${resources}` : ""}

Apply systematic problem-solving:
1. Problem Analysis
   - Break down the problem
   - Identify root causes
   - Define success criteria

2. Solution Generation
   - Brainstorm multiple approaches
   - Evaluate pros and cons
   - Consider edge cases

3. Implementation Plan
   - Step-by-step approach
   - Resource allocation
   - Timeline estimation

4. Risk Assessment
   - Potential obstacles
   - Mitigation strategies
   - Fallback plans

5. Success Metrics
   - How to measure success
   - Monitoring approach`,
        },
      ];

      return { messages };
    },
    tags: ["problem-solving", "planning"],
  };

  server.registerPrompt(debugAnalysis);
  server.registerPrompt(codeReview);
  server.registerPrompt(architectureDesign);
  server.registerPrompt(problemSolving);
}