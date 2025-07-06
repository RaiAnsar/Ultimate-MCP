import { ToolDefinition } from "../types/index.js";

// System-specific tools will be implemented here
export const placeholder: ToolDefinition = {
  name: "placeholder_system",
  description: "Placeholder for system tools",
  inputSchema: { type: "object", properties: {} },
  handler: async () => ({ message: "System tools to be implemented" }),
};