import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LazyToolRegistry } from '../src/core/lazy-tool-registry.js';

describe('LazyToolRegistry', () => {
  let registry: LazyToolRegistry;

  beforeEach(() => {
    registry = new LazyToolRegistry();
  });

  describe('Tool Registration', () => {
    it('should register a tool without loading its implementation', () => {
      let implementationLoaded = false;
      
      registry.registerLazyTool({
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        loader: async () => {
          implementationLoaded = true;
          return {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
            handler: async (args) => ({
              content: [{ type: 'text', text: `Processed: ${args.input}` }]
            })
          };
        }
      });

      expect(registry.hasToolMetadata('test_tool')).toBe(true);
      expect(implementationLoaded).toBe(false);
    });

    it('should register multiple tools', () => {
      const tools = ['tool1', 'tool2', 'tool3'];
      
      tools.forEach(name => {
        registry.registerLazyTool({
          name,
          description: `${name} description`,
          inputSchema: { type: 'object' },
          loader: async () => ({
            name,
            description: `${name} description`,
            inputSchema: { type: 'object' },
            handler: async () => ({ content: [] })
          })
        });
      });

      const allTools = registry.getAllToolMetadata();
      expect(allTools).toHaveLength(3);
      expect(allTools.map(t => t.name)).toEqual(tools);
    });

    it('should throw error for duplicate tool registration', () => {
      const toolDef = {
        name: 'duplicate_tool',
        description: 'Test',
        inputSchema: { type: 'object' },
        loader: async () => async () => ({ content: [] })
      };

      registry.registerLazyTool(toolDef);
      
      expect(() => registry.registerLazyTool(toolDef)).toThrow(
        'Tool duplicate_tool is already registered'
      );
    });
  });

  describe('Tool Loading', () => {
    it('should load implementation on first use', async () => {
      let loadCount = 0;
      
      registry.registerLazyTool({
        name: 'lazy_tool',
        description: 'Lazy loading test',
        inputSchema: { type: 'object' },
        loader: async () => {
          loadCount++;
          return {
            name: 'lazy_tool',
            description: 'Lazy loading test',
            inputSchema: { type: 'object' },
            handler: async (args) => ({
              content: [{ type: 'text', text: 'loaded' }]
            })
          };
        }
      });

      const impl1 = await registry.getImplementation('lazy_tool');
      expect(loadCount).toBe(1);
      expect(impl1).toBeDefined();

      const impl2 = await registry.getImplementation('lazy_tool');
      expect(loadCount).toBe(1); // Should not reload
      expect(impl1).toBe(impl2); // Same instance
    });

    it('should handle loader errors gracefully', async () => {
      registry.registerLazyTool({
        name: 'error_tool',
        description: 'Error test',
        inputSchema: { type: 'object' },
        loader: async () => {
          throw new Error('Loader failed');
        }
      });

      await expect(registry.getImplementation('error_tool')).rejects.toThrow(
        'Loader failed'
      );
    });

    it('should throw error for non-existent tool', async () => {
      await expect(registry.getImplementation('non_existent')).rejects.toThrow(
        'Tool non_existent not found'
      );
    });
  });

  describe('Tool Execution', () => {
    it('should execute loaded tool correctly', async () => {
      registry.registerLazyTool({
        name: 'exec_tool',
        description: 'Execution test',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        loader: async () => ({
          name: 'exec_tool',
          description: 'Execution test',
          inputSchema: { type: 'object' },
          handler: async (args) => ({
            content: [{
              type: 'text',
              text: `Echo: ${args.message}`
            }]
          })
        })
      });

      const impl = await registry.getImplementation('exec_tool');
      const result = await impl({ message: 'Hello' });
      
      expect(result.content[0].text).toBe('Echo: Hello');
    });

    it('should handle async tool implementations', async () => {
      registry.registerLazyTool({
        name: 'async_tool',
        description: 'Async test',
        inputSchema: { type: 'object' },
        loader: async () => ({
          name: 'async_tool',
          description: 'Async test',
          inputSchema: { type: 'object' },
          handler: async (args) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return {
              content: [{ type: 'text', text: 'async complete' }]
            };
          }
        })
      });

      const impl = await registry.getImplementation('async_tool');
      const result = await impl({});
      
      expect(result.content[0].text).toBe('async complete');
    });
  });

  describe('Metadata Access', () => {
    it('should retrieve tool metadata without loading', () => {
      let loaded = false;
      
      registry.registerLazyTool({
        name: 'metadata_tool',
        description: 'Metadata test tool',
        inputSchema: {
          type: 'object',
          properties: {
            required: { type: 'string' }
          },
          required: ['required']
        },
        loader: async () => {
          loaded = true;
          return {
            name: 'metadata_tool',
            description: 'Metadata test tool',
            inputSchema: { type: 'object' },
            handler: async () => ({ content: [] })
          };
        }
      });

      const metadata = registry.getToolMetadata('metadata_tool');
      
      expect(metadata).toBeDefined();
      expect(metadata!.name).toBe('metadata_tool');
      expect(metadata!.description).toBe('Metadata test tool');
      expect(metadata!.inputSchema).toEqual({
        type: 'object',
        properties: {
          required: { type: 'string' }
        },
        required: ['required']
      });
      expect(loaded).toBe(false);
    });

    it('should return null for non-existent tool metadata', () => {
      expect(registry.getToolMetadata('non_existent')).toBeNull();
    });

    it('should list all registered tools', () => {
      const toolNames = ['tool_a', 'tool_b', 'tool_c'];
      
      toolNames.forEach(name => {
        registry.registerLazyTool({
          name,
          description: `${name} desc`,
          inputSchema: { type: 'object' },
          loader: async () => ({
            name,
            description: `${name} description`,
            inputSchema: { type: 'object' },
            handler: async () => ({ content: [] })
          })
        });
      });

      const allMetadata = registry.getAllToolMetadata();
      expect(allMetadata).toHaveLength(3);
      expect(allMetadata.map(m => m.name).sort()).toEqual(toolNames.sort());
    });
  });

  describe('Performance', () => {
    it('should handle concurrent loading requests', async () => {
      let loadCount = 0;
      
      registry.registerLazyTool({
        name: 'concurrent_tool',
        description: 'Concurrent test',
        inputSchema: { type: 'object' },
        loader: async () => {
          loadCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return {
            name: 'concurrent_tool',
            description: 'Concurrent test',
            inputSchema: { type: 'object' },
            handler: async () => ({ content: [] })
          };
        }
      });

      // Start multiple concurrent loads
      const promises = Array(5).fill(null).map(() => 
        registry.getImplementation('concurrent_tool')
      );

      const implementations = await Promise.all(promises);
      
      // Should only load once despite concurrent requests
      expect(loadCount).toBe(1);
      
      // All should receive the same instance
      const firstImpl = implementations[0];
      implementations.forEach(impl => {
        expect(impl).toBe(firstImpl);
      });
    });

    it('should maintain separate instances for different tools', async () => {
      const tools = ['tool1', 'tool2'];
      
      tools.forEach(name => {
        registry.registerLazyTool({
          name,
          description: name,
          inputSchema: { type: 'object' },
          loader: async () => ({
            name,
            description: name,
            inputSchema: { type: 'object' },
            handler: async () => ({ 
              content: [{ type: 'text', text: name }] 
            })
          })
        });
      });

      const impl1 = await registry.getImplementation('tool1');
      const impl2 = await registry.getImplementation('tool2');
      
      expect(impl1).not.toBe(impl2);
      
      const result1 = await impl1({});
      const result2 = await impl2({});
      
      expect(result1.content[0].text).toBe('tool1');
      expect(result2.content[0].text).toBe('tool2');
    });
  });
});