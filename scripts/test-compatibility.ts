#!/usr/bin/env node

/**
 * Compatibility testing script for Ultimate MCP
 */

import { CompatibilityTester } from '../src/compatibility/compatibility-tester';
import { SUPPORTED_PLATFORMS } from '../src/compatibility/platform-detector';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.error('🚀 Ultimate MCP Compatibility Testing');
  console.error('=====================================\n');
  
  const tester = new CompatibilityTester();
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const testAll = args.includes('--all') || args.length === 0;
  const generateReport = args.includes('--report');
  const platform = args.find(arg => !arg.startsWith('--'));
  
  try {
    if (testAll) {
      console.error('Testing compatibility with all supported platforms...\n');
      const results = await tester.testAllPlatforms();
      
      console.error('\n📊 Test Results Summary:');
      console.error('========================\n');
      
      for (const result of results) {
        const status = result.success ? '✅' : '❌';
        console.error(`${status} ${result.platformName} (${result.platform})`);
        
        if (!result.success) {
          console.error(`   Errors: ${result.errors.join(', ')}`);
        }
        
        if (result.warnings.length > 0) {
          console.error(`   Warnings: ${result.warnings.join(', ')}`);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      const successRate = (successCount / totalCount * 100).toFixed(1);
      
      console.error(`\n✨ Overall Success Rate: ${successRate}% (${successCount}/${totalCount})`);
      
    } else if (platform && Object.values(SUPPORTED_PLATFORMS).includes(platform as any)) {
      console.error(`Testing compatibility with ${platform}...\n`);
      const result = await tester.testPlatform(platform as any);
      
      console.error('\n📊 Test Result:');
      console.error('===============\n');
      
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.error(`Platform: ${result.platformName}`);
      console.error(`Status: ${status}`);
      console.error(`Transport: ${result.transport}`);
      console.error('\nTests:');
      console.error(`  - Initialization: ${result.tests.initialization ? '✅' : '❌'}`);
      console.error(`  - Basic Request: ${result.tests.basicRequest ? '✅' : '❌'}`);
      console.error(`  - Tool Execution: ${result.tests.toolExecution ? '✅' : '❌'}`);
      console.error(`  - Streaming: ${result.tests.streaming ? '✅' : '❌'}`);
      console.error(`  - Error Handling: ${result.tests.errorHandling ? '✅' : '❌'}`);
      
      if (result.tests.authentication !== undefined) {
        console.error(`  - Authentication: ${result.tests.authentication ? '✅' : '❌'}`);
      }
      
      if (result.tests.fileAccess !== undefined) {
        console.error(`  - File Access: ${result.tests.fileAccess ? '✅' : '❌'}`);
      }
      
      console.error('\nPerformance:');
      console.error(`  - Init Time: ${result.performance.initTime}ms`);
      console.error(`  - Request Time: ${result.performance.requestTime}ms`);
      console.error(`  - Memory Usage: ${result.performance.memoryUsage.toFixed(2)}MB`);
      
      if (result.errors.length > 0) {
        console.error('\nErrors:');
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      }
      
      if (result.warnings.length > 0) {
        console.error('\nWarnings:');
        for (const warning of result.warnings) {
          console.error(`  - ${warning}`);
        }
      }
    } else {
      console.error('Usage: npm run test:compatibility [platform] [options]');
      console.error('\nOptions:');
      console.error('  --all      Test all supported platforms (default)');
      console.error('  --report   Generate detailed compatibility report');
      console.error('\nSupported platforms:');
      
      const platforms = Object.entries(SUPPORTED_PLATFORMS);
      for (const [key, value] of platforms) {
        console.error(`  ${value}`);
      }
      
      process.exit(1);
    }
    
    if (generateReport) {
      console.error('\n📝 Generating compatibility report...');
      const reportPath = path.join(process.cwd(), 'compatibility-report.md');
      await tester.saveReport(reportPath);
      console.error(`✅ Report saved to: ${reportPath}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during compatibility testing:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);