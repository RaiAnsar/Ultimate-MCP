import { z } from 'zod';

// Test the buildSmartContext schema
const buildSmartContextSchema = z.object({
  task: z.string().describe('Task description or query'),
  basePath: z.string().describe('Base path to search from'),
  options: z.object({
    maxTokens: z.number().optional().default(12000),
    strategy: z.enum(['comprehensive', 'focused', 'minimal'])
      .optional().default('focused'),
    fileTypes: z.array(z.string()).optional()
      .describe('File extensions to include (e.g., [".ts", ".js"])')
  }).optional()
}).strict();

// Convert to JSON Schema
const jsonSchema = buildSmartContextSchema;
console.log('Schema shape:', jsonSchema.shape);
console.log('Schema _def:', jsonSchema._def);

// Check what happens when we try to get required fields
const shape = jsonSchema.shape;
const required = Object.keys(shape).filter(key => {
  const field = shape[key];
  return !field.isOptional();
});

console.log('Required fields:', required);