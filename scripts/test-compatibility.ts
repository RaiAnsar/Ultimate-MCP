#!/usr/bin/env node

/**
 * Compatibility testing script for Ultimate MCP
 */

import { CompatibilityTester } from '../src/compatibility/compatibility-tester';
import { SUPPORTED_PLATFORMS } from '../src/compatibility/platform-detector';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('🚀 Ultimate MCP Compatibility Testing');
  console.log('=====================================\n');
  
  const tester = new CompatibilityTester();
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const testAll = args.includes('--all') || args.length === 0;
  const generateReport = args.includes('--report');
  const platform = args.find(arg => !arg.startsWith('--'));
  
  try {
    if (testAll) {
      console.log('Testing compatibility with all supported platforms...\n');
      const results = await tester.testAllPlatforms();
      
      console.log('\n📊 Test Results Summary:');
      console.log('========================\n');
      
      for (const result of results) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.platformName} (${result.platform})`);
        
        if (!result.success) {
          console.log(`   Errors: ${result.errors.join(', ')}`);
        }
        
        if (result.warnings.length > 0) {
          console.log(`   Warnings: ${result.warnings.join(', ')}`);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      const successRate = (successCount / totalCount * 100).toFixed(1);
      
      console.log(`\n✨ Overall Success Rate: ${successRate}% (${successCount}/${totalCount})`);
      
    } else if (platform && Object.values(SUPPORTED_PLATFORMS).includes(platform as any)) {
      console.log(`Testing compatibility with ${platform}...\n`);
      const result = await tester.testPlatform(platform as any);
      
      console.log('\n📊 Test Result:');
      console.log('===============\n');
      
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`Platform: ${result.platformName}`);
      console.log(`Status: ${status}`);
      console.log(`Transport: ${result.transport}`);
      console.log('\nTests:');
      console.log(`  - Initialization: ${result.tests.initialization ? '✅' : '❌'}`);
      console.log(`  - Basic Request: ${result.tests.basicRequest ? '✅' : '❌'}`);
      console.log(`  - Tool Execution: ${result.tests.toolExecution ? '✅' : '❌'}`);
      console.log(`  - Streaming: ${result.tests.streaming ? '✅' : '❌'}`);
      console.log(`  - Error Handling: ${result.tests.errorHandling ? '✅' : '❌'}`);
      
      if (result.tests.authentication !== undefined) {
        console.log(`  - Authentication: ${result.tests.authentication ? '✅' : '❌'}`);
      }
      
      if (result.tests.fileAccess !== undefined) {
        console.log(`  - File Access: ${result.tests.fileAccess ? '✅' : '❌'}`);
      }
      
      console.log('\nPerformance:');
      console.log(`  - Init Time: ${result.performance.initTime}ms`);
      console.log(`  - Request Time: ${result.performance.requestTime}ms`);
      console.log(`  - Memory Usage: ${result.performance.memoryUsage.toFixed(2)}MB`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
      
      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    } else {
      console.log('Usage: npm run test:compatibility [platform] [options]');
      console.log('\nOptions:');
      console.log('  --all      Test all supported platforms (default)');
      console.log('  --report   Generate detailed compatibility report');
      console.log('\nSupported platforms:');
      
      const platforms = Object.entries(SUPPORTED_PLATFORMS);
      for (const [key, value] of platforms) {
        console.log(`  ${value}`);
      }
      
      process.exit(1);
    }
    
    if (generateReport) {
      console.log('\n📝 Generating compatibility report...');
      const reportPath = path.join(process.cwd(), 'compatibility-report.md');
      await tester.saveReport(reportPath);
      console.log(`✅ Report saved to: ${reportPath}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during compatibility testing:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);