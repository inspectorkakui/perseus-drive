/**
 * Integration Test Runner for Perseus Drive
 * 
 * This script runs the main integration tests to verify the system is working correctly.
 * It's a simplified version that doesn't require testing frameworks.
 */

// Imports
const path = require('path');
const { execSync } = require('child_process');
const winston = require('winston');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] [TEST-RUNNER] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Integration tests to run
const INTEGRATION_TESTS = [
  'strategy-execution-integration.test.js'
];

// Run a single test file
function runTestFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  logger.info(`Running integration test: ${fileName}`);
  
  try {
    const output = execSync(`node ${filePath}`, { encoding: 'utf8' });
    logger.info(`Test passed: ${fileName}`);
    return { file: fileName, passed: true, output };
  } catch (error) {
    logger.error(`Test failed: ${fileName}`);
    logger.error(error.stdout || error.message);
    return { file: fileName, passed: false, error: error.stdout || error.message };
  }
}

// Run all integration tests
function runIntegrationTests() {
  logger.info('Starting integration test execution');
  
  const results = {
    total: INTEGRATION_TESTS.length,
    passed: 0,
    failed: 0,
    details: []
  };
  
  for (const test of INTEGRATION_TESTS) {
    const result = runTestFile(test);
    results.details.push(result);
    
    if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  return results;
}

// Report results
function reportResults(results) {
  logger.info('');
  logger.info('======= INTEGRATION TEST RESULTS =======');
  logger.info(`Total Tests: ${results.total}`);
  logger.info(`Passed: ${results.passed}`);
  logger.info(`Failed: ${results.failed}`);
  logger.info('');
  
  if (results.failed > 0) {
    logger.info('Failed Tests:');
    results.details
      .filter(detail => !detail.passed)
      .forEach(detail => {
        logger.info(`- ${detail.file}`);
      });
  }
  
  logger.info('=======================================');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Main execution
try {
  logger.info('Perseus Drive Integration Test Suite');
  const results = runIntegrationTests();
  reportResults(results);
} catch (error) {
  logger.error('Unexpected error running integration tests');
  logger.error(error);
  process.exit(1);
} 