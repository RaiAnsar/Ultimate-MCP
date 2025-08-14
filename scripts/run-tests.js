#!/usr/bin/env node

/**
 * Test Runner for Ultimate MCP v2.0
 * 
 * Runs all tests and generates coverage report
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const projectRoot = process.cwd();
const coverageDir = join(projectRoot, 'coverage');

// Ensure coverage directory exists
if (!existsSync(coverageDir)) {
  mkdirSync(coverageDir, { recursive: true });
}

console.error(chalk.blue.bold('🧪 Ultimate MCP v2.0 - Test Suite\n'));

// Test categories
const testSuites = [
  {
    name: 'Core Tests',
    pattern: 'test/basic.test.ts'
  },
  {
    name: 'Lazy Loading',
    pattern: 'test/lazy-loading.test.ts'
  },
  {
    name: 'Performance Monitor',
    pattern: 'test/performance-monitor.test.ts'
  },
  {
    name: 'Cost Optimizer',
    pattern: 'test/cost-optimizer.test.ts'
  },
  {
    name: 'Model Router',
    pattern: 'test/model-router.test.ts'
  },
  {
    name: 'Browser Automation',
    pattern: 'test/browser-automation.test.ts'
  },
  {
    name: 'Transports',
    pattern: 'test/transports.test.ts'
  }
];

async function runTestSuite(suite) {
  console.error(chalk.yellow(`\n📋 Running ${suite.name}...`));
  
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npx', ['vitest', 'run', suite.pattern], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.error(chalk.green(`✅ ${suite.name} passed`));
        resolve({ suite: suite.name, passed: true, output });
      } else {
        console.error(chalk.red(`❌ ${suite.name} failed`));
        resolve({ suite: suite.name, passed: false, output, errorOutput });
      }
    });
  });
}

async function runAllTests() {
  console.error(chalk.cyan('Running all test suites...\n'));
  
  const args = process.argv.slice(2);
  const runCoverage = args.includes('--coverage');
  const runWatch = args.includes('--watch');
  
  if (runWatch) {
    // Run in watch mode
    const watchProcess = spawn('npx', ['vitest'], {
      stdio: 'inherit',
      shell: true
    });
    
    watchProcess.on('close', (code) => {
      process.exit(code);
    });
    
    return;
  }
  
  if (runCoverage) {
    // Run with coverage
    console.error(chalk.magenta('📊 Running tests with coverage...\n'));
    
    const coverageProcess = spawn('npx', ['vitest', 'run', '--coverage'], {
      stdio: 'inherit',
      shell: true
    });
    
    coverageProcess.on('close', (code) => {
      if (code === 0) {
        console.error(chalk.green.bold('\n✨ All tests passed with coverage!'));
        console.error(chalk.cyan(`Coverage report available at: ${join(coverageDir, 'index.html')}`));
      } else {
        console.error(chalk.red.bold('\n💔 Some tests failed'));
      }
      process.exit(code);
    });
    
    return;
  }
  
  // Run individual test suites
  const results = [];
  
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }
  
  // Summary
  console.error(chalk.blue.bold('\n📊 Test Summary'));
  console.error('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? chalk.green : chalk.red;
    console.error(`${icon} ${color(result.suite.padEnd(25))} ${result.passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.error('='.repeat(50));
  console.error(`Total: ${results.length} suites`);
  console.error(chalk.green(`Passed: ${passed}`));
  if (failed > 0) {
    console.error(chalk.red(`Failed: ${failed}`));
  }
  
  // Run type checking
  console.error(chalk.yellow('\n🔍 Running type check...'));
  
  const typeCheckProcess = spawn('npx', ['tsc', '--noEmit'], {
    stdio: 'pipe',
    shell: true
  });
  
  typeCheckProcess.on('close', (code) => {
    if (code === 0) {
      console.error(chalk.green('✅ Type check passed'));
    } else {
      console.error(chalk.red('❌ Type check failed'));
    }
    
    // Final status
    if (failed === 0 && code === 0) {
      console.error(chalk.green.bold('\n🎉 All tests and checks passed!'));
      process.exit(0);
    } else {
      console.error(chalk.red.bold('\n💔 Some tests or checks failed'));
      process.exit(1);
    }
  });
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.error(chalk.red('Test runner error:'), error);
  process.exit(1);
});