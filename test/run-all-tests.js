/**
 * Test Runner for Perseus Drive
 * 
 * This script runs all available tests in the project and reports results.
 */

// Core Node modules
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Setup logger
const winston = require('winston');
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

// Configuration
const TEST_DIR = path.join(__dirname);
const TEST_EXCLUSIONS = ['run-all-tests.js', 'node_modules'];

// Get all test files
function getTestFiles() {
  logger.info('Scanning for test files...');
  
  const files = fs.readdirSync(TEST_DIR)
    .filter(file => {
      // Only include .js files that aren't in exclusions and end with .test.js
      return file.endsWith('.test.js') && 
             !TEST_EXCLUSIONS.includes(file);
    })
    .map(file => path.join(TEST_DIR, file));
  
  logger.info(`Found ${files.length} test files`);
  return files;
}

// Run a single test file
function runTestFile(file) {
  const relativePath = path.relative(process.cwd(), file);
  logger.info(`Running test: ${relativePath}`);
  
  try {
    const output = execSync(`node ${file}`, { encoding: 'utf8' });
    logger.info(`Test passed: ${relativePath}`);
    return { file: relativePath, passed: true, output };
  } catch (error) {
    logger.error(`Test failed: ${relativePath}`);
    logger.error(error.stdout || error.message);
    return { file: relativePath, passed: false, error: error.stdout || error.message };
  }
}

// Run all tests and collect results
function runAllTests() {
  const testFiles = getTestFiles();
  const results = {
    total: testFiles.length,
    passed: 0,
    failed: 0,
    details: []
  };
  
  logger.info('Starting test execution');
  
  for (const file of testFiles) {
    const result = runTestFile(file);
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
  logger.info('======= TEST RESULTS =======');
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
  
  logger.info('============================');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Main execution
try {
  const results = runAllTests();
  reportResults(results);
} catch (error) {
  logger.error('Unexpected error running tests');
  logger.error(error);
  process.exit(1);
} 