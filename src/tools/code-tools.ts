import { ToolDefinition } from "../types/index.js";

// Code-specific tools will be implemented here
export const placeholder: ToolDefinition = {
  name: "placeholder_code",
  description: "Placeholder for code tools",
  inputSchema: { type: "object", properties: {} },
  handler: async () => ({ message: "Code tools to be implemented" }),
};