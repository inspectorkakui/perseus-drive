/**
 * Logging System Test
 * 
 * Tests the new centralized logging system for improved formatting
 * and component separation. This addresses BUG-003.
 */

const { logger, createComponentLogger, createAgentLogger } = require('../tools/logger');
const agentMessenger = require('../tools/agent-messenger');
const knowledgeBase = require('../tools/knowledge-base');
const BaseAgent = require('../core/base-agent');

// Create a test agent
class TestAgent extends BaseAgent {
  constructor(id) {
    super(id, 'test');
  }
  
  async process(data) {
    this.logger.info('Processing data in test agent', { data });
    return { processed: true, result: 'Test result' };
  }
}

// Create component-specific loggers
const testLogger = createComponentLogger('TEST');
const systemLogger = createComponentLogger('SYSTEM');

// Create an agent-specific logger
const agentLogger = createAgentLogger('test-agent-1', 'test');

// Main test function
async function testLogging() {
  testLogger.info('Starting logging system test');
  
  // Test different log levels
  testLogger.debug('This is a debug message');
  testLogger.info('This is an info message');
  testLogger.warn('This is a warning message');
  testLogger.error('This is an error message', { code: 500 });
  
  // Test system logger
  systemLogger.info('System is initializing');
  systemLogger.info('Loading components...');
  
  // Test agent logger
  agentLogger.info('Agent is starting');
  agentLogger.debug('Agent configuration loaded');
  
  // Test multiple components logging together
  testLogger.info('Test component is ready');
  systemLogger.info('System component is ready');
  agentLogger.info('Agent component is ready');
  
  // Test with JSON object metadata
  testLogger.info('Processing complex data', { 
    object: { key: 'value' }, 
    array: [1, 2, 3], 
    number: 123 
  });
  
  // Test error logging with stack trace
  try {
    throw new Error('Test error with stack trace');
  } catch (error) {
    testLogger.error('Caught an exception', { error });
  }
  
  // Test BaseAgent logger
  const testAgent = new TestAgent('test-agent-2');
  await testAgent.initialize();
  
  testAgent.logger.info('Base agent initialized');
  testAgent.logger.debug('Base agent configuration loaded');
  
  // Test actual agent methods that use logging
  await testAgent.process({ test: 'data' });
  
  // Test Agent Messenger logging
  agentMessenger.registerAgent('test-agent-3', 'test');
  agentMessenger.sendMessage('test-agent-2', 'test-agent-3', { test: 'message' }, 'test');
  agentMessenger.getMessages('test-agent-3');
  
  // Test Knowledge Base logging
  await knowledgeBase.storeKnowledge('test', 'logging', { test: 'data' });
  await knowledgeBase.getKnowledge('test', 'logging');
  
  // Log test completion
  testLogger.info('Logging system test completed');
  
  // Unregister agents
  agentMessenger.unregisterAgent('test-agent-2');
  agentMessenger.unregisterAgent('test-agent-3');
}

// Run the test
testLogging().catch(error => {
  console.error('Error in logging test:', error);
  process.exit(1);
}); 