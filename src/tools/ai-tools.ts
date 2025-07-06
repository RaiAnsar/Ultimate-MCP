import { ToolDefinition } from "../types/index.js";

// AI-specific tools will be implemented here
export const placeholder: ToolDefinition = {
  name: "placeholder_ai",
  description: "Placeholder for AI tools",
  inputSchema: { type: "object", properties: {} },
  handler: async () => ({ message: "AI tools to be implemented" }),
};