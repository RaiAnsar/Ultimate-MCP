# Ultimate MCP v2.0 - Testing Documentation

## Overview

Ultimate MCP v2.0 includes a comprehensive test suite covering all major functionality:
- Core systems (lazy loading, performance, cost optimization)
- Browser automation (Playwright/Puppeteer)
- Transport protocols (STDIO, SSE, HTTP, WebSocket)
- Model routing and AI orchestration
- Tool execution and error handling

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (re-run on changes)
npm run test:watch

# Run specific test file
npm test lazy-loading

# Run with UI
npm run test:ui
```

### Advanced Testing

```bash
# Run all test suites with summary
npm run test:all

# Run all tests with coverage report
npm run test:all:coverage

# Run specific test suite
npx vitest run test/performance-monitor.test.ts

# Debug mode
npx vitest --inspect-brk
```

## Test Structure

```
test/
├── basic.test.ts              # Core functionality tests
├── lazy-loading.test.ts       # Lazy tool loading tests
├── performance-monitor.test.ts # Performance tracking tests
├── cost-optimizer.test.ts     # Cost optimization tests
├── model-router.test.ts       # Model routing tests
├── browser-automation.test.ts # Browser automation tests
└── transports.test.ts         # Transport protocol tests
```

## Test Categories

### 1. Core Tests (`basic.test.ts`)
Tests fundamental MCP server functionality:
- Server initialization
- Tool registration
- Basic tool execution
- Integration between components

### 2. Lazy Loading Tests (`lazy-loading.test.ts`)
Ensures tools load only when needed:
- Tool registration without loading
- On-demand implementation loading
- Concurrent loading handling
- Error recovery

### 3. Performance Tests (`performance-monitor.test.ts`)
Validates performance tracking:
- Tool execution metrics
- Model usage statistics
- System resource monitoring
- Performance summaries

### 4. Cost Optimization Tests (`cost-optimizer.test.ts`)
Tests intelligent model selection:
- Budget constraint handling
- Cost tracking by model
- Optimization recommendations
- Quality vs cost tradeoffs

### 5. Model Router Tests (`model-router.test.ts`)
Validates task-based model routing:
- Task complexity assessment
- Model selection logic
- Constraint handling
- Fallback mechanisms

### 6. Browser Automation Tests (`browser-automation.test.ts`)
Tests Playwright/Puppeteer integration:
- Browser initialization
- Screenshot capture
- Web scraping
- Automation scripts

### 7. Transport Tests (`transports.test.ts`)
Validates all transport protocols:
- SSE connections
- HTTP API endpoints
- WebSocket messaging
- Error handling

## Writing Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('FeatureName', () => {
  let instance: FeatureClass;

  beforeEach(() => {
    // Setup before each test
    instance = new FeatureClass();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Functionality Group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = instance.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Best Practices

1. **Use Descriptive Names**
   ```typescript
   // Good
   it('should return cached implementation on second call', () => {})
   
   // Bad
   it('should work', () => {})
   ```

2. **Test One Thing**
   ```typescript
   // Good - single responsibility
   it('should track successful tool execution', () => {
     monitor.startToolExecution('tool');
     monitor.endToolExecution('tool', true);
     expect(monitor.getToolMetrics('tool').errors).toBe(0);
   });
   ```

3. **Use Mocks Appropriately**
   ```typescript
   // Mock external dependencies
   vi.mock('playwright', () => ({
     chromium: { launch: vi.fn() }
   }));
   ```

4. **Test Edge Cases**
   ```typescript
   it('should handle very large token counts', () => {
     const result = optimizer.selectModel({ tokens: 1000000 });
     expect(result.estimatedCost).toBeGreaterThan(1);
   });
   ```

## Coverage Goals

We maintain high test coverage standards:
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Exclusions
- `node_modules/**`
- `dist/**`
- `test/**`
- `**/*.d.ts`
- `**/*.config.*`
- `scripts/**`

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Debugging Tests

### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["vitest", "--inspect-brk", "--no-coverage"],
  "console": "integratedTerminal"
}
```

### Common Issues

1. **Timeout Errors**
   ```typescript
   // Increase timeout for slow operations
   it('should handle large operations', async () => {
     // test code
   }, 60000); // 60 second timeout
   ```

2. **Async Issues**
   ```typescript
   // Always await async operations
   it('should handle async', async () => {
     await expect(asyncOperation()).resolves.toBe(true);
   });
   ```

3. **Mock Cleanup**
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
     vi.resetAllMocks();
   });
   ```

## Performance Testing

### Load Testing
```typescript
it('should handle concurrent requests', async () => {
  const promises = Array(100).fill(null).map(() => 
    instance.processRequest()
  );
  
  const results = await Promise.all(promises);
  expect(results.every(r => r.success)).toBe(true);
});
```

### Memory Testing
```typescript
it('should not leak memory', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform operations
  for (let i = 0; i < 1000; i++) {
    instance.process();
  }
  
  global.gc(); // Requires --expose-gc flag
  const finalMemory = process.memoryUsage().heapUsed;
  
  expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // 10MB
});
```

## Integration Testing

### Testing with Real Services
```typescript
describe.skipIf(!process.env.OPENAI_API_KEY)('OpenAI Integration', () => {
  it('should call real API', async () => {
    const result = await callOpenAI('test prompt');
    expect(result).toBeDefined();
  });
});
```

## Test Utilities

### Custom Matchers
```typescript
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`
    };
  }
});
```

### Test Helpers
```typescript
// test/helpers/utils.ts
export function createMockTool(name: string) {
  return {
    name,
    description: `${name} description`,
    inputSchema: { type: 'object' },
    execute: vi.fn()
  };
}
```

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep test dependencies current
2. **Review Coverage**: Ensure new code is tested
3. **Refactor Tests**: Keep tests clean and maintainable
4. **Update Mocks**: Keep mocks in sync with real implementations

### Adding New Tests
1. Create test file in `test/` directory
2. Follow naming convention: `feature-name.test.ts`
3. Add to test suite in `run-tests.js`
4. Update this documentation

---

Remember: Good tests are the foundation of reliable software. Write tests first, code second!