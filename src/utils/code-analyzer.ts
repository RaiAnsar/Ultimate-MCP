interface CodeAnalysis {
  summary: string;
  complexity: {
    cyclomatic: number;
    cognitive: number;
  };
  concepts: string[];
  suggestions: string[];
  patterns: string[];
  issues: any[];
}

export async function analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
  // This would integrate with actual code analysis tools
  // For now, returning a simplified analysis
  
  const lines = code.split('\n');
  // const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  const analysis: CodeAnalysis = {
    summary: `${language} code with ${lines.length} lines`,
    complexity: {
      cyclomatic: calculateCyclomaticComplexity(code),
      cognitive: calculateCognitiveComplexity(code),
    },
    concepts: detectConcepts(code),
    suggestions: generateSuggestions(code, language),
    patterns: detectPatterns(code),
    issues: detectIssues(code),
  };
  
  return analysis;
}

function calculateCyclomaticComplexity(code: string): number {
  // Simplified cyclomatic complexity calculation
  let complexity = 1;
  
  // Control flow keywords
  const controlKeywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
  for (const keyword of controlKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = code.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  // Logical operators (not word boundaries)
  const operators = ['&&', '||', '?'];
  for (const op of operators) {
    const escapedOp = op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
    const matches = code.match(new RegExp(escapedOp, 'g'));
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

function calculateCognitiveComplexity(code: string): number {
  // Simplified cognitive complexity calculation
  let complexity = 0;
  const lines = code.split('\n');
  let nestingLevel = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Increase nesting for control structures
    if (trimmed.includes('{')) {
      nestingLevel++;
    }
    if (trimmed.includes('}')) {
      nestingLevel = Math.max(0, nestingLevel - 1);
    }
    
    // Add complexity for control flow
    if (/\b(if|for|while|switch)\b/.test(trimmed)) {
      complexity += 1 + nestingLevel;
    }
  }
  
  return complexity;
}

function detectConcepts(code: string): string[] {
  const concepts: string[] = [];
  
  // Common programming concepts
  if (code.includes('async') || code.includes('await')) {
    concepts.push('Asynchronous Programming');
  }
  if (code.includes('class')) {
    concepts.push('Object-Oriented Programming');
  }
  if (code.includes('=>') || code.includes('function')) {
    concepts.push('Functions');
  }
  if (/\b(map|filter|reduce)\b/.test(code)) {
    concepts.push('Functional Programming');
  }
  if (code.includes('try') && code.includes('catch')) {
    concepts.push('Error Handling');
  }
  
  return [...new Set(concepts)];
}

function generateSuggestions(code: string, language: string): string[] {
  const suggestions: string[] = [];
  
  // Basic suggestions based on code patterns
  if (!code.includes('try') && code.includes('async')) {
    suggestions.push('Consider adding error handling for async operations');
  }
  
  if (code.includes('var ') && language === 'javascript') {
    suggestions.push('Consider using const/let instead of var');
  }
  
  const lines = code.split('\n');
  const longLines = lines.filter(line => line.length > 100);
  if (longLines.length > 0) {
    suggestions.push('Some lines are too long, consider breaking them up');
  }
  
  return suggestions;
}

function detectPatterns(code: string): string[] {
  const patterns: string[] = [];
  
  // Detect common design patterns
  if (code.includes('getInstance') || code.includes('instance')) {
    patterns.push('Singleton Pattern');
  }
  if (code.includes('Observer') || code.includes('addEventListener')) {
    patterns.push('Observer Pattern');
  }
  if (code.includes('Factory') || code.includes('create')) {
    patterns.push('Factory Pattern');
  }
  
  return patterns;
}

function detectIssues(code: string): any[] {
  const issues: any[] = [];
  
  // Basic issue detection
  if (code.includes('eval(')) {
    issues.push({
      type: 'security',
      severity: 'high',
      message: 'Avoid using eval() as it can lead to security vulnerabilities',
    });
  }
  
  if (code.includes('password') && !code.includes('hash')) {
    issues.push({
      type: 'security',
      severity: 'high',
      message: 'Passwords should be hashed, not stored in plain text',
    });
  }
  
  return issues;
}