import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "../utils/logger.js";
import type { ResourceDefinition } from "../types/index.js";

export class ResourceRegistry {
  private resources: Map<string, ResourceDefinition> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger("ResourceRegistry");
  }

  register(resource: ResourceDefinition): void {
    if (this.resources.has(resource.uri)) {
      throw new Error(`Resource ${resource.uri} is already registered`);
    }

    this.resources.set(resource.uri, resource);
    this.logger.info(`Registered resource: ${resource.uri}`);
  }

  unregister(uri: string): void {
    this.resources.delete(uri);
    this.logger.info(`Unregistered resource: ${uri}`);
  }

  async listResources(): Promise<Resource[]> {
    return Array.from(this.resources.values()).map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  async readResource(uri: string): Promise<{ text: string; mimeType?: string }> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource ${uri} not found`);
    }

    try {
      const content = await resource.handler();
      
      // Handle different content types
      if (typeof content === "string") {
        return { text: content, mimeType: resource.mimeType };
      } else if (content && typeof content === "object" && "text" in content) {
        return { text: content.text, mimeType: content.mimeType || resource.mimeType };
      } else {
        return { text: JSON.stringify(content, null, 2), mimeType: "application/json" };
      }
    } catch (error) {
      this.logger.error(`Failed to read resource ${uri}:`, error);
      throw error;
    }
  }

  getResourceCount(): number {
    return this.resources.size;
  }

  getResource(uri: string): ResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  getResourcesByTag(tag: string): ResourceDefinition[] {
    return Array.from(this.resources.values()).filter(
      (resource) => resource.tags?.includes(tag)
    );
  }

  // Pattern matching for dynamic resources
  findMatchingResources(pattern: string): ResourceDefinition[] {
    const regex = new RegExp(pattern);
    return Array.from(this.resources.values()).filter(
      (resource) => regex.test(resource.uri)
    );
  }
}